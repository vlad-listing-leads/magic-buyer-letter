# Magic Buyer Letters — Full App Flow

> Structure only. No design/color details.

---

## Screen 1: Dashboard (Campaign List)

**Route:** `/` (main dashboard)

### Layout
- Page title: "Magic Buyer Letters"
- Subtitle: "Your campaigns and delivery tracking"
- Primary CTA: "+ New Letter" button (top right)

### Stats Row (4 cards)
- Campaigns (count)
- Letters sent (count)
- Delivered (count)
- Total spend ($)

### Campaign Table
Tabs to filter: **All (N)** | Delivered | Sent | Sending

Columns per row:
- Buyer (name + relative date, e.g. "3d ago")
- Area
- Template name
- Sent (count)
- Delivered (count)
- Returned (count, highlighted if > 0)
- Status badge (Delivered / Sending / Sent)
- Cost ($)
- Chevron → navigates to Campaign Detail

---

## Screen 2: Campaign Detail

**Route:** `/campaigns/:id`

### Header
- Back link: "← All campaigns"
- Title: `[Buyer Name] · [Area]`
- Subtitle: `[Price range] · [Template] · [Date]`
- Action buttons: **Duplicate** | **Export CSV** | **Delete**

### Stats Row (5 cards)
- Sent
- Delivered
- In transit
- Returned
- Cost

### Delivery Pipeline (visual flow)
```
Printed → In transit → Delivered → Returned
  (N)         (N)          (N)         (N)
```

### Tabs

#### Recipients (N)
List of recipients. Each row:
- Owner name
- Address (street, city, ZIP)
- Home value · beds/baths · sq ft · equity % · years owned
- Owner type badge (Owner / Absentee)
- Delivery status badge

#### Delivery Tracking
Table columns: Owner | Address | Status | Lob ID | Expected Delivery

#### Lob Details
Metadata panel with key/value pairs:
- Template ID
- Mail type
- Color (true/false)
- Double-sided (true/false)
- Address placement
- Envelope
- Cancellation window
- Webhook events (count registered)
- Webhook history (last 5 events, format: `event.name · ltr_id · date`)

---

## New Letter Wizard

Initiated from "+ New Letter" on the dashboard.

---

### Step 1 — Natural Language Input

**Route:** `/new`

- Back link: "← Dashboard"
- Page title: "New Magic Buyer Letter"
- Large single-line text input with:
  - Mic/voice icon (inline, inside input)
  - "Next" button (inline, inside input)
  - Placeholder/example: `Sarah, $400-600K, 3 bed 2 bath, Newton, pre-approved`
- Below input — live parsed fields panel "Include these for best results:":
  - Buyer name * (required)
  - Price range * (required)
  - Area or ZIP * (required)
  - Beds / baths (optional)
- Voice button (bottom center, alternative input method)

---

### Step 2 — Buyer Profile

**Route:** `/new/profile`

- Back link: "← Back"
- Page title: "New Magic Buyer Letter"
- Parsed input shown as dismissible pill tags: `[Name]` `[$range]` `[Xbd/Yba]` `[Area]` `[Financing]`
- Primary CTA: "Generate Letters →" (top right)

#### Form Card: "What should the letter say about [Buyer]?"
Subtitle: "These become the bullet points in your letter."

**Financing** (single-select):
Pre-approved | Cash buyer | FHA | VA | Conventional

**Closing flexibility** (single-select):
Flexible | Quick close (21 days) | 30 days | No rush | Open to rent-back

**Property condition tolerance** (single-select):
Minor updates OK | As-is / no repairs | Move-in ready only | Major reno OK

**Anything else?** (optional free text)
- Placeholder: "e.g. relocating from NYC, first-time buyer, growing family"

#### Live Preview Panel: "Letter will say:"
Dynamically generated bullet points based on selections, e.g.:
- Pre-approved up to $400K–$600K
- Flexible on closing — whatever works best for you
- Comfortable with homes needing minor updates

---

### Step 3 — Generation (Loading)

**Route:** `/new/generating`

- Full-screen centered loading state
- Animated envelope/mail icon
- Heading: "Finding homeowners for [Buyer]"
- Estimated time: "~30 seconds"
- Step-by-step progress checklist (items complete sequentially):
  1. Searching off-market properties
  2. Skip-tracing owners
  3. Verifying addresses with Lob
  4. Writing personalized letters

---

### Step 4 — Letter Preview

**Route:** `/new/preview`

- Back link: "← Back"
- Title: "Preview what [Buyer]'s homeowners will receive"
- Subtitle: "Envelope front + letter page 1"
- Primary CTA: "Choose audience →" (top right)

#### Template Selector (tabs)
Warm + Personal | Straight to the Point | Luxury

#### Two-column preview layout

**Left — Envelope front:**
- Rendered envelope with:
  - From: Agent name, brokerage, address
  - To: Recipient name, address (sample)
  - USPS First Class stamp
  - Address barcode
- Envelope type selector:
  - Standard #10 (Free)
  - Custom branded (Enterprise tier)

