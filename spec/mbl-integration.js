// ════════════════════════════════════════════════════════════════════════
// MAGIC BUYER LETTER — COMPLETE P0 + P1 INTEGRATION
// Stack: Next.js API Routes · Supabase · RealEstateAPI · Claude · Lob
// ════════════════════════════════════════════════════════════════════════
//
// P0: Agent profile, address verification, Lob template, send letters,
//     webhook tracking, store Lob IDs
// P1: Lob from-address on onboarding, idempotency, error handling,
//     post-send dashboard data, retry logic
//
// ENV VARS (.env.local):
//   REAPI_KEY, REAPI_USER_ID, ANTHROPIC_API_KEY,
//   LOB_API_KEY, LOB_WEBHOOK_SECRET,
//   SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
// ════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LOB_BASE = "https://api.lob.com/v1";
const LOB_AUTH = "Basic " + Buffer.from(process.env.LOB_API_KEY + ":").toString("base64");
const REAPI_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": process.env.REAPI_KEY,
  "x-user-id": process.env.REAPI_USER_ID,
};

// ════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMA (Supabase SQL — run once)
// ════════════════════════════════════════════════════════════════════════

export const SCHEMA_SQL = `
-- Agent profile (one per ListingLeads user)
CREATE TABLE IF NOT EXISTS mbl_agents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  brokerage       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  address_line1   TEXT NOT NULL,
  address_line2   TEXT,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL CHECK (length(state) = 2),
  zip             TEXT NOT NULL,
  license_number  TEXT,
  headshot_url    TEXT,
  logo_url        TEXT,
  website         TEXT,
  -- Lob resources created during onboarding
  lob_address_id  TEXT,           -- adr_XXXXX (from address stored in Lob)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS mbl_campaigns (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID NOT NULL REFERENCES mbl_agents(id),
  buyer_name      TEXT NOT NULL,
  criteria        JSONB NOT NULL,       -- { priceMin, priceMax, beds, baths, area, zip, tags }
  template_id     TEXT NOT NULL,         -- Lob template ID (tmpl_XXXXX)
  merge_variables JSONB NOT NULL,       -- { bullet_1, bullet_2, bullet_3, ... }
  status          TEXT NOT NULL DEFAULT 'searching',
    -- searching → verifying → ready → sending → sent → delivered
  properties_found  INT DEFAULT 0,
  addresses_verified INT DEFAULT 0,
  addresses_failed   INT DEFAULT 0,
  letters_sent    INT DEFAULT 0,
  letters_delivered INT DEFAULT 0,
  letters_returned  INT DEFAULT 0,
  total_cost      DECIMAL(10,2) DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Properties (one per homeowner per campaign)
CREATE TABLE IF NOT EXISTS mbl_properties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     UUID NOT NULL REFERENCES mbl_campaigns(id) ON DELETE CASCADE,
  -- Property data (from RealEstateAPI PropertySearch)
  reapi_id        TEXT,
  property_address TEXT NOT NULL,
  property_city   TEXT NOT NULL,
  property_state  TEXT NOT NULL,
  property_zip    TEXT NOT NULL,
  beds            INT,
  baths           DECIMAL(3,1),
  sqft            INT,
  year_built      INT,
  estimated_value INT,
  equity_percent  INT,
  last_sale_date  DATE,
  absentee_owner  BOOLEAN DEFAULT false,
  corporate_owned BOOLEAN DEFAULT false,
  -- Owner data (from RealEstateAPI BulkSkipTrace)
  owner_first_name TEXT,
  owner_last_name  TEXT,
  owner_full_name  TEXT,
  owner_phone     TEXT,
  owner_email     TEXT,
  dnc_status      TEXT DEFAULT 'unknown',  -- unknown, clear, flagged
  -- Mailing address (WHERE TO SEND THE LETTER — may differ from property)
  mail_address_line1 TEXT,
  mail_address_line2 TEXT,
  mail_city       TEXT,
  mail_state      TEXT,
  mail_zip        TEXT,
  -- Address verification (from Lob)
  address_verified   BOOLEAN DEFAULT false,
  address_deliverable TEXT,               -- deliverable, undeliverable, etc.
  verified_address   JSONB,              -- Lob-corrected address
  -- Letter + delivery (from Lob)
  lob_letter_id   TEXT,                   -- ltr_XXXXX
  lob_url         TEXT,                   -- PDF preview URL
  lob_tracking    TEXT,                   -- USPS tracking number
  expected_delivery DATE,
  delivery_status TEXT DEFAULT 'pending',
    -- pending → verified → sent → created → printed → in_transit → delivered → returned
  delivery_updated_at TIMESTAMPTZ,
  -- Selection
  selected        BOOLEAN DEFAULT true,
  match_score     INT DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending_skiptrace',
    -- pending_skiptrace → pending_verify → verified → ready → sent → send_failed
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_campaign ON mbl_properties(campaign_id);
CREATE INDEX IF NOT EXISTS idx_properties_lob_id ON mbl_properties(lob_letter_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_agent ON mbl_campaigns(agent_id);
`;


