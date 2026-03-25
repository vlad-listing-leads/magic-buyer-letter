# Boilerplate Fixes Needed

These are real issues hit building the Magic Buyer Letter satellite app from this boilerplate. Fix them so future apps don't repeat them.

## 1. Auth: OTP Cookie Loss on Redirect (CRITICAL)

The SSO callback (`/api/auth/ll-callback`) doesn't properly attach session cookies to the redirect response. You must create the `NextResponse.redirect()` FIRST, then set cookies on that response object using `createServerClient` from `@supabase/ssr` directly. The current pattern loses the session.

## 2. Auth: JWT Secret Trailing Newline

`CROSS_APP_AUTH_SECRET` can have a trailing newline from env var copy-paste. Add `.trim()` when reading the secret in `jwt.ts`.

## 3. Auth: SSO Callback Must Match ZMA Pattern

The ll-callback should use `verifyOtp({ email, token, type: 'magiclink' })` — NOT `verifyOtp({ type: 'magiclink', token_hash })`. Also use the generic `/auth/sso-redirect` endpoint name, not app-specific names.

## 4. Auth: ll-callback Should Return JSON Errors, Not Redirects

When the callback fails, return JSON with detailed error messages at every step — don't redirect to an error page. Satellite apps need to debug SSO issues and redirects hide the actual error.

## 5. Hydration: Add Client-Mount Guard Pattern

Any component that renders differently based on user role or theme WILL cause hydration mismatches. The boilerplate sidebar and any theme-aware components need a `mounted` state pattern:

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return <Skeleton />
```

Add this as a documented pattern and apply it to the sidebar navigation.

## 6. SSE/Streaming: EventSource Loses Auth Cookies

Document that browser's native `EventSource` API does NOT send cookies. Any authenticated SSE streaming endpoint must use `fetch()` + `ReadableStream` with `credentials: 'include'` instead. This is a fundamental incompatibility — add a `useSSE` hook to the boilerplate that handles this correctly.

## 7. Database: Make Migrations Idempotent

All migrations must use `DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS`, and `CREATE OR REPLACE FUNCTION` to be re-runnable. Also standardize the trigger function name — use `update_updated_at_column()` consistently.

## 8. Env Vars: Use `env.ts` Everywhere

The boilerplate has a type-safe `env.ts` helper but then uses raw `process.env` with `!` assertions in auth files, middleware, Supabase clients, and the login page. Pick one pattern and use it consistently. Also add **startup validation** — lazy getters mean a missing `CROSS_APP_AUTH_SECRET` won't fail until the first login attempt.

## 9. Env Vars: Optional Headers Should Be Conditional

When calling external APIs, don't require optional env vars. Use the spread pattern:

```typescript
...(env.someOptionalKey ? { 'x-header': env.someOptionalKey } : {})
```

## 10. Auth: Add Error Handling to Profile Sync

The ll-callback silently ignores database update failures when syncing agent profiles. Check for errors and log them.

## 11. Listing Leads Profile: Use Zod Validation

`getListingLeadsProfile()` uses unsafe `as` casts on the LL database response. Add a Zod schema to validate and transform the profile data so it fails loudly if LL changes field names.

## 12. JWT Timestamp: Document Expected Units

The JWT age check compares `Date.now()` (ms) against `timestamp`. Add a comment clarifying that LL must send `timestamp` in milliseconds. If LL sends seconds (common in JWT), every token will be rejected.

## 13. Dev Login: Add Audit Logging

When `/api/auth/dev-login?email=X` is used to impersonate, log who impersonated whom with a timestamp.

## Priority Order

1. **Fix now** (auth breaks): #1, #2, #3, #4, #8 (startup validation)
2. **Fix soon** (runtime bugs): #5, #6, #7, #10
3. **Improve** (robustness): #9, #11, #12, #13
