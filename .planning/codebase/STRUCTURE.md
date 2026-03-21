# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
/Users/vlad/Code/Magic Buyer Letter/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Authenticated dashboard routes
│   │   │   ├── admin/                # Admin pages
│   │   │   ├── campaigns/            # Campaign view/edit pages
│   │   │   ├── new/                  # Multi-step campaign wizard
│   │   │   ├── settings/             # User settings
│   │   │   └── layout.tsx            # Dashboard layout (sidebar, header)
│   │   ├── auth/
│   │   │   └── login/                # Login page (redirects to LL SSO)
│   │   ├── api/
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── admin/                # Admin CRUD endpoints
│   │   │   ├── user/                 # User profile endpoints
│   │   │   ├── mbl/                  # Magic Buyer Letter endpoints
│   │   │   ├── webhooks/             # Lob + Stripe webhook handlers
│   │   │   └── health/               # Health check
│   │   ├── globals.css               # Global Tailwind styles
│   │   └── layout.tsx                # Root layout (providers)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui reusable components
│   │   ├── mbl/                      # Domain-specific MBL components
│   │   ├── Navigation.tsx            # Sidebar nav component
│   │   ├── PageHeader.tsx            # Page header wrapper
│   │   ├── QueryProvider.tsx         # TanStack Query provider
│   │   └── ThemeProvider.tsx         # Next-themes dark mode provider
│   ├── hooks/
│   │   ├── useCurrentUser.ts         # Fetch current auth user
│   │   ├── useApiFetch.ts            # Authenticated fetch wrapper
│   │   └── use-mobile.tsx            # Mobile breakpoint detection
│   ├── lib/
│   │   ├── api/
│   │   │   ├── middleware.ts         # withErrorHandler, withAdminGuard
│   │   │   ├── response.ts           # apiSuccess, apiError
│   │   │   └── validation.ts         # validateRequest helper
│   │   ├── supabase/
│   │   │   ├── server.ts             # createServerSupabaseClient, createAdminClient
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── listing-leads.ts      # getListingLeadsProfile
│   │   │   └── middleware.ts         # updateSession for middleware.ts
│   │   ├── services/
│   │   │   ├── claude.ts             # Letter generation via Anthropic API
│   │   │   ├── reapi.ts              # Property search via RealEstateAPI
│   │   │   ├── lob.ts                # Postal mail via Lob
│   │   │   └── stripe.ts             # Payment processing
│   │   ├── auth/
│   │   │   └── jwt.ts                # JWT verification/creation
│   │   ├── env.ts                    # Type-safe environment variables
│   │   ├── logger.ts                 # PII-redacting Pino logger
│   │   ├── utils.ts                  # cn() (clsx + tailwind-merge)
│   │   ├── templates.ts              # Letter template content
│   │   ├── bullets.ts                # Buyer criteria phrase generation
│   │   └── city-zips.ts              # City/zip mapping utility
│   ├── types/
│   │   └── index.ts                  # All shared TypeScript types
│   ├── test/
│   │   └── setup.ts                  # Vitest configuration
│   └── middleware.ts                 # Next.js middleware (auth + session refresh)
├── supabase/
│   └── migrations/                   # Database schema migration files
├── public/
│   └── favicons/                     # Favicon images
├── .planning/
│   └── codebase/                     # GSD codebase analysis docs
├── docs/
│   └── [documentation files]         # Project documentation
├── tasks/
│   └── [task tracking]               # Project task files
├── package.json                      # Dependencies and build scripts
├── tsconfig.json                     # TypeScript configuration
├── next.config.ts                    # Next.js configuration
├── vitest.config.ts                  # Vitest test runner config
├── tailwind.config.ts                # Tailwind CSS configuration
├── postcss.config.mjs                # PostCSS configuration
├── vercel.json                       # Vercel deployment config
└── .env.example                      # Example environment variables
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router routes and layouts
- Contains: Page components, API routes, global layout
- Key files: `layout.tsx` (root), `(dashboard)/layout.tsx` (dashboard), all `page.tsx` and `route.ts` files

**`src/app/(dashboard)/`:**
- Purpose: Authenticated user dashboard and feature pages
- Contains: Multi-step wizard for campaign creation, campaign view/management, admin pages, settings
- Key files: `new/page.tsx` (campaign wizard), `campaigns/[id]/page.tsx` (campaign detail)

