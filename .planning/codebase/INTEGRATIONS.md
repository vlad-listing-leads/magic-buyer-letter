# External Integrations

**Analysis Date:** 2025-03-21

## APIs & External Services

**Authentication & Identity:**
- Listing Leads SSO (cross-app JWT hub) - Primary auth provider
  - SDK/Client: jose (JWT verification)
  - Auth: `CROSS_APP_AUTH_SECRET` (shared HS256 secret, 60-second token expiry)
  - Flow: LL sends JWT → /api/auth/ll-callback → validates → creates local Supabase session
  - Profile sync: Fetches user data from LL database on every login

**Property Search & Skip Trace:**
- RealEstateAPI (REAPI) - Property search, owner lookup, skip trace
  - SDK/Client: Custom fetch wrapper (`src/lib/services/reapi.ts`)
  - Auth: `REAPI_KEY` + `REAPI_USER_ID` (headers: x-api-key, x-user-id)
  - Endpoints: /v2/PropertySearch (pagination via resultIndex), /v2/SkipTrace
  - Max results: 20 pages × 250 = 5,000 properties per search
  - Returns: Property details (beds, baths, sqft, value, ownership type), owner contact info

**Postal & Letter Printing:**
- Lob (address verification, letter template management, printing/mailing)
  - SDK/Client: Custom fetch wrapper (`src/lib/services/lob.ts`)
  - Auth: Basic auth (API key + colon, base64 encoded)
  - Endpoints:
    - `POST /v1/us_verifications` - Address validation (USPS-verified)
    - `POST /v1/addresses` - Create return address for agent
    - `POST /v1/letters` - Create letter (template merge, color, USPS first-class)
    - `DELETE /v1/letters/{id}` - Cancel letter
    - `POST /v1/templates` - Create HTML template
  - Webhook: Incoming POST to `/api/webhooks/lob`
    - Signature verification: HMAC-SHA256 (header: lob-signature)
    - Events: letter.created, letter.delivered, letter.returned_to_sender, etc.
    - Updates: mbl_properties.delivery_status, delivery_events array
  - Config: `LOB_API_KEY`, `LOB_WEBHOOK_SECRET`, `LOB_TEMPLATE_ID`

**AI / Letter Generation:**
- Anthropic Claude API - Personalize buyer letters
  - SDK/Client: Custom fetch wrapper (`src/lib/services/claude.ts`)
  - Model: claude-sonnet-4-20250514
  - Auth: `ANTHROPIC_API_KEY` (header: x-api-key)
  - Endpoint: `POST https://api.anthropic.com/v1/messages`
  - Request: system prompt (skill instructions) + user prompt (context), max_tokens: 1000
  - Response: Parsed JSON with body + optional ps (postscript)
  - Placeholders filled by app: {{property_address}}, {{neighborhood}}, {{buyer_name}}, {{agent_name}}, {{agent_phone}}, {{bullet_1}}, {{bullet_2}}, {{bullet_3}}

**Payments:**
- Stripe - Payment processing for letter campaigns
  - SDK/Client: stripe 20.4.1 (server), @stripe/stripe-js 8.10.0 (browser)
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Publishable key: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (browser)
  - Endpoints:
    - `POST /v1/checkout/sessions` - Create checkout session
    - `GET /v1/checkout/sessions/{id}` - Retrieve session status
  - Webhook: Incoming POST to `/api/webhooks/stripe`
    - Signature verification: stripe.webhooks.constructEvent()
    - Events: checkout.session.completed
    - Metadata: campaign_id, agent_id, letter_count
  - Session modes: payment (one-time)

## Data Storage

**Databases:**
- Supabase (PostgreSQL + Auth + RLS)
  - Project URL: `NEXT_PUBLIC_SUPABASE_URL`
  - Anon key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client, respects RLS)
  - Service role key: `SUPABASE_SERVICE_ROLE_KEY` (server, bypasses RLS)
  - Tables: users, mbl_agents, mbl_campaigns, mbl_properties, mbl_skills
  - Auth: Magic link OTP + session cookies
  - RLS policies: Role-based (admin, superadmin, user)
  - Migrations: `supabase/migrations/*.sql`

**Listing Leads (Read-Only):**
- Supabase project: `LISTING_LEADS_SUPABASE_URL`
- Service role key: `LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY` (server only, read-only in practice)
- Tables: profiles, profile_fields, profile_values (user metadata from hub)
- Purpose: Source of truth for agent profile data (name, phone, brokerage, logo, headshot, etc.)
- Client: `src/lib/supabase/listing-leads.ts` - createListingLeadsClient()

**File Storage:**
- Supabase Storage - Agent headshots and logos
  - Remote patterns configured: `**.supabase.co`, `**.supabase.in`
  - Referenced in CLAUDE.md but not explicitly used in observed code

**Image CDN:**
- ImageKit (ik.imagekit.io) - Listing Leads image serving
  - Remote pattern configured in Next.js (images.remotePatterns)

**Additional Storage:**
- Vercel Blob - Potential future use (remote pattern configured)
  - Remote pattern: `**.vercel-storage.com`

**Caching:**
- TanStack React Query - Client-side cache layer (in-memory, browser)
- No Redis or server-side caching detected

