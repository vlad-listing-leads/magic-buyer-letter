# Listing Leads Satellite App Boilerplate

## Overview

This is the boilerplate template for building Listing Leads satellite applications. It provides the standard auth system (LL SSO via cross-app JWT), Supabase database, shadcn/ui components, and deployment config that all LL satellite apps share.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL with RLS) |
| Auth | Listing Leads SSO (cross-app JWT) → Supabase Auth |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide icons |
| State | TanStack React Query v5 |
| Validation | Zod |
| Logging | Pino (with PII redaction) |
| Deployment | Vercel (git push only, never vercel CLI) |

## Authentication Architecture

### How It Works

1. **Listing Leads is the auth hub** — all users log in there via MemberStack
2. **Satellite apps receive a JWT** signed with `CROSS_APP_AUTH_SECRET`
3. **JWT is validated** at `/api/auth/ll-callback` → creates local Supabase session
4. **Users are linked** across apps via `memberstack_id`

### Key Auth Files

- `src/lib/auth/jwt.ts` — JWT verification and creation
- `src/app/api/auth/ll-callback/route.ts` — SSO callback (validates JWT, creates user, establishes session)
- `src/app/api/auth/callback/route.ts` — Supabase OTP verification
- `src/app/api/auth/me/route.ts` — Current user profile endpoint
- `src/app/api/auth/dev-login/route.ts` — Development-only auth bypass
- `src/middleware.ts` — Session refresh + route protection

### Dev Auth Bypass

Set `DEV_LOGIN_ENABLED=true` in `.env.local` to enable `/api/auth/dev-login` in development.

## API Patterns

### Response Envelope (ALL routes must use this)

```typescript
{ success: boolean, data: T | null, error: string | null }
```

Use helpers: `apiSuccess(data, status)` / `apiError(message, status)`

### Route Handler Pattern

```typescript
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { validateRequest } from '@/lib/api/validation'
import { requireAuth } from '@/lib/supabase/server'

export const POST = withErrorHandler(async (request) => {
  const { data, error } = await validateRequest(request, mySchema)
  if (error) return error

  const user = await requireAuth()
  // ... business logic
  return apiSuccess(result, 201)
})
```

### Admin Routes

Use `withAdminGuard()` middleware — checks `role IN ('admin', 'superadmin')`.

## Supabase Clients

| Client | Purpose | When to Use |
|--------|---------|-------------|
| `createClient()` | Browser client (respects RLS) | Client components |
| `createServerSupabaseClient()` | Server client (respects RLS via cookies) | Server components, API routes |
| `createAdminClient()` | Service role (bypasses RLS) | Pipeline processing, admin ops |
| `createListingLeadsClient()` | READ-ONLY LL database | Fetching user profiles from LL |

**CRITICAL:** Never expose the admin client or LL service key to the browser.

## Listing Leads Profile Data

Read user profile from LL (source of truth) via `getListingLeadsProfile(memberstackId)`.

- Requires `LISTING_LEADS_SUPABASE_URL` and `LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY`
- Returns: name, email, region, role, custom profile fields
- Falls back to local user record if LL is unreachable

## Database

- Migrations in `supabase/migrations/`
- RLS enabled on all tables
- Use `is_admin()` function in RLS policies (handles both admin and superadmin)
- Auto-update `updated_at` via trigger

## Repository

- **Git**: https://github.com/vlad-listing-leads/magic-buyer-letter.git
- **GitHub account**: Always use `vlad-listing-leads` for all git operations (push, PR, etc.)

## Deployment

- **Production URL**: https://magic-buyer-letter.listingleads.com
- **NEVER use `vercel` CLI** — always `git push`
- Configure env vars in Vercel dashboard
- Port 3010 in development

## File Structure

```
src/
  app/
    (dashboard)/          # Authenticated pages (sidebar layout)
    auth/login/           # Login page (redirects to LL SSO)
    api/
      auth/               # SSO callback, session, dev-login
      health/             # Health check
  components/
    ui/                   # shadcn/ui components
    Navigation.tsx        # Sidebar nav
    ThemeProvider.tsx      # Dark mode
    QueryProvider.tsx      # TanStack Query
  hooks/
    useCurrentUser.ts     # Current user hook
    useApiFetch.ts        # Authenticated fetch wrapper
  lib/
    api/                  # Response envelope, validation, middleware
    auth/                 # JWT verification
    supabase/             # Client factories + LL read-only client
    logger.ts             # PII-redacting logger
    utils.ts              # cn(), formatDate()
  types/
    index.ts              # Shared types
```

## Supabase MCP

**NEVER connect MCP to any other Supabase project.** This project's MCP must only target `ejoaztszyxxxceeusbql.supabase.co` (the Magic Buyer Letter database). Do not run `/mcp` authenticated against a different project while working in this repo.

## Common Gotchas

1. **Team members have synthetic memberstack_ids**: `team_<admin_id>_<random8>` — no MemberStack account
2. **Always use `role IN ('admin', 'superadmin')`** — never just `role = 'admin'`
3. **Next.js 16 params are async**: `const { id } = await context.params`
4. **Never mutate objects** — always create new copies with spread operator
5. **Validate at boundaries** — use Zod schemas in all API routes
