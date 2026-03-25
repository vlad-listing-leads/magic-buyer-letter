# Authentication — Listing Leads SSO

Magic Buyer Letter uses Listing Leads as the single sign-on (SSO) hub. Users never enter credentials in this app — all authentication happens on listingleads.com via MemberStack.

## How It Works

```
User → MBL (any page)
  → middleware: no session? → redirect to /auth/login
  → /auth/login: redirect to listingleads.com/auth/sso-redirect
  → User logs in on Listing Leads (MemberStack)
  → LL signs JWT → redirects to /api/auth/ll-callback?token=JWT
  → ll-callback: verify JWT → fetch LL profile → create/sync user
    → generate OTP → verify OTP → set session cookies → redirect to /
  → User lands on dashboard with active Supabase session
```

## Step-by-Step Flow

### 1. User visits any protected page

Middleware (`src/middleware.ts`) runs on every request. It refreshes the Supabase session cookies and checks if the user is authenticated. If not, it redirects to `/auth/login`.

Public routes that skip auth:
- `/auth/*` — login page
- `/api/auth/*` — SSO callback, dev login
- `/api/health` — health check
- `/api/webhooks/*` — Stripe webhooks

### 2. Login page redirects to Listing Leads

The login page (`src/app/auth/login/page.tsx`) immediately redirects the browser to:

```
https://listingleads.com/auth/sso-redirect?returnTo=<APP_URL>/api/auth/ll-callback
```

The user sees a brief spinner ("Redirecting to Listing Leads...") before the redirect.

### 3. User authenticates on Listing Leads

On `listingleads.com`, the user logs in via MemberStack (email/password, social login, etc.). This is the only place credentials are handled — satellite apps never touch passwords.

### 4. Listing Leads redirects back with a signed JWT

After successful login, Listing Leads creates a short-lived JWT signed with `CROSS_APP_AUTH_SECRET` (HS256, shared between LL and all satellite apps). The token expires in 60 seconds.

**JWT payload:**

| Field | Type | Description |
|-------|------|-------------|
| `memberstackId` | string | Unique user ID across all LL apps |
| `email` | string | User's email address |
| `role` | string | `user`, `admin`, or `superadmin` |
| `name` | string (optional) | Display name |
| `timestamp` | number | `Date.now()` in milliseconds |

LL redirects to:

```
https://magic-buyer-letter.listingleads.com/api/auth/ll-callback?token=<JWT>
```

### 5. Callback validates JWT and creates session

The SSO callback (`src/app/api/auth/ll-callback/route.ts`) does the heavy lifting:

**a) Verify the JWT**
- Checks signature against `CROSS_APP_AUTH_SECRET`
- Validates required fields (`memberstackId`, `email`)
- Token must be less than 60 seconds old

**b) Fetch profile from Listing Leads database**
- Reads the user's agent profile from the LL Supabase database via `getListingLeadsProfile(memberstackId)`
- Pulls: name, phone, brokerage, license number, website, headshot, logo, address
- This is non-fatal — if LL is unreachable, login still works with basic data

**c) Create or sync user**
- **First login:** Creates Supabase auth user → inserts `users` row → inserts `mbl_agents` row with LL profile data
- **Returning user:** Syncs `users` and `mbl_agents` rows with latest LL profile data on every login

**d) Generate and verify magic link OTP**
- Uses Supabase admin API to generate a magic link token
- Creates a `NextResponse.redirect('/')` response object
- Verifies the OTP using a Supabase client that writes session cookies directly onto that redirect response
- This ensures cookies travel with the redirect — creating the response first was a critical fix

**e) Return redirect**
- User lands on the dashboard (`/`) with a valid Supabase session established via cookies

### 6. Middleware keeps session alive

On every subsequent request, middleware calls `updateSession()` which refreshes the Supabase auth cookies before they expire.

## Key Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Session refresh + route protection |
| `src/app/auth/login/page.tsx` | Login page (redirects to LL, or shows dev login) |
| `src/app/api/auth/ll-callback/route.ts` | SSO callback — validates JWT, syncs profile, creates session |
| `src/lib/auth/jwt.ts` | JWT verification and creation utilities |
| `src/lib/supabase/middleware.ts` | Supabase session refresh helper |
| `src/lib/supabase/listing-leads.ts` | Read-only client for LL database (profile data) |
| `src/app/api/auth/dev-login/route.ts` | Development-only auth bypass |
| `src/app/api/auth/callback/route.ts` | Supabase OTP verification callback |
| `src/app/api/auth/me/route.ts` | Current user profile endpoint |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CROSS_APP_AUTH_SECRET` | Yes | Shared secret for JWT signing (HS256) — must match Listing Leads |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (used with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin key (bypasses RLS) |
| `NEXT_PUBLIC_LL_URL` | Yes | Listing Leads URL (`https://listingleads.com`) |
| `NEXT_PUBLIC_APP_URL` | Yes | This app's URL (for SSO return redirect) |
| `LISTING_LEADS_SUPABASE_URL` | Yes | LL database URL (for profile reads) |
| `LISTING_LEADS_SUPABASE_SERVICE_ROLE_KEY` | Yes | LL database service key (read-only access) |
| `DEV_LOGIN_ENABLED` | No | Set `true` to enable dev login bypass |

## Dev Mode

When `NODE_ENV=development`, the login page shows an email input instead of redirecting to LL. Submitting the form hits `/api/auth/dev-login?email=<email>` which:

1. Finds or creates the user in Supabase
2. Generates and verifies a magic link OTP
3. Sets session cookies and redirects to `/`

This bypasses SSO entirely — useful for local development without needing a running LL instance.

Enable with `DEV_LOGIN_ENABLED=true` in `.env.local`.

## User Linking

Users are linked across all Listing Leads satellite apps via `memberstack_id`:

- LL is the source of truth for user identity
- Each satellite app maintains its own `users` table with a `memberstack_id` column
- On every login, profile data is synced from LL → satellite app
- Team members have synthetic IDs: `team_<admin_id>_<random8>` (no MemberStack account)

## Security Notes

- JWT tokens are single-use and expire in 60 seconds
- `CROSS_APP_AUTH_SECRET` must be identical across LL and all satellite apps
- The admin Supabase client (service role key) is only used server-side, never exposed to the browser
- The LL database client is read-only — satellite apps cannot modify LL data
- Dev login is blocked in production via middleware check