**Right — Letter page 1:**
- Header image (neighborhood illustration)
- Personalized opening line: `"Your home at {{ address }} is one of the only properties that my clients, [Buyer], would seriously consider buying in [Area]."`
- Body copy (2–3 paragraphs)
- Buyer info callout box titled "Here's what to know about [Buyer]:" — checkmarked bullet list from Step 2
- Closing paragraph
- Agent phone number
- Agent signature block (name, brokerage, phone, website)
- P.S. line (e.g., "Free home value report — no obligation.")
- Footer: "If listed with a broker, please disregard."

---

### Step 5 — Audience Selection

**Route:** `/new/audience`

- Back link: "← Back to letter"
- Title: "[N] sendable homeowners"
- Subtitle: `[Area] · [Price range] · [N of M shown] · Addresses verified`
- Selection counter: "[N] of [N] selected" + **All** / **Clear** links
- Primary CTA: "Send [N] Letters →" (top right)
- Controls: "+ Add property" button | Map/List toggle | Filters button

#### Map View
- Interactive map of the target area
- Amber/filled pins = selected properties
- Gray/empty pins = excluded properties (failed filters)

#### List View
Each row:
- Checkbox (checked = included)
- Owner name
- Address (street, city, ZIP)
- Home value · beds/baths · sq ft · equity % · years owned
- Owner type badge: Owner | Absentee

#### Filters Panel (slide-in)
**Location:**
- City filter (chips with counts)
- Neighborhoods (chips with counts + All/None toggle)
- ZIP codes (chips with counts + All/None toggle)

**Property:**
- Est. value ($K): min–max range input
- Years owned: Any / 3+ / 5+ / 10+ / 20+
- Bedrooms: Any / 2+ / 3+ / 4+
- Bathrooms: Any / 1+ / 2+ / 3+
- Sq ft: min–max range input
- Equity %: Any / 20%+ / 40%+ / 60%+

**Owner type (toggles):**
- Absentee
- Owner-occupied
- Investors

Footer: "[N] match" count + "Apply & select all" button | "Reset to defaults" link

---

### Step 6 — Review & Send

**Route:** `/new/review`

- Back link: "← Back to audience"
- Title: "Review & send [N] letters"
- Subtitle: "For [Buyer] in [Area]"

#### Campaign Summary (panel)
| Field | Value |
|---|---|
| Buyer | [Name] |
| Area | [Area] |
| Price range | [Range] |
| Template | [Template name] |
| Recipients | [N] homeowners |
| Addresses | Verified via Lob |

#### Recipient Breakdown (panel)
| | |
|---|---|
| [Total] | Properties searched (RealEstateAPI PropertySearch) |
| –[N] | DNC removed (National Do Not Contact registry) |
| –[N] | Undeliverable (Failed Lob address verification) |
| **[N]** | **Selected by you (after your filters)** |

#### Delivery Specs (panel)
| Field | Value |
|---|---|
| Mail type | USPS First Class |
| Envelope | Standard #10 |
| Paper | 8.5×11, color |
| Address placement | Top of first page |
| Expected delivery | [date range] |
| Cancel window | 4 hours |

#### Letter Opening Preview (panel)
- Shows personalized first sentence with real recipient address merged in
- Note: "Each letter personalizes the property address via merge variable"

#### Cost Summary
```
[N] letters × $[per-letter price]    $[subtotal]
─────────────────────────────────────────────────
Total                                $[total]
```

- Primary CTA: "Confirm & Send — $[total]" (full-width button)
- Fine print: "Lob prints + USPS delivers · You can cancel within 4 hours from your dashboard"

---

### Step 7 — Confirmation

**Route:** `/new/success`

- Success icon (checkmark)
- Heading: "[N] letters queued with Lob"
- Expected delivery: [date range]
- Cancellation reminder: "You can cancel any letter within 4 hours from your dashboard."

#### Tracking Timeline
Step-by-step delivery lifecycle:
| Event | Webhook event | Timing |
|---|---|---|
| Lob receives the request | `letter.created` | Now |
| PDF rendered for print | `letter.rendered_pdf` | ~2 min |
| Picked up by USPS | `letter.in_transit` | ~1 business day |
| Confirmed delivered | `letter.delivered` | 3–5 business days |

- CTA: "Back to Dashboard" button

---

## Flow Summary

```
Dashboard
  │
  ├── Click campaign row → Campaign Detail
  │     ├── Tab: Recipients
  │     ├── Tab: Delivery Tracking
  │     └── Tab: Lob Details
  │
  └── Click "+ New Letter" → New Letter Wizard
        │
        ├── Step 1: Natural language input → Next
        ├── Step 2: Buyer profile form → Generate Letters
        ├── Step 3: Generation loading (auto-advance)
        ├── Step 4: Letter preview → Choose audience
        ├── Step 5: Audience selection → Send N Letters
        ├── Step 6: Review & send → Confirm & Send
        └── Step 7: Confirmation → Back to Dashboard
```