**`src/app/api/`:**
- Purpose: RESTful API endpoints
- Contains: Campaign CRUD, property search, letter generation, payment, webhooks
- Key files: `mbl/campaigns/route.ts` (list/create), `mbl/campaigns/[id]/pipeline/route.ts` (SSE), `auth/ll-callback/route.ts` (OAuth)

**`src/components/ui/`:**
- Purpose: Reusable UI component primitives from shadcn/ui
- Contains: Button, Input, Card, Dropdown, Sidebar, Tooltip, etc.
- Key files: All are generated from shadcn (do not edit directly)

**`src/components/mbl/`:**
- Purpose: Domain-specific components for Magic Buyer Letter feature
- Contains: Campaign wizard steps, letter preview, property map, audience filters, PDF export
- Key files: `SmartInput.tsx` (buyer criteria input), `LetterPreviewWizard.tsx` (preview flow), `PropertyMap.tsx` (Leaflet map)

**`src/hooks/`:**
- Purpose: React hooks for data fetching and auth
- Contains: Query hooks, fetch wrappers, responsive hooks
- Key files: `useCurrentUser.ts` (auth user), `useApiFetch.ts` (authenticated requests)

**`src/lib/api/`:**
- Purpose: API route helpers and middleware
- Contains: Request validation, response envelope, error handling, admin guard
- Key files: `middleware.ts` (withErrorHandler, withAdminGuard), `response.ts` (apiSuccess, apiError), `validation.ts` (validateRequest)

**`src/lib/supabase/`:**
- Purpose: Database and auth client factories
- Contains: Server client (RLS via cookies), admin client (service role), browser client (RLS anon key), LL profile client
- Key files: `server.ts` (createServerSupabaseClient, requireAuth), `client.ts` (browser), `listing-leads.ts` (LL profile fetch)

**`src/lib/services/`:**
- Purpose: External API integrations
- Contains: Claude (letter generation), REAPI (property search), Lob (postal mail), Stripe (payments)
- Key files: `claude.ts` (generateLetterForSkill), `reapi.ts` (searchProperties, skipTrace), `lob.ts` (verify, sendLetter)

**`src/lib/auth/`:**
- Purpose: JWT verification for cross-app authentication
- Contains: JWT parsing, validation, token creation
- Key files: `jwt.ts` (verifyLLToken, createLLToken)

**`src/types/`:**
- Purpose: All shared TypeScript types
- Contains: User, Campaign, Property, Agent, API response types, enums
- Key files: `index.ts` (all types)

**`src/test/`:**
- Purpose: Test utilities and setup
- Contains: Vitest configuration, test helpers
- Key files: `setup.ts` (test environment setup)

**`supabase/migrations/`:**
- Purpose: Database schema versions
- Contains: SQL migration files (incrementally applied)
- Key files: `*.sql` files (one per schema change)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with ThemeProvider, QueryProvider
- `src/app/(dashboard)/layout.tsx`: Dashboard layout with sidebar and header
- `src/app/(dashboard)/new/page.tsx`: Campaign creation wizard entry point
- `src/middleware.ts`: Next.js middleware (auth + session refresh)

**Configuration:**
- `src/lib/env.ts`: Type-safe environment variable access (per CLAUDE.md)
- `next.config.ts`: Next.js config (image remotePatterns for Supabase, ImageKit, Vercel Blob)
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `vitest.config.ts`: Test runner configuration

**Core Logic:**
- `src/lib/api/middleware.ts`: Error handling and admin guard for API routes
- `src/lib/api/response.ts`: Standard API response envelope
- `src/lib/api/validation.ts`: Request body validation helper
- `src/lib/supabase/server.ts`: Server-side Supabase clients and auth functions
- `src/lib/services/claude.ts`: Letter generation prompt building and API calls
- `src/lib/services/reapi.ts`: Property search and skip trace

**Authentication:**
- `src/app/api/auth/ll-callback/route.ts`: Listing Leads SSO callback (creates user, fetches LL profile, establishes session)
- `src/app/api/auth/me/route.ts`: Current user endpoint (returns authenticated user profile)
- `src/app/api/auth/dev-login/route.ts`: Development-only auth bypass (checks DEV_LOGIN_ENABLED env var)
- `src/lib/auth/jwt.ts`: JWT verification for cross-app tokens

