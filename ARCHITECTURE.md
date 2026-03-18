# Listing Leads Satellite App Boilerplate — Architecture Specification

## Cross-Project Analysis Report

### Projects Analyzed

| Project | Framework | Auth Method | Database | UI Library | Deployment |
|---------|-----------|-------------|----------|------------|------------|
| **Listing Leads 2.0** | Next.js 16 (App Router) | MemberStack (primary) + Supabase Auth | Supabase PostgreSQL | shadcn/ui + Tailwind 4 | Vercel |
| **Marketing Machine** | Vite + React 19 | Cross-app JWT from LL | Supabase PostgreSQL | shadcn/ui + Tailwind 4 | Vercel |
| **ZMA Tool** | Next.js 16 (App Router) | Cross-app JWT from LL → Supabase Auth | Supabase PostgreSQL | shadcn/ui + Tailwind 4 | Vercel |
| **Prompt Editor** | Next.js 16 (App Router) | MemberStack SDK + Supabase Auth | Supabase PostgreSQL | shadcn/ui + Tailwind 4 | Vercel |

---

## Shared Authentication Architecture

### Hub-and-Spoke SSO Model

```
┌──────────────────────────────────────────────────────┐
│                  LISTING LEADS (HUB)                  │
│                 listingleads.com                      │
│                                                      │
│  MemberStack (user accounts, plans, billing)         │
│  Supabase Auth (sessions, profiles)                  │
│                                                      │
│  Endpoints:                                          │
│  ├─ GET /api/auth/cross-app-token → Generate JWT     │
│  └─ GET /api/auth/sso-redirect   → Validate return   │
└──────────────┬───────────────┬───────────────┬───────┘
               │               │               │
     JWT Token │     JWT Token │     JWT Token │
               │               │               │
    ┌──────────▼──┐  ┌────────▼────┐  ┌───────▼──────┐
    │  ZMA Tool   │  │  Marketing  │  │   Prompt     │
    │  zma.ll.com │  │  Machine    │  │   Editor     │
    │             │  │  mktg.ll.com│  │   pe.ll.com  │
    └─────────────┘  └─────────────┘  └──────────────┘
         ▲                 ▲                 ▲
         │                 │                 │
    All validate JWT with CROSS_APP_AUTH_SECRET
    All create local Supabase session
    All link users via memberstack_id
```

### JWT Token Flow (All Satellite Apps)

```
1. User clicks link to satellite app in Listing Leads UI
2. LL generates JWT: { memberstackId, email, role, name, timestamp }
   - Signed with CROSS_APP_AUTH_SECRET (HS256)
   - Expires in 60 seconds
3. User redirected to satellite: https://satellite.app/auth/ll-callback?token=JWT
4. Satellite validates JWT signature + expiration
5. Satellite creates/syncs local Supabase user
6. Satellite establishes session (magic link OTP or cookie)
7. User lands on dashboard, fully authenticated
```

### User Identity Linking

All apps share the same user identity via `memberstack_id`:

```
Listing Leads:  profiles.memberstack_id = "mem_xxxxx"
ZMA Tool:       users.memberstack_id    = "mem_xxxxx"
Marketing:      users table (by email)
Prompt Editor:  profiles.memberstack_id = "mem_xxxxx"
```

For team members (no MemberStack account):
```
Synthetic ID: "team_<admin_memberstack_id>_<random8hex>"
Access inherited from team manager's subscription
```

---

## Common Technical Patterns

### 1. Supabase Client Factory

All projects use a dual-client pattern:

```typescript
// User-scoped (respects RLS)
createServerSupabaseClient()  // or createClient() for browser

// Admin/service (bypasses RLS)
createAdminClient()           // or createServiceClient()
```

### 2. API Response Envelope

```typescript
// ZMA Tool pattern (cleanest)
{ success: boolean, data: T | null, error: string | null }

// Listing Leads pattern
{ data: T } | { error: string }

// Shared helpers
apiSuccess(data, status)
apiError(message, status)
```

### 3. Middleware Pattern

All apps use Next.js middleware for:
1. Supabase session refresh on every request
2. Auth redirect (unauthenticated → login page)
3. API routes return JSON 401 (not redirect)
4. Public routes whitelist

### 4. Environment Variables (Common)

```env
# Supabase (per-app database)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cross-app auth (shared secret with Listing Leads)
CROSS_APP_AUTH_SECRET=

# Listing Leads profile data (read-only access)
LISTING_LEADS_SUPABASE_URL=
LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY=

# AI (most apps use Claude)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

### 5. UI Component Library

All projects converge on:
- **shadcn/ui** (Radix UI primitives + Tailwind styling)
- **Tailwind CSS v4** with CSS variables for theming
- **Lucide React** for icons
- **Dark mode** via next-themes
- Common components: Button, Card, Input, Dialog, Select, Badge, Alert

### 6. Validation

- **Zod** for runtime schema validation at API boundaries
- `validateRequest(request, schema)` helper pattern
- Fail fast with descriptive errors

### 7. Role System

```typescript
type Role = 'user' | 'admin' | 'superadmin'

// Common patterns:
// - Admin check: role IN ('admin', 'superadmin')
// - Middleware-level route protection for /admin/*
// - RLS policies enforce row-level access
```

### 8. Listing Leads Profile Fetching

Satellite apps read user profile data from LL's Supabase (read-only):

```typescript
// Read-only client — intentionally blocks writes
const llClient = createListingLeadsClient()

// Fetch profile by memberstack_id
const profile = await getListingLeadsProfile(memberstackId)
// Returns: name, email, region, plan, agent info, headshot, etc.

// Fallback: use locally cached data if LL is unreachable
```

---

## Boilerplate Design Decisions

### Why Next.js App Router (not Vite)?
- 3/4 projects use Next.js App Router
- Server components reduce client bundle
- API routes colocated (no separate backend)
- Middleware for auth is cleaner
- Vercel-optimized deployment

### Why Supabase Auth (not direct MemberStack)?
- MemberStack stays on the hub (Listing Leads)
- Satellite apps need their own sessions
- Supabase Auth provides: magic links, cookies, RLS integration
- JWT from LL → local Supabase session = best of both worlds

### Why TanStack React Query?
- 2/4 projects already use it (LL, ZMA)
- Handles caching, stale-while-revalidate, mutations
- Consistent data fetching pattern
- Better than raw useEffect + fetch

### What This Boilerplate Provides

1. **Auth system** — LL SSO callback, JWT validation, Supabase session, dev bypass
2. **Database setup** — Supabase client factory, RLS-ready migration template
3. **API patterns** — Response envelope, validation middleware, error handling
4. **UI foundation** — shadcn/ui, dark mode, navigation, auth-gated layout
5. **LL integration** — Read-only LL profile client, memberstack_id linking
6. **Dev experience** — Dev login bypass, type-safe env vars, proper logging
7. **Deployment** — Vercel config, env var checklist

### What This Boilerplate Does NOT Provide

- Business logic (each app is unique)
- MemberStack SDK (that's LL hub only)
- Team member management (LL handles that)
- Billing/payments (MemberStack + Stripe on LL)
- Specific AI integrations (varies per app)
