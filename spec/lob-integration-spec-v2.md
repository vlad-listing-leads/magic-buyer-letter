# Magic Buyer Letter → Lob Integration Spec
## Every field Lob needs, where we get it, and what's missing

---

## The Lob `POST /v1/letters` Request

This is the exact payload Lob requires. Every field is annotated with where we source it and whether we have it today.

```json
{
  "description": "MBL: Sarah → Margaret Chen, 47 Oak Hill Rd Newton",
  "to": {
    "name": "Margaret Chen",                    // ← RealEstateAPI skip-trace
    "address_line1": "47 Oak Hill Rd",          // ← RealEstateAPI PropertySearch (mailing address for absentee)
    "address_line2": null,                      // ← RealEstateAPI (apt/unit if exists)
    "address_city": "Newton",                   // ← RealEstateAPI
    "address_state": "MA",                      // ← RealEstateAPI
    "address_zip": "02459",                     // ← RealEstateAPI
    "address_country": "US"                     // ← Hardcoded (US-only product)
  },
  "from": {
    "name": "Jimmy Mackin",                     // ← Agent profile (⚠️ WE NEED THIS)
    "company": "Mackin Realty",                  // ← Agent profile (⚠️ WE NEED THIS)
    "address_line1": "123 Main St",             // ← Agent profile (⚠️ WE NEED THIS)
    "address_line2": null,                      // ← Agent profile (optional)
    "address_city": "Boston",                   // ← Agent profile (⚠️ WE NEED THIS)
    "address_state": "MA",                      // ← Agent profile (⚠️ WE NEED THIS)
    "address_zip": "02101",                     // ← Agent profile (⚠️ WE NEED THIS)
    "address_country": "US"                     // ← Hardcoded
  },
  "file": "tmpl_XXXXXXXX",                     // ← Lob template ID (created once via API)
  "merge_variables": {
    "buyer_name": "Sarah",                      // ← Smart input parser
    "neighborhood": "Newton",                   // ← Smart input parser / RealEstateAPI
    "property_address": "47 Oak Hill Rd",       // ← RealEstateAPI PropertySearch (per letter)
    "bullet_1": "Pre-approved up to $600,000",  // ← Generated from buyer criteria
    "bullet_2": "Flexible on closing",          // ← Generated from buyer criteria
    "bullet_3": "Comfortable with minor updates",// ← Generated from buyer criteria or Claude
    "agent_name": "Jimmy Mackin",               // ← Agent profile
    "agent_phone": "(617) 921-5263",            // ← Agent profile (⚠️ WE NEED THIS)
    "agent_brokerage": "Mackin Realty",          // ← Agent profile
    "agent_initials": "JM"                      // ← Derived from agent name
  },
  "color": true,                                // ← Hardcoded true (letter has color elements)
  "double_sided": false,                        // ← Hardcoded false (single page letter)
  "address_placement": "top_first_page",        // ← Hardcoded (Lob prints address at top)
  "mail_type": "usps_first_class",              // ← Default; agent could choose "usps_standard"
  "return_envelope": false,                     // ← Default false
  "perforated_page": null,                      // ← Not used
  "custom_envelope": null,                      // ← Not used (standard #10 double-window)
  "extra_service": null,                        // ← null for standard; "certified" costs more
  "metadata": {
    "campaign_id": "camp_abc123",               // ← Our internal campaign ID
    "property_id": "prop_def456",               // ← Our internal property ID
    "buyer_name": "Sarah"                       // ← For tracking
  }
}
```

---

## Data Sources Audit

### ✅ What We Have (from RealEstateAPI + our parser)

| Field | Source | Notes |
|-------|--------|-------|
| `to.name` | BulkSkipTrace response → `person.firstName` + `person.lastName` | For corporate owners, use entity name |
| `to.address_line1` | PropertySearch → `mailingAddress.street` (absentee) or `address.street` (owner-occ) | **Critical**: absentee owners get letter at mailing address, NOT property address |
| `to.address_city/state/zip` | PropertySearch → `mailingAddress.*` or `address.*` | Same logic as above |
| `buyer_name` | Smart input parser | Parsed from natural language |
| `neighborhood` | Smart input parser → `area` field | Or PropertySearch city |
| `bullet_1/2/3` | Generated from buyer criteria | Or Claude-generated |

