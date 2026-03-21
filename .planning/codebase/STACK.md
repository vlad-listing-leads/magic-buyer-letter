# Technology Stack

**Analysis Date:** 2025-03-21

## Languages

**Primary:**
- TypeScript 5.9 - Full codebase (strict mode enabled)
- JavaScript (ES2017 target, compiled from TypeScript)

**Markup:**
- TSX/JSX - React components
- HTML - Generated via templates and render libraries

## Runtime

**Environment:**
- Node.js (v22+ inferred from @types/node ^22.0.0)

**Package Manager:**
- npm (lockfile present: package-lock.json)

**Platform:**
- Vercel (Next.js deployment)

## Frameworks

**Core:**
- Next.js 16.1.0 - App Router, Server Components, API Routes
- React 19.2.0 - Component framework

**UI & Styling:**
- Tailwind CSS 4.2.0 - Utility-first CSS framework
- @tailwindcss/postcss 4.2.0 - PostCSS plugin for Tailwind
- Tailwind Merge 3.0.0 - Intelligent class merging for dynamic styles
- tw-animate-css 1.4.0 - Animation utilities
- next-themes 0.4.6 - Dark/light mode toggle
- shadcn/ui via Base UI - Component library (uses @base-ui/react ^1.3.0)
- Lucide React 0.577.0 - Icon library

**State Management:**
- TanStack React Query 5.90.0 - Server state management and caching
- next-themes 0.4.6 - Theme state

**Data Validation:**
- Zod 3.24.0 - Schema validation and type inference

**Logging:**
- Pino 10.3.0 - Structured logging with PII redaction

**Testing:**
- Vitest 4.0.0 - Unit test runner
- Configuration: `vitest run`, `vitest` (watch), `vitest run --coverage`

**Build & Dev:**
- PostCSS 8.5.0 - CSS transformation
- ESLint 9.0.0 - Linting
- eslint-config-next 16.1.0 - Next.js ESLint config

## Key Dependencies

**Critical:**
- @supabase/ssr 0.7.0 - Server-side Supabase auth and client creation
- @supabase/supabase-js 2.49.0 - Supabase client (browser and server)
- jose 6.0.0 - JWT verification and creation (HS256)
- stripe 20.4.1 - Stripe server SDK for checkout sessions and webhooks
- @stripe/stripe-js 8.10.0 - Stripe client library (for payments)

**PDF & Document Generation:**
- @react-pdf/renderer 4.3.2 - React-to-PDF rendering
- jspdf 4.2.1 - PDF manipulation
- html2canvas 1.4.1 - HTML-to-canvas conversion (PDF previews)

**Geospatial:**
- leaflet 1.9.4 - Mapping library
- react-leaflet 5.0.0 - React bindings for Leaflet
- @types/leaflet 1.9.21 - TypeScript types

**Utilities:**
- class-variance-authority 0.7.1 - Component variant system
- clsx 2.1.1 - Conditional class names
- sileo 0.1.5 - Utility helpers
- sonner 2.0.0 - Toast notifications
- novel 1.0.2 - Rich text editor

## Configuration

**Environment:**
- Managed via `.env.local` (development) and Vercel dashboard (production)
- Type-safe access via `src/lib/env.ts` with lazy-loaded getters

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (client)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server only)
- `CROSS_APP_AUTH_SECRET` - Shared JWT secret with Listing Leads (HS256, base64)
- `LISTING_LEADS_SUPABASE_URL` - LL database URL (read-only)
- `LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY` - LL service key (read-only)
- `NEXT_PUBLIC_APP_URL` - App URL (default: http://localhost:3010)
- `NEXT_PUBLIC_LL_URL` - Listing Leads hub URL (default: https://listingleads.com)
- `REAPI_KEY` - RealEstateAPI key
- `REAPI_USER_ID` - RealEstateAPI user ID
- `LOB_API_KEY` - Lob postal API key
- `LOB_WEBHOOK_SECRET` - Lob webhook HMAC secret
- `LOB_TEMPLATE_ID` - Lob letter template ID
- `ANTHROPIC_API_KEY` - Claude API key (sk-ant-...)
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_... or sk_live_...)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (whsec_...)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key (pk_test_... or pk_live_...)
- `DEV_LOGIN_ENABLED` - Enable dev auth bypass (development only)
- `DEV_USER_EMAIL` - Dev login email (default: dev@localhost.test)

**Build:**
- `next.config.ts` - Next.js config with remote image patterns (Supabase, ImageKit, Vercel Blob)
- `tsconfig.json` - TypeScript strict mode, path aliases (@/* → ./src/*)
- `vercel.json` - Vercel deployment config (functions, cron jobs)

## Platform Requirements

**Development:**
- Node.js 22+
- npm with lockfile
- Port 3010

**Production:**
- Vercel (managed deployment)
- NEVER use `vercel` CLI — always `git push` for deployments
- All environment variables configured in Vercel dashboard

---

*Stack analysis: 2025-03-21*
