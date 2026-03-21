# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** Layered Next.js 16 app with Auth → API → Data → UI separation, following Listing Leads satellite app conventions.

**Key Characteristics:**
- Server-side rendering with authenticated dashboard layout
- Three-tier data access: browser client (RLS) → server client (RLS via cookies) → admin client (service role)
- Next.js App Router with OAuth-style cross-app SSO callback flow
- Supabase for auth, database, and RLS policy enforcement
- TanStack Query for client-side caching and server state management
- Middleware-based session refresh and route protection
- Error-handled API routes with validation and middleware helpers

## Layers

**Middleware Layer:**
- Purpose: Session refresh, authentication checks, route protection
- Location: `src/middleware.ts`
- Contains: Public route detection, auth enforcement, session refresh integration
- Depends on: `lib/supabase/middleware` for `updateSession()`
- Used by: Next.js runtime (automatic per-request)

**API Routes Layer:**
- Purpose: HTTP endpoints for campaigns, users, agents, webhooks, integrations
- Location: `src/app/api/`
- Contains: RESTful route handlers using Next.js `route.ts` conventions
- Depends on: `lib/api/*` (middleware, response, validation), `lib/supabase/*` (clients), `lib/services/*` (external APIs)
- Used by: Client components via `useApiFetch()` hook

**Server Layer:**
- Purpose: Database clients, auth verification, server-only operations
- Location: `src/lib/supabase/*`
- Contains: `server.ts` (Supabase clients), `client.ts` (browser client), `listing-leads.ts` (LL profile fetch), `middleware.ts` (session refresh)
- Depends on: Supabase JS SDK, Next.js cookies
- Used by: Middleware, API routes, server components

**Service Layer:**
- Purpose: External integrations with type-safe abstractions
- Location: `src/lib/services/`
- Contains: Claude (letter generation), REAPI (property search), Lob (mail), Stripe (payments)
- Depends on: Environment variables, logger
- Used by: API routes for business logic

**Component Layer:**
- Purpose: UI rendering, client-side state management
- Location: `src/components/`
- Contains: shadcn/ui reusables, MBL-specific wizards, forms, visualizations
- Depends on: React, Next.js, TanStack Query, Lucide icons, Tailwind
- Used by: Pages and layouts

**Hook Layer:**
- Purpose: Client-side data fetching, auth state, API integration
- Location: `src/hooks/`
- Contains: `useCurrentUser` (TanStack Query + `/api/auth/me`), `useApiFetch` (authenticated fetch wrapper), mobile-aware hooks
- Depends on: TanStack Query, browser Supabase client
- Used by: Client components for data and auth

## Data Flow

**Authentication Flow:**

1. User redirected to Listing Leads SSO (external)
2. LL sends JWT to `/api/auth/ll-callback?token=...`
3. Route validates JWT, creates/syncs user in Supabase Auth + users table
4. Fetches LL profile data via `getListingLeadsProfile(memberstackId)`, syncs to `mbl_agents` table
5. Generates magic link OTP, verifies it, establishes session cookies
6. Redirects to dashboard (authenticated)

**Campaign Creation Flow:**

1. User enters buyer criteria in wizard (`/new` page)
2. POST to `/api/mbl/campaigns` with `campaignCreateSchema`
3. API creates campaign record (status: 'searching'), returns campaign ID
4. Client polls `/api/mbl/campaigns/[id]/pipeline` for SSE updates
5. Pipeline async: search properties → skip trace → verify addresses → generate letters
6. User selects properties to send in audience filter step
7. POST `/api/mbl/campaigns/[id]/generate` to generate letters for selected only
8. User reviews, then POST `/api/mbl/campaigns/[id]/send-confirmed` to create Lob letters
9. Stripe checkout for payment (or mark as paid if admin)
10. POST confirmed → Lob sends actual mail, campaign status updates to 'sent'

**Property Search to Delivery:**

1. Campaign criteria → REAPI PropertySearch (via `src/lib/services/reapi.ts`)
2. Results → `mbl_properties` table with status 'found'
3. Skip trace: fetch contact info (phone/email), status → 'skip_traced'
4. Verify: Lob address verification → `address_verified: true`, status → 'verified'
5. Generate: Claude AI → personalized letter content per skill, status → 'generated'
6. Send: Lob letter creation (PDF + mail), status → 'sent'
7. Track: Lob webhooks → delivery status updates, events array