### ⚠️ What We're Missing (must collect from agent)

| Field | Where to Collect | Required? |
|-------|-----------------|-----------|
| `from.name` | Agent onboarding / settings | **Yes** — Lob requires `from` on all letters |
| `from.company` | Agent onboarding / settings | No, but recommended for professionalism |
| `from.address_line1` | Agent onboarding / settings | **Yes** — return address required |
| `from.address_city/state/zip` | Agent onboarding / settings | **Yes** |
| `agent_phone` | Agent onboarding / settings | **Yes** — it's the CTA in the letter |
| `agent_email` | Agent onboarding / settings | No, but useful for future templates |
| Agent headshot/logo | Agent onboarding / settings | No — we use initials as fallback |

**→ We need an "Agent Profile" setup step before the first campaign.**

---

## Pre-flight: Address Verification

Before sending any letter, we MUST verify the `to` address. Lob offers verification and will reject undeliverable addresses depending on your strictness setting.

### Option A: Verify before sending (recommended)
```
POST https://api.lob.com/v1/us_verifications
{
  "primary_line": "47 Oak Hill Rd",
  "city": "Newton",
  "state": "MA",
  "zip_code": "02459"
}
```

Response includes `deliverability`:
- `deliverable` → Send it
- `deliverable_unnecessary_unit` → Send it (unit info not needed)
- `deliverable_incorrect_unit` → Send it but flag (wrong apt #)
- `deliverable_missing_unit` → Send it but flag (missing apt #)
- `undeliverable` → **Do NOT send** — remove from list, refund credit

We should verify all 100 addresses in batch before showing the audience list.
Rate limit: 300 requests per 5 seconds. 100 addresses = ~2 seconds.

### Option B: Let Lob reject at send time
Set account strictness to "Normal" and Lob will reject undeliverable addresses with a 422 error. Less ideal because you've already shown the agent a count and cost.

**→ Go with Option A. Verify addresses during the loading step, alongside skip-trace.**

---

## The Full Pipeline (in order)

### Step 0: Agent Profile Setup (one-time)
Collect and store in Supabase `agents` table:
```
- name (required)
- brokerage (required)
- phone (required)
- email (optional)
- address_line1 (required)
- address_line2 (optional)
- city (required)
- state (required)
- zip (required)
- headshot_url (optional)
- license_number (optional, for disclaimer)
```

Also: create the `from` address in Lob once so we can reference it by ID:
```
POST https://api.lob.com/v1/addresses
{
  "name": "Jimmy Mackin",
  "company": "Mackin Realty",
  "address_line1": "123 Main St",
  "address_city": "Boston",
  "address_state": "MA",
  "address_zip": "02101"
}
→ Returns adr_XXXXX (store this, reuse on every letter)
```

### Step 1: Agent describes buyer (frontend)
We parse and store:
```
- buyer_name → merge_variables.buyer_name
- price_min / price_max → PropertySearch filters + merge_variables.bullet_1
- beds / baths → PropertySearch filters
- area / zip → PropertySearch filters + merge_variables.neighborhood
- concessions (pre-approved, cash, flexible) → merge_variables.bullet_2
- timeframe → merge_variables.bullet_3 (optional)
```

### Step 2: Agent customizes letter (frontend)
Template selection stores `template_id` for the Lob call.
Inline edits modify `merge_variables` content.

But there's a **key decision** here:

**Option A: HTML file per letter (current approach)**
- Each letter body is fully rendered HTML with all merge vars baked in
- Sent to Lob as `file: "<html>...</html>"`
- Pro: Total control over content per letter
- Con: 100 separate HTML strings to manage

**Option B: Lob template + merge variables (recommended)**
- Upload ONE HTML template to Lob with `{{variable}}` placeholders
- On each send, pass `file: "tmpl_XXXXX"` + `merge_variables: {...}`
- Lob renders the template with the merge vars at print time
- Pro: Clean, one template to manage, Lob handles rendering
- Con: Less per-letter customization (all letters share same template structure)

**→ Go with Option B for v1.** The merge variables give us enough personalization (buyer name, neighborhood, bullets, agent info). If agents need truly unique letters per owner (e.g., Claude-written custom body), we can do Option A as a v2 upgrade.

### Step 3: System finds properties + verifies addresses
Pipeline (what happens during loading animation):

1. `POST /v2/PropertySearch` → 100 properties with owner data
2. `POST /v2/BulkSkipTrace` → owner names, phone, email, DNC (batches of 50)
3. `POST /v1/us_verifications` (Lob) → verify each mailing address (rate: 300/5s)
4. Score + rank → present to agent

For absentee owners: the `to` address is the **mailing address** (where they actually live), not the property address (the house their buyer wants). This is critical — RealEstateAPI returns both:
- `address.*` = the property itself
- `mailingAddress.*` = where the owner receives mail

### Step 4: Agent reviews audience + sends
For each selected recipient, we construct the Lob payload:

```javascript
for (const owner of selectedOwners) {
  await fetch("https://api.lob.com/v1/letters", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + btoa(LOB_API_KEY + ":"),
      "Idempotency-Key": `mbl_${campaignId}_${owner.id}`  // Prevent duplicates
    },
    body: JSON.stringify({
      description: `MBL: ${buyerName} → ${owner.name}`,
      to: {
        name: owner.name,
        address_line1: owner.mailingAddress.street,
        address_line2: owner.mailingAddress.unit || null,
        address_city: owner.mailingAddress.city,
        address_state: owner.mailingAddress.state,
        address_zip: owner.mailingAddress.zip,
        address_country: "US"
      },
      from: agent.lobAddressId,  // "adr_XXXXX" created during onboarding
      file: templateId,          // "tmpl_XXXXX" created during deployment
      merge_variables: {
        buyer_name: buyerName,
        neighborhood: owner.propertyCity,
        bullet_1: bullets[0],
        bullet_2: bullets[1],
        bullet_3: bullets[2],
        agent_name: agent.name,
        agent_phone: agent.phone,
        agent_brokerage: agent.brokerage,
        agent_initials: agent.name.split(" ").map(n => n[0]).join("")
      },
      color: true,
      double_sided: false,
      address_placement: "top_first_page",
      mail_type: "usps_first_class",
      metadata: {
        campaign_id: campaignId,
        property_id: owner.propertyId
      }
    })
  });
}
```

**Rate limiting**: Lob allows 150 requests per 5 seconds. 100 letters = under 4 seconds.

**Idempotency**: The `Idempotency-Key` header ensures that if we retry (network error, timeout), Lob won't create duplicate letters. We construct the key from campaign + owner ID so it's deterministic.

**Cancellation window**: Lob defaults to a 4-hour cancellation window. After the agent confirms, we have 4 hours to cancel any letter via `DELETE /v1/letters/{id}`. We could expose this as an "Undo" feature.

---

## What Lob Returns (per letter)

```json
{
  "id": "ltr_4868c3b754655f90",
  "url": "https://lob-assets.com/letters/ltr_XXX.pdf?...",
  "carrier": "USPS",
  "tracking_number": "92071902358909000011275538",
  "expected_delivery_date": "2026-03-24",
  "send_date": "2026-03-18",
  "mail_type": "usps_first_class",
  "thumbnails": [
    { "small": "...", "medium": "...", "large": "..." }
  ]
}
```

We store `id`, `url`, `expected_delivery_date`, and `tracking_number` per property row.

The `url` is a signed PDF preview — we can show this to the agent as proof of what was sent.

---

## Webhook Events (delivery tracking)

Register once:
```
POST https://api.lob.com/v1/webhooks
{
  "url": "https://listingleads.com/api/webhooks/lob",
  "events": {
    "id": [
      "letter.created",
      "letter.rendered_pdf",
      "letter.in_transit",
      "letter.in_local_area",
      "letter.delivered",
      "letter.returned_to_sender",
      "letter.viewed"           // QR code scanned (if we add QR codes)
    ]
  }
}
```

Each webhook fires with the letter ID so we can update our DB.

---

## Cost Structure

| Component | Lob price | Our price | Notes |
|-----------|-----------|-----------|-------|
| Letter (B&W, 1 page, first class) | ~$0.63 | $1.12 | Standard #10 envelope |
| Letter (Color, 1 page, first class) | ~$0.80 | $1.12 | Our letter has color (hills illustration) |
| Address verification | $0.01/each | Included | 100 verifications = $1.00 |
| Extra: Certified mail | +$5.50 | +$7.00 | Optional upgrade |
| Extra: Return envelope | +$0.50 | +$0.75 | Optional upgrade |

100-letter campaign: ~$80 Lob cost → $112 agent price → $32 margin

---

## UI Gaps to Close

### 1. Agent Profile (blocking — must have before first send)
We need a setup/settings screen where the agent enters:
- Full name
- Brokerage name
- Phone number (this is the CTA in the letter!)
- Return address (street, city, state, zip)
- Optional: headshot, email, license #

This can be a one-time onboarding modal or a Settings page.

### 2. Send Confirmation Should Show:
- Total letter count
- Total cost (letters × $1.12)
- Estimated delivery window (Lob returns `expected_delivery_date`)
- Sample envelope mockup with real from/to addresses
- "You have 4 hours to cancel after sending"

### 3. Post-Send Dashboard Should Show:
- Per-letter status from webhooks (created → printed → in_transit → delivered)
- PDF preview link (from Lob `url` field)
- Tracking number (from Lob `tracking_number`)
- Summary: X sent, Y delivered, Z returned

### 4. Error Handling
- Address verification failures → show "X addresses undeliverable, removed from list"
- Lob API errors (422) → show specific error, retry logic
- Rate limiting (429) → exponential backoff, queue remaining
- Network failures → retry with idempotency key (safe to retry)

---

## Template Management

### Creating the template in Lob (one-time setup):
```
POST https://api.lob.com/v1/templates
{
  "description": "Magic Buyer Letter - Warm + Personal",
  "html": "<html>...full 8.5x11 letter HTML with {{merge_variables}}...</html>"
}
→ Returns tmpl_XXXXX

POST https://api.lob.com/v1/templates/{tmpl_id}/versions
{
  "description": "v1.1 - updated P.S. copy",
  "html": "<html>...updated HTML...</html>"
}
→ Returns vrsn_XXXXX
```

We can have multiple templates (Warm, Direct, Luxury) stored as different Lob templates. The agent's template choice maps to a different `tmpl_` ID.

### Template HTML Requirements (from Lob docs):
- Body: `width: 8.5in; height: 11in; margin: 0; padding: 0`
- Safe area: `0.1875in` from all edges (the `.page-content` div)
- Address window: Lob prints recipient address at top of first page (when `address_placement: "top_first_page"`)
- Return address: printed by Lob from the `from` field
- Fonts: Google Fonts via `<link>` tag, or custom hosted fonts
- SVGs: inline only (no external references)
- Images: must be hosted on accessible URLs (or inline base64)
- CSS: Webkit engine (Safari) — no flexbox in older Lob renderers; use absolute positioning
- Merge variables: `{{variable_name}}` syntax
- Page breaks: `.page { page-break-after: always; }` for multi-page

---

## Summary: What We Need to Build

| Priority | Item | Status |
|----------|------|--------|
| P0 | Agent profile setup (name, phone, return address) | **Not built** |
| P0 | Address verification during loading step | **Not built** |
| P0 | Lob template upload (one-time deployment script) | **Template HTML exists** |
| P0 | `POST /v1/letters` call with all required fields | **Stubbed** |
| P0 | Store Lob letter IDs + track delivery via webhooks | **Stubbed** |
| P1 | Lob `from` address creation during agent onboarding | **Not built** |
| P1 | Idempotency keys on all send requests | **Not built** |
| P1 | Error handling (bad addresses, rate limits, retries) | **Not built** |
| P1 | Post-send dashboard with delivery status | **Designed** |
| P2 | Multiple template support (Warm/Direct/Luxury) | **Designed** |
| P2 | Certified mail upgrade option | **Not built** |
| P2 | QR code tracking (letter.viewed webhook) | **Not built** |
| P2 | 4-hour cancellation window / undo feature | **Not built** |