// ════════════════════════════════════════════════════════════════════════
// P0: AGENT PROFILE + LOB FROM-ADDRESS
// POST /api/mbl/agent/setup
// ════════════════════════════════════════════════════════════════════════

export async function setupAgentProfile(userId, profile) {
  // profile = { name, brokerage, phone, email?, address_line1, address_line2?,
  //             city, state, zip, license_number?, headshot_url?, logo_url?, website? }

  // 1. Validate required fields
  const required = ["name", "brokerage", "phone", "address_line1", "city", "state", "zip"];
  const missing = required.filter((f) => !profile[f]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  // 2. Verify the agent's return address with Lob
  const verifyRes = await lobFetch("/us_verifications", "POST", {
    primary_line: profile.address_line1,
    secondary_line: profile.address_line2 || "",
    city: profile.city,
    state: profile.state,
    zip_code: profile.zip,
  });

  if (verifyRes.deliverability === "undeliverable") {
    throw new Error(
      "Your return address could not be verified. Please check and try again. " +
      `Lob says: ${verifyRes.deliverability_analysis?.dpv_footnotes || "undeliverable"}`
    );
  }

  // Use Lob-corrected address
  const corrected = verifyRes.components;

  // 3. Create a persistent address in Lob (reused on every letter)
  const lobAddr = await lobFetch("/addresses", "POST", {
    name: profile.name,
    company: profile.brokerage,
    address_line1: verifyRes.primary_line,
    address_line2: verifyRes.secondary_line || undefined,
    address_city: corrected.city,
    address_state: corrected.state,
    address_zip: corrected.zip_code + (corrected.zip_code_plus_4 ? "-" + corrected.zip_code_plus_4 : ""),
    address_country: "US",
  });

  // 4. Upsert agent profile in Supabase
  const { data, error } = await supabase
    .from("mbl_agents")
    .upsert({
      user_id: userId,
      name: profile.name,
      brokerage: profile.brokerage,
      phone: profile.phone,
      email: profile.email || null,
      address_line1: verifyRes.primary_line,
      address_line2: verifyRes.secondary_line || null,
      city: corrected.city,
      state: corrected.state,
      zip: corrected.zip_code,
      license_number: profile.license_number || null,
      headshot_url: profile.headshot_url || null,
      logo_url: profile.logo_url || null,
      website: profile.website || null,
      lob_address_id: lobAddr.id, // "adr_XXXXX"
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// GET /api/mbl/agent
export async function getAgentProfile(userId) {
  const { data, error } = await supabase
    .from("mbl_agents")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data; // null if no profile yet
}


// ════════════════════════════════════════════════════════════════════════
// P0: CREATE CAMPAIGN + PROPERTY SEARCH + SKIP TRACE + ADDRESS VERIFY
// POST /api/mbl/campaigns
// This is the big pipeline that runs during the loading animation
// ════════════════════════════════════════════════════════════════════════

export async function createCampaign(agentId, input, templateId) {
  // input = { buyerName, priceMin, priceMax, beds, baths, area, zip,
  //           tags, bullets, concessions }

  // 1. Get agent profile (need lob_address_id and merge var data)
  const { data: agent } = await supabase
    .from("mbl_agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (!agent) throw new Error("Agent profile not found. Complete setup first.");
  if (!agent.lob_address_id) throw new Error("Agent Lob address not configured.");

  // 2. Build merge variables from input + agent
  const mergeVars = {
    buyer_name: input.buyerName,
    neighborhood: input.area || "your area",
    bullet_1: input.bullets?.[0] || `Pre-approved up to $${(input.priceMax || 600000).toLocaleString()}`,
    bullet_2: input.bullets?.[1] || "Flexible on closing — whatever works best for you",
    bullet_3: input.bullets?.[2] || "Comfortable with homes needing minor updates",
    agent_name: agent.name,
    agent_phone: agent.phone,
    agent_brokerage: agent.brokerage,
    agent_initials: agent.name.split(" ").map((n) => n[0]).join(""),
    agent_website: agent.website || "",
    agent_headshot_url: agent.headshot_url || "",
    agent_logo_url: agent.logo_url || "",
  };

  // 3. Create campaign row
  const { data: campaign, error: campErr } = await supabase
    .from("mbl_campaigns")
    .insert({
      agent_id: agentId,
      buyer_name: input.buyerName,
      criteria: input,
      template_id: templateId,
      merge_variables: mergeVars,
      status: "searching",
    })
    .select()
    .single();

  if (campErr) throw campErr;

  // 4. Run the pipeline
  try {
    await pipelineSearchProperties(campaign.id, input);
    await pipelineSkipTrace(campaign.id);
    await pipelineVerifyAddresses(campaign.id);

    // Count results
    const { count: readyCount } = await supabase
      .from("mbl_properties")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "verified")
      .eq("selected", true);

    await supabase
      .from("mbl_campaigns")
      .update({ status: "ready" })
      .eq("id", campaign.id);

    return { campaignId: campaign.id, readyCount };
  } catch (err) {
    await supabase
      .from("mbl_campaigns")
      .update({ status: "error" })
      .eq("id", campaign.id);
    throw err;
  }
}


// ── Pipeline Step 1: Property Search ──────────────────────────────────

async function pipelineSearchProperties(campaignId, input) {
  const searchBody = {
    city: input.area || undefined,
    zip: input.zip || undefined,
    state: input.state || "MA",
    estimated_value_min: input.priceMin || undefined,
    estimated_value_max: input.priceMax || undefined,
    beds_min: input.beds ? parseInt(input.beds) : undefined,
    baths_min: input.baths ? parseFloat(input.baths) : undefined,
    for_sale: false,
    foreclosure: false,
    absentee_owner: true,
    corporate_owned: false,
    last_sale_date_max: "-1825d", // 5+ years
    size: 100,
    sort: "estimated_value desc",
  };

  // Remove undefined values
  Object.keys(searchBody).forEach((k) => searchBody[k] === undefined && delete searchBody[k]);

  const res = await fetch("https://api.realestateapi.com/v2/PropertySearch", {
    method: "POST",
    headers: REAPI_HEADERS,
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PropertySearch failed: ${res.status} ${err.message || ""}`);
  }

  const data = await res.json();
  const properties = data.data || [];

  if (properties.length === 0) {
    throw new Error("No properties found matching your buyer's criteria. Try broadening the search area or price range.");
  }

  // Score and insert
  const rows = properties.map((p) => ({
    campaign_id: campaignId,
    reapi_id: p.id,
    property_address: p.address?.street || p.address?.address || "",
    property_city: p.address?.city || "",
    property_state: p.address?.state || "",
    property_zip: p.address?.zip || "",
    beds: p.bedrooms,
    baths: p.bathrooms,
    sqft: p.squareFeet,
    year_built: p.yearBuilt,
    estimated_value: p.estimatedValue,
    equity_percent: p.equityPercent,
    last_sale_date: p.lastSaleDate || null,
    absentee_owner: p.absenteeOwner || false,
    corporate_owned: p.corporateOwned || false,
    owner_full_name: p.ownerNames?.[0] || null,
    // Mailing address (critical for absentee owners)
    mail_address_line1: p.mailingAddress?.street || p.address?.street || "",
    mail_city: p.mailingAddress?.city || p.address?.city || "",
    mail_state: p.mailingAddress?.state || p.address?.state || "",
    mail_zip: p.mailingAddress?.zip || p.address?.zip || "",
    match_score: scoreProperty(p, input),
    status: "pending_skiptrace",
  }));

  const { error } = await supabase.from("mbl_properties").insert(rows);
  if (error) throw error;

  await supabase
    .from("mbl_campaigns")
    .update({ status: "skip_tracing", properties_found: rows.length })
    .eq("id", campaignId);
}

function scoreProperty(p, criteria) {
  const mid = ((criteria.priceMin || 400000) + (criteria.priceMax || 600000)) / 2;
  const range = (criteria.priceMax || 600000) - (criteria.priceMin || 400000);
  const priceDiff = Math.abs((p.estimatedValue || mid) - mid);
  const priceFit = Math.max(0, 1 - priceDiff / (range || 1));
  const equityBonus = (p.equityPercent || 0) > 40 ? 1 : (p.equityPercent || 0) > 20 ? 0.5 : 0.2;
  const absenteeBonus = p.absenteeOwner ? 1 : 0.3;
  return Math.round(priceFit * 40 + equityBonus * 30 + absenteeBonus * 30);
}


// ── Pipeline Step 2: Skip Trace ──────────────────────────────────────

async function pipelineSkipTrace(campaignId) {
  const { data: properties } = await supabase
    .from("mbl_properties")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending_skiptrace");

  const BATCH_SIZE = 50;

  for (let i = 0; i < properties.length; i += BATCH_SIZE) {
    const batch = properties.slice(i, i + BATCH_SIZE);

    const requests = batch
      .filter((p) => p.owner_full_name && !p.corporate_owned)
      .map((p) => {
        const parts = (p.owner_full_name || "").split(" ");
        return {
          first_name: parts[0] || "",
          last_name: parts.slice(1).join(" ") || "",
          address: p.property_address,
          city: p.property_city,
          state: p.property_state,
          zip: p.property_zip,
        };
      });

    if (requests.length === 0) {
      // Mark all as no-contact
      for (const p of batch) {
        await supabase
          .from("mbl_properties")
          .update({ status: "pending_verify", dnc_status: "unknown" })
          .eq("id", p.id);
      }
      continue;
    }

    const res = await fetch("https://api.realestateapi.com/v2/BulkSkipTrace", {
      method: "POST",
      headers: REAPI_HEADERS,
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      console.error(`SkipTrace batch ${i} failed: ${res.status}`);
      continue; // Don't fail the whole campaign — mark these as unresolved
    }

    const stData = await res.json();
    const results = stData.data || [];

    let resultIdx = 0;
    for (const prop of batch) {
      if (prop.corporate_owned || !prop.owner_full_name) {
        await supabase.from("mbl_properties").update({ status: "pending_verify" }).eq("id", prop.id);
        continue;
      }

      const result = results[resultIdx++];
      if (!result?.person) {
        await supabase.from("mbl_properties").update({ status: "pending_verify" }).eq("id", prop.id);
        continue;
      }

      const phones = result.phone || [];
      const bestPhone = phones.find((p) => p.type === "mobile") || phones[0];

      await supabase
        .from("mbl_properties")
        .update({
          owner_first_name: result.person.firstName,
          owner_last_name: result.person.lastName,
          owner_phone: bestPhone?.number || null,
          owner_email: (result.email || [])[0]?.address || null,
          dnc_status: bestPhone?.dnc ? "flagged" : "clear",
          selected: bestPhone?.dnc ? false : true, // Auto-deselect DNC
          status: "pending_verify",
        })
        .eq("id", prop.id);
    }

    // Rate limit: 1s between batches
    if (i + BATCH_SIZE < properties.length) {
      await sleep(1000);
    }
  }

  await supabase
    .from("mbl_campaigns")
    .update({ status: "verifying" })
    .eq("id", campaignId);
}


// ── Pipeline Step 3: Lob Address Verification ────────────────────────
// P0: Verify all mailing addresses before showing to agent

async function pipelineVerifyAddresses(campaignId) {
  const { data: properties } = await supabase
    .from("mbl_properties")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending_verify");

  let verified = 0;
  let failed = 0;

  // Lob rate limit: 300 verifications per 5 seconds
  // Process in batches of 50, 200ms between each call
  for (const prop of properties) {
    try {
      const result = await lobFetch("/us_verifications", "POST", {
        primary_line: prop.mail_address_line1,
        secondary_line: prop.mail_address_line2 || "",
        city: prop.mail_city,
        state: prop.mail_state,
        zip_code: prop.mail_zip,
      });

      const deliverable = [
        "deliverable",
        "deliverable_unnecessary_unit",
        "deliverable_incorrect_unit",
        "deliverable_missing_unit",
      ].includes(result.deliverability);

      // Store Lob-corrected address (standardized formatting)
      const corrected = result.components || {};
      await supabase
        .from("mbl_properties")
        .update({
          address_verified: true,
          address_deliverable: result.deliverability,
          verified_address: {
            line1: result.primary_line,
            line2: result.secondary_line || null,
            city: corrected.city,
            state: corrected.state,
            zip: corrected.zip_code + (corrected.zip_code_plus_4 ? "-" + corrected.zip_code_plus_4 : ""),
          },
          status: deliverable ? "verified" : "bad_address",
          selected: deliverable ? prop.selected : false, // Auto-deselect bad addresses
        })
        .eq("id", prop.id);

      if (deliverable) verified++;
      else failed++;
    } catch (err) {
      console.error(`Address verification failed for ${prop.id}:`, err.message);
      // Don't block — mark as unverified but still selectable
      await supabase
        .from("mbl_properties")
        .update({ status: "verified", address_verified: false })
        .eq("id", prop.id);
      verified++;
    }

    // Throttle: ~200ms between calls = ~250/5s (under 300 limit)
    await sleep(200);
  }

  await supabase
    .from("mbl_campaigns")
    .update({ addresses_verified: verified, addresses_failed: failed })
    .eq("id", campaignId);
}


// ════════════════════════════════════════════════════════════════════════
// P0: SEND LETTERS VIA LOB
// POST /api/mbl/campaigns/:id/send
// P1: Idempotency keys, error handling, retry logic
// ════════════════════════════════════════════════════════════════════════

export async function sendLetters(campaignId, selectedPropertyIds) {
  // 1. Load campaign with agent
  const { data: campaign } = await supabase
    .from("mbl_campaigns")
    .select("*, mbl_agents(*)")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.mbl_agents?.lob_address_id) throw new Error("Agent Lob address not configured");

  // 2. Get selected, verified properties
  const { data: properties } = await supabase
    .from("mbl_properties")
    .select("*")
    .eq("campaign_id", campaignId)
    .in("id", selectedPropertyIds)
    .in("status", ["verified", "ready"]);

  if (!properties?.length) throw new Error("No sendable properties selected");

  await supabase
    .from("mbl_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  const agent = campaign.mbl_agents;
  const results = { sent: 0, failed: 0, errors: [] };

  // 3. Send each letter with idempotency
  for (const prop of properties) {
    const toName = [prop.owner_first_name, prop.owner_last_name].filter(Boolean).join(" ")
      || prop.owner_full_name || "Current Resident";

    // Use Lob-verified address if available, else original
    const addr = prop.verified_address || {
      line1: prop.mail_address_line1,
      line2: prop.mail_address_line2,
      city: prop.mail_city,
      state: prop.mail_state,
      zip: prop.mail_zip,
    };

    const payload = {
      description: `MBL: ${campaign.buyer_name} → ${toName}`,
      to: {
        name: toName,
        address_line1: addr.line1,
        address_line2: addr.line2 || undefined,
        address_city: addr.city,
        address_state: addr.state,
        address_zip: addr.zip,
        address_country: "US",
      },
      from: agent.lob_address_id,  // Reference stored Lob address ID
      file: campaign.template_id,   // Lob template ID
      merge_variables: {
        ...campaign.merge_variables,
        // Per-letter overrides — these are unique to each recipient
        property_address: prop.property_address,
        neighborhood: prop.property_city || campaign.merge_variables.neighborhood,
      },
      color: true,
      double_sided: false,
      address_placement: "top_first_page",
      mail_type: "usps_first_class",
      metadata: {
        campaign_id: campaignId,
        property_id: prop.id,
        agent_id: agent.id,
      },
    };

    // P1: Idempotency key prevents duplicates on retry
    const idempotencyKey = `mbl_${campaignId}_${prop.id}`;

    try {
      const lobRes = await lobFetchWithRetry("/letters", "POST", payload, {
        "Idempotency-Key": idempotencyKey,
      });

      await supabase
        .from("mbl_properties")
        .update({
          status: "sent",
          lob_letter_id: lobRes.id,
          lob_url: lobRes.url,
          lob_tracking: lobRes.tracking_number,
          expected_delivery: lobRes.expected_delivery_date,
          delivery_status: "sent",
          delivery_updated_at: new Date().toISOString(),
        })
        .eq("id", prop.id);

      results.sent++;
    } catch (err) {
      console.error(`Send failed for ${prop.id}:`, err.message);

      await supabase
        .from("mbl_properties")
        .update({ status: "send_failed", delivery_status: "failed" })
        .eq("id", prop.id);

      results.failed++;
      results.errors.push({ propertyId: prop.id, error: err.message });
    }

    // Lob rate limit: 150/5s. Throttle to ~100/5s to be safe
    await sleep(50);
  }

  // 4. Update campaign totals
  const totalCost = results.sent * 1.12; // Our price per letter
  await supabase
    .from("mbl_campaigns")
    .update({
      status: results.sent > 0 ? "sent" : "error",
      letters_sent: results.sent,
      total_cost: totalCost,
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return results;
}


// ════════════════════════════════════════════════════════════════════════
// P0: CANCEL LETTER (within 4-hour window)
// DELETE /api/mbl/letters/:lobLetterId
// ════════════════════════════════════════════════════════════════════════

export async function cancelLetter(lobLetterId) {
  const res = await lobFetch(`/letters/${lobLetterId}`, "DELETE");

  await supabase
    .from("mbl_properties")
    .update({ status: "cancelled", delivery_status: "cancelled" })
    .eq("lob_letter_id", lobLetterId);

  return res;
}


// ════════════════════════════════════════════════════════════════════════
// P0: LOB WEBHOOK HANDLER
// POST /api/webhooks/lob
// ════════════════════════════════════════════════════════════════════════

export async function handleLobWebhook(req) {
  // P1: Verify webhook signature
  const signature = req.headers["lob-signature"];
  const timestamp = req.headers["lob-signature-timestamp"];

  if (process.env.LOB_WEBHOOK_SECRET && signature) {
    const payload = timestamp + "." + JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", process.env.LOB_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expected) {
      console.error("Invalid Lob webhook signature");
      return { status: 401 };
    }
  }

  const event = req.body;
  const eventType = event.event_type?.id;
  const letterId = event.body?.id;

  if (!letterId || !eventType) return { status: 200 };

  // Map Lob events to our statuses
  const STATUS_MAP = {
    "letter.created": "created",
    "letter.rendered_pdf": "printed",
    "letter.rendered_thumbnails": "printed",
    "letter.in_transit": "in_transit",
    "letter.in_local_area": "arriving",
    "letter.delivered": "delivered",
    "letter.returned_to_sender": "returned",
    "letter.re_routed": "re_routed",
    "letter.viewed": "viewed", // QR code scanned
  };

  const newStatus = STATUS_MAP[eventType];
  if (!newStatus) return { status: 200 };

  // Update property row
  const { data, error } = await supabase
    .from("mbl_properties")
    .update({
      delivery_status: newStatus,
      delivery_updated_at: new Date().toISOString(),
    })
    .eq("lob_letter_id", letterId)
    .select("campaign_id")
    .single();

  if (error) {
    console.error(`Webhook update failed for ${letterId}:`, error);
    return { status: 200 }; // Acknowledge anyway so Lob doesn't retry
  }

  // P1: Update campaign aggregate counts
  if (data?.campaign_id) {
    await updateCampaignCounts(data.campaign_id);
  }

  return { status: 200 };
}

async function updateCampaignCounts(campaignId) {
  const { data } = await supabase
    .from("mbl_properties")
    .select("delivery_status")
    .eq("campaign_id", campaignId)
    .not("delivery_status", "is", null);

  if (!data) return;

  const counts = {
    letters_delivered: data.filter((p) => p.delivery_status === "delivered").length,
    letters_returned: data.filter((p) => p.delivery_status === "returned").length,
  };

  const allDelivered = counts.letters_delivered + counts.letters_returned === data.length;

  await supabase
    .from("mbl_campaigns")
    .update({
      ...counts,
      status: allDelivered ? "delivered" : "sent",
    })
    .eq("id", campaignId);
}


// ════════════════════════════════════════════════════════════════════════
// P1: POST-SEND DASHBOARD DATA
// GET /api/mbl/campaigns/:id
// ════════════════════════════════════════════════════════════════════════

export async function getCampaignDetail(campaignId) {
  const { data: campaign } = await supabase
    .from("mbl_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  const { data: properties } = await supabase
    .from("mbl_properties")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("match_score", { ascending: false });

  const summary = {
    total: properties.length,
    sent: properties.filter((p) => p.lob_letter_id).length,
    delivered: properties.filter((p) => p.delivery_status === "delivered").length,
    in_transit: properties.filter((p) => ["in_transit", "arriving"].includes(p.delivery_status)).length,
    returned: properties.filter((p) => p.delivery_status === "returned").length,
    failed: properties.filter((p) => p.status === "send_failed").length,
    bad_address: properties.filter((p) => p.status === "bad_address").length,
    dnc: properties.filter((p) => p.dnc_status === "flagged").length,
  };

  return { campaign, properties, summary };
}

// GET /api/mbl/campaigns (list all for agent)
export async function listCampaigns(agentId) {
  const { data } = await supabase
    .from("mbl_campaigns")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  return data || [];
}


// ════════════════════════════════════════════════════════════════════════
// P1: DOWNLOAD ENDPOINTS
// ════════════════════════════════════════════════════════════════════════

export async function downloadContacts(campaignId) {
  const { data } = await supabase
    .from("mbl_properties")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("match_score", { ascending: false });

  const headers = [
    "owner_first_name", "owner_last_name", "property_address", "property_city",
    "property_state", "property_zip", "mail_address_line1", "mail_city",
    "mail_state", "mail_zip", "owner_phone", "owner_email", "estimated_value",
    "beds", "baths", "sqft", "absentee_owner", "dnc_status", "match_score",
    "delivery_status",
  ];

  const rows = data.map((p) =>
    headers.map((h) => {
      const val = p[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") ? `"${str}"` : str;
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}


// ════════════════════════════════════════════════════════════════════════
// LOB TEMPLATE SETUP (deployment script — run once per template)
// ════════════════════════════════════════════════════════════════════════

export async function createLobTemplate(name, htmlContent) {
  const template = await lobFetch("/templates", "POST", {
    description: name,
    html: htmlContent,
  });

  console.log(`Lob template created: ${template.id} (${name})`);
  // Store template.id in config / env:
  // WARM_TEMPLATE_ID=tmpl_XXXXX
  // DIRECT_TEMPLATE_ID=tmpl_YYYYY
  // LUXURY_TEMPLATE_ID=tmpl_ZZZZZ
  return template;
}

export async function registerWebhooks(callbackUrl) {
  const webhook = await lobFetch("/webhooks", "POST", {
    url: callbackUrl,
    events: {
      id: [
        "letter.created", "letter.rendered_pdf", "letter.in_transit",
        "letter.in_local_area", "letter.delivered",
        "letter.returned_to_sender", "letter.viewed",
      ],
    },
  });

  console.log(`Webhook registered: ${webhook.id}`);
  console.log(`Store LOB_WEBHOOK_SECRET=${webhook.secret}`);
  return webhook;
}


// ════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════

async function lobFetch(path, method, body, extraHeaders = {}) {
  const res = await fetch(LOB_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: LOB_AUTH,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Lob ${method} ${path} failed: ${res.status} — ${err.error?.message || JSON.stringify(err)}`);
  }

  return res.json();
}

// P1: Retry with exponential backoff for Lob API calls
async function lobFetchWithRetry(path, method, body, extraHeaders = {}, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await lobFetch(path, method, body, extraHeaders);
    } catch (err) {
      const isRetryable =
        err.message.includes("429") || // Rate limited
        err.message.includes("500") || // Server error
        err.message.includes("502") ||
        err.message.includes("503") ||
        err.message.includes("ECONNRESET") ||
        err.message.includes("ETIMEDOUT");

      if (!isRetryable || attempt === maxRetries) {
        throw err; // Non-retryable error or max retries exceeded
      }

      const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
      console.warn(`Lob retry ${attempt + 1}/${maxRetries} for ${path} in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
