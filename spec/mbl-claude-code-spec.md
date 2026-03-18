# Magic Buyer Letter — Engineering Spec for Claude Code

## What this is

A complete implementation spec for building Magic Buyer Letter, a ListingLeads.com product that lets real estate agents describe a buyer, find matching off-market homeowners, generate personalized letters, and mail them via Lob.

**Reference files in this repo:**
- `mbl-final.jsx` — Working React prototype (all screens, flows, interactions)
- `mbl-integration.js` — Backend stubs with full Supabase schema, RealEstateAPI calls, Lob integration, webhook handler
- `lob-letter-template.html` — Production Lob-compatible 8.5x11 HTML letter template with merge variables
- `lob-integration-spec-v2.md` — Every Lob field annotated with data source

## Stack

- **Frontend:** Next.js 14+ (App Router), React, shadcn/ui, Tailwind
- **Backend:** Next.js API Routes (server actions where appropriate)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Property Data:** RealEstateAPI (reapi.com)
- **Address Verification + Print + Mail:** Lob (lob.com)
- **AI Letter Generation:** Anthropic Claude API
- **Payments:** Stripe (per-campaign billing)

## Environment Variables

```
REAPI_KEY=
REAPI_USER_ID=
ANTHROPIC_API_KEY=
LOB_API_KEY=              # test_xxx for sandbox, live_xxx for production
LOB_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Database Schema (Supabase)

Run this SQL in Supabase SQL Editor. Three tables.

```sql
-- Agent profile (one per ListingLeads user)
CREATE TABLE mbl_agents (
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
  lob_address_id  TEXT,          -- adr_XXXXX (persistent Lob from-address)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Campaigns
CREATE TABLE mbl_campaigns (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID NOT NULL REFERENCES mbl_agents(id),
  buyer_name      TEXT NOT NULL,
  criteria        JSONB NOT NULL,
  template_id     TEXT NOT NULL,
  merge_variables JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'searching',
  properties_found    INT DEFAULT 0,
  addresses_verified  INT DEFAULT 0,
  addresses_failed    INT DEFAULT 0,
  letters_sent        INT DEFAULT 0,
  letters_delivered   INT DEFAULT 0,
  letters_returned    INT DEFAULT 0,
  total_cost          DECIMAL(10,2) DEFAULT 0,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Individual properties per campaign
CREATE TABLE mbl_properties (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id         UUID NOT NULL REFERENCES mbl_campaigns(id) ON DELETE CASCADE,
  -- Property data (from RealEstateAPI PropertySearch)
  property_address    TEXT,
  property_city       TEXT,
  property_state      TEXT,
  property_zip        TEXT,
  property_lat        DECIMAL(10,7),
  property_lng        DECIMAL(10,7),
  neighborhood        TEXT,
  estimated_value     INT,
  bedrooms            INT,
  bathrooms           DECIMAL(3,1),
  sqft                INT,
  lot_sqft            INT,
  year_built          INT,
  years_owned         INT,
  equity_percent      INT,
  owner_type          TEXT,             -- Owner | Absentee | Investor
  -- Owner data (from BulkSkipTrace)
  owner_full_name     TEXT,
  owner_first_name    TEXT,
  owner_last_name     TEXT,
  owner_phone         TEXT,
  owner_email         TEXT,
  is_dnc              BOOLEAN DEFAULT false,
  -- Mailing address (may differ from property for absentee)
  mail_address_line1  TEXT,
  mail_address_line2  TEXT,
  mail_city           TEXT,
  mail_state          TEXT,
  mail_zip            TEXT,
  -- Lob verification result
  verified_address    JSONB,            -- { line1, line2, city, state, zip }
  address_verified    BOOLEAN DEFAULT false,
  -- Lob letter data (after send)
  lob_letter_id       TEXT,             -- ltr_XXXXX
  lob_url             TEXT,
  lob_tracking        TEXT,
  expected_delivery   DATE,
  -- Status tracking
  status              TEXT DEFAULT 'found',
  delivery_status     TEXT,
  delivery_updated_at TIMESTAMPTZ,
  selected            BOOLEAN DEFAULT true,
  is_manual           BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_props_campaign ON mbl_properties(campaign_id);
CREATE INDEX idx_props_lob_letter ON mbl_properties(lob_letter_id);
```

### Status machines

**Campaign status:** `searching` → `skip_tracing` → `verifying` → `ready` → `sending` → `sent` → `delivered` | `error`

**Property status:** `found` → `skip_traced` → `verified` → `sent` → `delivered` | `returned` | `send_failed` | `cancelled`

**Delivery status (from Lob webhooks):** `created` → `printed` → `in_transit` → `arriving` → `delivered` | `returned` | `re_routed`

---

## API Endpoints

### 1. Agent Profile

**`POST /api/mbl/agent/setup`**

Purpose: Create or update agent profile, verify return address via Lob, create persistent Lob from-address.

```
Request body:
{
  name: string,          // required
  brokerage: string,     // required
  phone: string,         // required
  email?: string,
  address_line1: string, // required — return address
  address_line2?: string,
  city: string,          // required
  state: string,         // required (2 char)
  zip: string,           // required
  license_number?: string,
  headshot_url?: string, // Supabase Storage public URL
  logo_url?: string,     // Supabase Storage public URL
  website?: string
}
```

Implementation steps:
1. Validate required fields
2. **POST `https://api.lob.com/v1/us_verifications`** — verify return address is real
   ```json
   { "primary_line": "123 Main St", "city": "Boston", "state": "MA", "zip_code": "02101" }
   ```
   Response: `{ deliverability: "deliverable", primary_line: "123 MAIN ST", ... }`
   If `deliverability` !== "deliverable", return error to frontend.
3. **POST `https://api.lob.com/v1/addresses`** — create persistent from-address in Lob
   ```json
   { "name": "Jimmy Mackin", "company": "Mackin Realty", "address_line1": "123 MAIN ST", "address_city": "BOSTON", "address_state": "MA", "address_zip": "02101", "address_country": "US" }
   ```
   Response: `{ id: "adr_abc123", ... }` — save this `id` as `lob_address_id`
4. Upload headshot/logo to Supabase Storage if provided, get public URLs
5. Upsert `mbl_agents` with all fields including `lob_address_id`

**`GET /api/mbl/agent`** — returns agent profile or null

---

### 2. Create Campaign (the big pipeline)

**`POST /api/mbl/campaigns`**

This is the endpoint that runs during the 4-step loading animation. It should use Server-Sent Events (SSE) or polling so the frontend can show progress.

```
Request body:
{
  buyerName: string,
  priceMin: number,
  priceMax: number,
  beds?: number,
  baths?: number,
  area?: string,        // city or neighborhood name
  zip?: string,
  state: string,        // default "MA"
  bullets: string[],    // 3 bullet points from the detail step
  extra?: string,       // optional 4th bullet
  templateId: string    // "tmpl_warm_v1" etc.
}
```

#### Step 1: Property Search

**POST `https://api.realestate-api.com/v2/PropertySearch`**

```json
{
  "city": "Newton",
  "state": "MA",
  "estimated_value_min": 400000,
  "estimated_value_max": 600000,
  "bedrooms_min": 3,
  "bathrooms_min": 2,
  "absentee_owner": true,
  "years_owned_min": 5,
  "limit": 100,
  "offset": 0
}
```

Headers: `{ "x-api-key": REAPI_KEY, "x-user-id": REAPI_USER_ID, "Content-Type": "application/json" }`

Response shape:
```json
{
  "data": [
    {
      "property_address": "47 Oak Hill Rd",
      "city": "Newton",
      "state": "MA",
      "zip": "02459",
      "latitude": 42.331,
      "longitude": -71.192,
      "estimated_value": 520000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1850,
      "lot_sqft": 6500,
      "year_built": 1952,
      "owner_type": "Absentee",
      "years_owned": 12,
      "equity_percent": 65,
      "mail_address": {
        "line1": "PO Box 234",
        "city": "Cambridge",
        "state": "MA",
        "zip": "02138"
      }
    }
  ]
}
```

For each result: INSERT into `mbl_properties` with `status: 'found'`.

Update campaign: `status: 'skip_tracing'`, `properties_found: count`

#### Step 2: Skip Trace

**POST `https://api.realestate-api.com/v2/BulkSkipTrace`**

Send in batches of 50 with 1 second between batches.

```json
{
  "requests": [
    {
      "property_address": "47 Oak Hill Rd",
      "city": "Newton",
      "state": "MA",
      "zip": "02459"
    }
  ]
}
```

Response shape per result:
```json
{
  "owner_full_name": "Margaret Chen",
  "first_name": "Margaret",
  "last_name": "Chen",
  "phone": "(617) 555-1234",
  "email": "mchen@email.com",
  "is_dnc": false
}
```

For each: UPDATE `mbl_properties` with owner data, set `status: 'skip_traced'`. If `is_dnc: true`, set `selected: false`.

Update campaign: `status: 'verifying'`

#### Step 3: Address Verification

**POST `https://api.lob.com/v1/us_verifications`** — one per property

```json
{
  "primary_line": "47 Oak Hill Rd",
  "city": "Newton",
  "state": "MA",
  "zip_code": "02459"
}
```

Auth: `Authorization: Basic {base64(LOB_API_KEY + ':')}`

Response:
```json
{
  "deliverability": "deliverable",
  "primary_line": "47 OAK HILL RD",
  "secondary_line": "",
  "components": {
    "city": "NEWTON",
    "state": "MA",
    "zip_code": "02459",
    "zip_code_plus_4": "3847"
  }
}
```

Throttle: 200ms between calls (~250/5s, under Lob's 300/5s limit).

If `deliverability` is `deliverable` or `deliverable_unnecessary_unit`: store `verified_address` JSONB, set `address_verified: true`, `status: 'verified'`.

If `undeliverable` or `deliverable_incorrect_unit` or `deliverable_missing_unit`: set `address_verified: false`, `selected: false`.

Update campaign: `status: 'ready'`, `addresses_verified`, `addresses_failed`

#### Step 4: Letter Generation (future — v1 uses templates only)

In v1, letters use Lob templates + merge variables. No Claude generation needed per letter.

For v2 (per-owner Claude personalization):
**POST `https://api.anthropic.com/v1/messages`** with system prompt instructing tone by owner type (absentee → convenience, long-tenure → respect, investor → ROI). 10 concurrent requests.

---

### 3. Send Letters

**`POST /api/mbl/campaigns/:id/send`**

```
Request body:
{
  selectedPropertyIds: string[]  // UUIDs of properties to mail
}
```

For each selected property:

**POST `https://api.lob.com/v1/letters`**

```json
{
  "description": "MBL: Sarah → Margaret Chen, 47 Oak Hill Rd Newton",
  "to": {
    "name": "Margaret Chen",
    "address_line1": "47 OAK HILL RD",
    "address_city": "NEWTON",
    "address_state": "MA",
    "address_zip": "02459-3847",
    "address_country": "US"
  },
  "from": "adr_abc123",
  "file": "tmpl_warm_v1",
  "merge_variables": {
    "buyer_name": "Sarah",
    "neighborhood": "Newton",
    "property_address": "47 Oak Hill Rd",
    "bullet_1": "Pre-approved up to $600,000",
    "bullet_2": "Flexible on closing — whatever works best for you",
    "bullet_3": "Comfortable with homes needing minor updates",
    "agent_name": "Jimmy Mackin",
    "agent_phone": "(617) 921-5263",
    "agent_brokerage": "Mackin Realty",
    "agent_initials": "JM",
    "agent_website": "listingleads.com",
    "agent_headshot_url": "https://storage.supabase.co/...",
    "agent_logo_url": "https://storage.supabase.co/..."
  },
  "color": true,
  "double_sided": false,
  "address_placement": "top_first_page",
  "mail_type": "usps_first_class",
  "metadata": {
    "campaign_id": "uuid",
    "property_id": "uuid",
    "agent_id": "uuid"
  }
}
```

**Critical details:**
- `from` is the agent's `lob_address_id` (string reference, not inline address)
- `file` is the Lob template ID — create this once via the Lob dashboard or API using `lob-letter-template.html`
- `merge_variables` are CAMPAIGN-LEVEL except `property_address` and `neighborhood` which are PER-LETTER overrides
- Idempotency key: `Idempotency-Key: mbl_{campaignId}_{propertyId}` header
- Throttle: 50ms between sends (~100/5s, under Lob's 150/5s limit)
- Rate: Lob allows 150 requests per 5 seconds on the letters endpoint

Response per letter:
```json
{
  "id": "ltr_abc123",
  "url": "https://lob.com/letters/ltr_abc123",
  "tracking_number": "...",
  "expected_delivery_date": "2026-03-24"
}
```

Update each `mbl_properties` row with `lob_letter_id`, `lob_url`, `expected_delivery`, `status: 'sent'`, `delivery_status: 'sent'`.

Update campaign: `status: 'sent'`, `letters_sent`, `total_cost`, `sent_at`

---

### 4. Lob Webhook Handler

**`POST /api/webhooks/lob`**

Lob sends webhooks for letter lifecycle events. Register this URL in the Lob dashboard.

**Verify signature:**
```javascript
const payload = timestamp + "." + JSON.stringify(req.body);
const expected = crypto.createHmac("sha256", LOB_WEBHOOK_SECRET).update(payload).digest("hex");
if (signature !== expected) return 401;
```

**Event type mapping:**
| Lob event | Our delivery_status |
|---|---|
| letter.created | created |
| letter.rendered_pdf | printed |
| letter.rendered_thumbnails | printed |
| letter.in_transit | in_transit |
| letter.in_local_area | arriving |
| letter.delivered | delivered |
| letter.returned_to_sender | returned |
| letter.re_routed | re_routed |

On each event:
1. Extract `event.body.id` (the `ltr_XXXXX`)
2. UPDATE `mbl_properties` WHERE `lob_letter_id = ltr_XXXXX` SET `delivery_status`, `delivery_updated_at`
3. Recount campaign aggregates (delivered, returned counts)

**Always return 200** even on error — otherwise Lob retries exponentially.

---

### 5. Cancel Letter

**`DELETE /api/mbl/letters/:lobLetterId`**

Calls **DELETE `https://api.lob.com/v1/letters/:id`**

Only works within 4 hours of creation. After that, Lob returns a 422 error.

---

### 6. Dashboard Data

**`GET /api/mbl/campaigns`** — list all campaigns for agent with aggregate stats
**`GET /api/mbl/campaigns/:id`** — single campaign with all properties (for detail view)
**`DELETE /api/mbl/campaigns/:id`** — soft delete
**`GET /api/mbl/campaigns/:id/contacts`** — CSV export of skip-traced data

---

## Lob Template Setup

The HTML template at `lob-letter-template.html` must be uploaded to Lob once to create a template ID.

**POST `https://api.lob.com/v1/templates`**
```json
{
  "description": "Magic Buyer Letter - Warm + Personal",
  "html": "<full HTML from lob-letter-template.html>"
}
```

Response: `{ "id": "tmpl_abc123" }` — store this. Pass as `file` in every letter send.

**Merge variables in the template:**
- `{{buyer_name}}` — buyer's first name
- `{{neighborhood}}` — area/city name
- `{{property_address}}` — per-recipient property street address
- `{{bullet_1}}`, `{{bullet_2}}`, `{{bullet_3}}` — from buyer details step
- `{{agent_name}}`, `{{agent_phone}}`, `{{agent_brokerage}}`, `{{agent_initials}}`
- `{{agent_website}}`, `{{agent_headshot_url}}`, `{{agent_logo_url}}`

Template uses `img[src=""] { display: none }` for graceful degradation when headshot/logo are empty strings.

---

## Frontend → Backend Data Flow

### Screen 1: Dashboard
- `GET /api/mbl/campaigns` on mount
- Click row → `GET /api/mbl/campaigns/:id` for detail

### Screen 2: Settings (agent profile)
- `GET /api/mbl/agent` to pre-fill
- Upload headshot/logo → `supabase.storage.upload()` → get public URL
- Save → `POST /api/mbl/agent/setup`

### Screen 3: Smart Input + Buyer Details
- Frontend-only parsing (regex). No API calls.
- Produces: `{ buyerName, price, area, beds, baths, bullets[], extra?, details }`

### Screen 4: Pipeline Loading
- `POST /api/mbl/campaigns` triggers the 4-step pipeline
- Use SSE or polling to show progress: searching → skip_tracing → verifying → ready
- On completion, returns `{ campaignId, readyCount }`

### Screen 5: Letter Preview
- Frontend-only. Renders letter template with buyer + agent data.
- Template picker updates `templateId` in state.

### Screen 6: Audience (Map + List + Filters)
- `GET /api/mbl/campaigns/:id` returns all properties
- All filtering is frontend-only (filter by price, equity, years, neighborhood, zip, city, beds, baths, sqft, owner type)
- Map plots properties by lat/lng
- Click to select/deselect updates local state
- "Add property" manually → `POST /api/mbl/campaigns/:id/properties/add` (skip traces + verifies the new address)

### Screen 7: Send Confirmation
- Shows campaign summary, recipient breakdown, delivery specs, cost
- Confirm → `POST /api/mbl/campaigns/:id/send` with `selectedPropertyIds[]`
- Progress bar updates as letters are sent
- Success → show webhook tracking timeline, redirect to dashboard

---

## Rate Limits & Throttling

| Service | Endpoint | Limit | Our throttle |
|---|---|---|---|
| RealEstateAPI | PropertySearch | ~10/s | 1 call (paginate if needed) |
| RealEstateAPI | BulkSkipTrace | ~5/s | Batches of 50, 1s between |
| Lob | us_verifications | 300/5s | 200ms between (~250/5s) |
| Lob | letters (send) | 150/5s | 50ms between (~100/5s) |
| Anthropic | messages | 60/min | 10 concurrent max |

---

## Error Handling

Every pipeline step should be individually retryable. If step 3 (address verification) fails mid-batch, mark processed properties and resume from where it stopped.

**Lob-specific errors:**
- 422 on send = address issue or cancelled letter past window
- 429 = rate limited (back off and retry)
- 401 = bad API key

**RealEstateAPI errors:**
- 400 = bad search params
- 429 = rate limited
- 500 = service error (retry with exponential backoff)

Store errors per-property in the `status` field so the agent can see what failed and why.

---

## File Reference

| File | Purpose |
|---|---|
| `mbl-final.jsx` | Complete React prototype — every screen, interaction, state. Match this 1:1. |
| `mbl-integration.js` | Full backend stubs — copy the function signatures, API calls, and DB queries directly. |
| `lob-letter-template.html` | Production Lob template — upload to Lob as-is. |
| `lob-integration-spec-v2.md` | Every Lob field annotated with source. |

---

## Build Order

1. **Database** — Run schema SQL in Supabase
2. **Agent setup** — Settings page + `POST /api/mbl/agent/setup` (Lob address verification + persistent address)
3. **Campaign create** — `POST /api/mbl/campaigns` with the 3-step pipeline (search → skip trace → verify)
4. **Frontend: smart input + buyer details** — Parser + detail pickers
5. **Frontend: letter preview** — Template rendering with merge vars
6. **Frontend: audience map + list** — Property plotting, filters, selection
7. **Lob template** — Upload `lob-letter-template.html` to Lob, store template ID
8. **Send letters** — `POST /api/mbl/campaigns/:id/send` with Lob letter creation per recipient
9. **Webhooks** — `POST /api/webhooks/lob` handler + campaign count updates
10. **Dashboard** — Campaign list, detail view with delivery tracking, CRUD
11. **Billing** — Stripe integration (charge before Lob send)