**State Management:**

- **Server State:** Supabase tables (users, campaigns, properties, agents, skills) with RLS policies
- **Session State:** Supabase auth cookies (via SSR client), refreshed per-request by middleware
- **Client Cache:** TanStack Query with 5-minute staleTime, refetch on window focus
- **UI State:** React component state (current step, selections, form inputs)
- **Real-time:** Polling and SSE (Server-Sent Events) from `/api/mbl/campaigns/[id]/pipeline`

## Key Abstractions

**Supabase Clients (Factory Pattern):**
- Purpose: Isolate data access with proper permission levels
- Examples: `createServerSupabaseClient()`, `createAdminClient()`, `createClient()` (browser)
- Pattern: Factory functions return configured clients scoped to auth context

**API Response Envelope:**
- Purpose: Consistent error handling and success responses
- Examples: `apiSuccess(data, status)`, `apiError(message, status)`
- Pattern: All routes return `{ success: boolean, data: T | null, error: string | null }`

**Validation Schema (Zod):**
- Purpose: Type-safe request parsing with clear error messages
- Examples: `campaignCreateSchema`, `agentSetupSchema`
- Pattern: Define schema, use `safeParse()`, return validation error or proceed

**Route Middleware Wrappers:**
- Purpose: Cross-cutting concerns (auth, error handling, admin checks)
- Examples: `withErrorHandler()`, `withAdminGuard()`
- Pattern: Higher-order function wrapping handler, executes before business logic

**Logging (PII Redaction):**
- Purpose: Production-safe observability without exposing personal data
- Examples: Email/phone/name/address auto-redacted, named context loggers
- Pattern: `createLogger('context')` returns scoped logger with redaction applied

## Entry Points

**Web App Entry:**
- Location: `src/app/layout.tsx` (root layout with providers)
- Triggers: Browser navigation
- Responsibilities: Global theme, query provider, layout wrapping

**Dashboard Entry:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Authenticated users accessing any `/(dashboard)/*` route
- Responsibilities: Sidebar nav, user dropdown, theme toggle, layout structure

**API Entry (Auth):**
- Location: `src/app/api/auth/ll-callback/route.ts`
- Triggers: Redirect from Listing Leads with `token=...` query param
- Responsibilities: JWT validation, user creation/sync, LL profile fetch, session establishment

**Campaign Wizard Entry:**
- Location: `src/app/(dashboard)/new/page.tsx`
- Triggers: User clicks "New Campaign" button
- Responsibilities: Multi-step wizard orchestration (input → profile → generating → audience → preview → review → confirmation)

**API Webhook Entries:**
- Location: `src/app/api/webhooks/lob/route.ts`, `src/app/api/webhooks/stripe/route.ts`
- Triggers: External services (Lob, Stripe) post events
- Responsibilities: Validate webhook signature, update database state (delivery status, payment), log events

## Error Handling

**Strategy:** Fail fast with clear messages, log detailed context server-side, expose user-friendly errors client-side.

**Patterns:**
- API routes: Try/catch wraps handler, `withErrorHandler()` middleware catches unhandled errors → 500 response
- Request validation: Zod schema failures → 400 with field-level error messages
- Auth errors: `requireAuth()` throws "Unauthorized" → caught → 401 response
- External APIs: Timeout/rate-limit errors logged with context, user sees generic message
- Database errors: RLS policy violations caught, logged, hidden from client (returns 400/403/500)

## Cross-Cutting Concerns

**Logging:**
- Framework: Pino (JSON structured logs, PII redaction)
- Pattern: `createLogger('context')` for each module, auto-redacts email/phone/address/names
- Used by: All API routes, services, auth flows

**Validation:**
- Framework: Zod schema library
- Pattern: Define schema at API route top, parse/safeParse, return validation error or proceed
- Used by: Campaign creation, agent setup, skill management

**Authentication:**
- Framework: Supabase Auth with Listing Leads cross-app JWT
- Pattern: JWT → session cookies → middleware refresh per-request → `requireAuth()` in protected routes
- Used by: All authenticated pages and API routes

**Authorization:**
- Pattern: `is_admin()` function in Supabase RLS policies (handles both admin and superadmin roles)
- Pattern: `withAdminGuard()` middleware wrapper for admin-only API routes
- Used by: Admin pages, admin API routes, leaderboard

---

*Architecture analysis: 2026-03-21*