## Authentication & Identity

**Auth Provider:**
- Custom: Cross-app JWT + Supabase Auth
  - Primary: Listing Leads sends JWT → validated at /api/auth/ll-callback
  - Secondary: Supabase magic link OTP (email confirmation)
  - Session: Supabase session cookies (HttpOnly)
  - Refresh: Middleware updates session on every request
  - Expiry: Cross-app JWT expires in 60 seconds
  - Roles: admin, superadmin, user (from LL)

**Auth Endpoints:**
- `GET /api/auth/ll-callback?token=JWT` - LL SSO callback (creates/syncs user + agent)
- `GET /api/auth/callback?code=...&type=...` - Supabase OTP verification
- `GET /api/auth/me` - Current user profile endpoint
- `GET /api/auth/dev-login` - Dev-only auth bypass (if DEV_LOGIN_ENABLED=true)

**Session Management:**
- Cookies: Supabase sets auth.token, refresh_token
- Middleware: `src/middleware.ts` - Refreshes session on every request
- Server: `src/lib/supabase/server.ts` - requireAuth(), getAuthUser()
- Client: `src/lib/auth/jwt.ts` - verifyLLToken(), createLLToken()

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, or similar)

**Logs:**
- Pino (structured logging) - `src/lib/logger.ts`
  - PII redaction enabled for sensitive data
  - Log levels: info, warn, error
  - Context: request params, API responses, auth events

**Analytics:**
- None detected (no Posthog, Segment, or similar)

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js deployment)
- Production URL: https://magic-buyer-letter.listingleads.com
- Deployment: Git push only (NEVER use `vercel` CLI)

**CI Pipeline:**
- None detected (no GitHub Actions, Circle CI, etc.)
- Vercel auto-deploys on push to main

**Serverless Functions:**
- Vercel Functions (Next.js API Routes)
- Long-running function: POST /api/mbl/campaigns/[id]/pipeline (maxDuration: 300s)
  - Handles property search, skip trace, verification, letter generation

**Cron Jobs:**
- Not detected in current codebase

## Environment Configuration

**Required Env Vars (all sources):**

*Supabase (THIS app):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

*Listing Leads SSO:*
- CROSS_APP_AUTH_SECRET

*Listing Leads (Read-Only Database):*
- LISTING_LEADS_SUPABASE_URL
- LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY

*App URLs:*
- NEXT_PUBLIC_APP_URL (default: http://localhost:3010)
- NEXT_PUBLIC_LL_URL (default: https://listingleads.com)

*RealEstateAPI (Property Search):*
- REAPI_KEY
- REAPI_USER_ID

*Lob (Mail):*
- LOB_API_KEY
- LOB_WEBHOOK_SECRET
- LOB_TEMPLATE_ID

*Anthropic (Claude):*
- ANTHROPIC_API_KEY

*Stripe (Payments):*
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

*Development Only:*
- DEV_LOGIN_ENABLED (true/false)
- DEV_USER_EMAIL (default: dev@localhost.test)

**Secrets Location:**
- Development: `.env.local` (git-ignored)
- Production: Vercel Environment Variables dashboard
- Reference template: `.env.example`

## Webhooks & Callbacks

**Incoming Webhooks:**
- `POST /api/webhooks/lob` - Lob letter tracking (delivery status updates)
  - Signature: HMAC-SHA256 in header `lob-signature`
  - Body: JSON event with event_type.id, body.id (letter ID), tracking_events
  - Updates: mbl_properties.delivery_status, delivery_events array
  - Side effects: Recalculates campaign aggregate counts (properties_delivered, properties_returned)

- `POST /api/webhooks/stripe` - Stripe payment events
  - Signature: Verified via stripe.webhooks.constructEvent()
  - Body: JSON event
  - Handles: checkout.session.completed
  - Metadata: campaign_id, agent_id, letter_count
  - Side effects: Logs payment confirmation (actual campaign state change handled elsewhere)

**Outgoing Webhooks:**
- None configured in codebase (Stripe/Lob are data providers, not endpoints this app calls via webhook)

## Rate Limiting & Quotas

- RealEstateAPI: 250 results per batch, max 20 pages (5,000 property limit per search)
- Lob: No explicit rate limiting configured (depends on account tier)
- Stripe: Standard Stripe rate limits
- Claude: Standard Anthropic rate limits

## Data Flow Summary

1. **Login:** User → Listing Leads → JWT → /api/auth/ll-callback → Supabase session
2. **Campaign Setup:** Agent enters buyer criteria, letter style → React Query mutation
3. **Property Search:** Criteria → REAPI /v2/PropertySearch → paginated results → stored in mbl_properties
4. **Skip Trace:** Property addresses → REAPI /v2/SkipTrace → owner contact info
5. **Verification:** Addresses → Lob /v1/us_verifications → verified + Lob /v1/addresses (create return address)
6. **Generation:** Buyer context → Claude API → personalized letter body + PS
7. **Payment:** Agent → Stripe checkout → campaign status = paid
8. **Sending:** Verified addresses + letter → Lob /v1/letters → merge variables, print, mail
9. **Tracking:** Lob webhook → /api/webhooks/lob → delivery status updates → aggregate counts

---

*Integration audit: 2025-03-21*