**Testing:**
- `src/test/setup.ts`: Vitest setup file
- (No existing test files in src; framework supports writing .test.ts/.spec.ts)

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase, e.g., `UserProfile.tsx`, `SmartInput.tsx`
- Utilities: camelCase, e.g., `env.ts`, `logger.ts`
- Tests: `.test.ts` or `.spec.ts` suffix (co-located with source)
- Type files: `index.ts` in domain folders; top-level `src/types/index.ts` for shared types

**Directories:**
- Feature folders: lowercase, e.g., `campaigns`, `admin`, `mbl`
- Domain-specific groups: feature/domain first, then type, e.g., `components/mbl/` not `components/wizards/`
- API routes: RESTful structure, e.g., `api/mbl/campaigns/[id]/generate`

**Functions:**
- Hooks: `use*` prefix, e.g., `useCurrentUser`, `useApiFetch`
- Server functions: describe action, e.g., `createServerSupabaseClient`, `requireAuth`, `getListingLeadsProfile`
- Middleware: `with*` prefix, e.g., `withErrorHandler`, `withAdminGuard`
- Helpers: descriptive camelCase, e.g., `generateBullets`, `fillTemplate`

**Exported Variables:**
- Constants: SCREAMING_SNAKE_CASE, e.g., `PUBLIC_ROUTES`, `STEP_ORDER`
- Config objects: camelCase, e.g., `campaignCreateSchema`, `env`
- Logger instances: lowercase, e.g., `logger`

## Where to Add New Code

**New Feature (e.g., "bulk exports"):**
- Primary code: `src/app/(dashboard)/exports/` (new feature route)
- API routes: `src/app/api/mbl/exports/route.ts` (CRUD endpoints)
- Components: `src/components/mbl/ExportForm.tsx` (wizard step)
- Services: `src/lib/services/export.ts` if integrating external API
- Hooks: `src/hooks/useExportProgress.ts` if fetching/polling data
- Types: Add to `src/types/index.ts` (ExportStatus, ExportJob, etc.)
- Tests: `src/app/(dashboard)/exports/page.test.ts`, `src/lib/services/export.test.ts`

**New Component/Module:**
- Reusable UI: `src/components/ui/NewComponent.tsx` (shadcn-compatible)
- Domain component: `src/components/mbl/NewComponent.tsx` (MBL-specific)
- Form/wizard step: `src/components/mbl/NewWizardStep.tsx`

**Utilities:**
- API helpers: `src/lib/api/new-helper.ts`
- Services (external APIs): `src/lib/services/new-service.ts`
- Database operations: Create helper in relevant route handler, or extract to `src/lib/db/` if reused
- General utilities: `src/lib/utils.ts` if small; create `src/lib/new-utility.ts` if large

**Tests:**
- Co-locate: Place `*.test.ts` next to source file
- Or: Mirror structure in `src/test/` folder (optional, not enforced)
- Use Vitest: `import { describe, it, expect } from 'vitest'`
- Mock Supabase: Use `vi.mock()` for server clients

## Special Directories

**`src/app/api/`:**
- Purpose: All HTTP endpoints
- Generated: No (hand-written)
- Committed: Yes
- Notes: Route handlers use `export const GET/POST/etc` pattern. Middleware applies to all routes.

**`supabase/migrations/`:**
- Purpose: Database schema versions
- Generated: Manually created (via `supabase migration new --name`)
- Committed: Yes
- Notes: Applied incrementally. Never edit or delete old migrations.

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes
- Notes: Updated when architecture or structure changes significantly.

**`src/test/`:**
- Purpose: Test utilities and Vitest setup
- Generated: Partially (setup.ts hand-written, test files generated as .test.ts)
- Committed: Yes
- Notes: Tests can be co-located with source or in this directory.

**`public/`:**
- Purpose: Static assets
- Generated: No (hand-written)
- Committed: Yes
- Notes: Served at root URL. Favicons, images, etc.

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (from package.json + package-lock.json)
- Committed: No (.gitignored)
- Notes: Recreate with `npm install` after cloning.

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build` and dev server)
- Committed: No (.gitignored)
- Notes: Deleted on clean build. Contains compiled pages and type info.

---

*Structure analysis: 2026-03-21*
