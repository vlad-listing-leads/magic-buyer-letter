# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase (e.g., `SmartInput.tsx`, `BuyerDetails.tsx`)
- Utilities/helpers: camelCase (e.g., `useCurrentUser.ts`, `createLogger.ts`)
- Types: `index.ts` in `src/types/` directory for all shared types
- Hooks: `use*` prefix (e.g., `useCurrentUser`, `useApiFetch`, `use-mobile`)

**Functions:**
- camelCase throughout (e.g., `createServerSupabaseClient()`, `requireAuth()`)
- Descriptive names indicating action: `fetch*`, `create*`, `require*`, `handle*`
- Private/internal helpers use underscore prefix if needed

**Variables:**
- camelCase for all variables (e.g., `displayName`, `isListening`, `memberstackId`)
- Constants: UPPER_SNAKE_CASE for truly constant values (e.g., `VOICE_BAR_HEIGHTS`, `PII_PATTERNS`)
- React state: descriptive names with `use*` prefix (e.g., `isListening`, `isParsing`, `isFocused`)

**Types:**
- PascalCase for all interfaces and types
- Interfaces for object shapes (e.g., `CrossAppTokenPayload`, `ParsedCriteria`)
- Type unions for discriminated values (e.g., `CampaignStatus`, `PropertyStatus`)
- Suffix `Props` for component prop interfaces (e.g., `SmartInputProps`)

## Code Style

**Formatting:**
- ESLint configured with Next.js defaults (`eslint-config-next`)
- No explicit Prettier config — relies on Next.js defaults (semicolons, 2-space indent, single quotes where possible)
- Default Next.js lint rules enforced via `next lint`

**Linting:**
- ESLint enabled: `"eslint": "^9.0.0"` with `"eslint-config-next": "^16.1.0"`
- Run via: `npm run lint`
- No custom ESLint config file (uses Next.js defaults)

## Import Organization

**Order:**
1. React and React hooks (e.g., `import { useState } from 'react'`)
2. Next.js modules (e.g., `import { NextRequest } from 'next/server'`)
3. Third-party libraries (e.g., `import { useQuery } from '@tanstack/react-query'`)
4. Local absolute imports using `@/` alias (e.g., `import { createLogger } from '@/lib/logger'`)
5. Type imports use `import type { ... }` when only importing types

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- All local imports use absolute `@/` paths, never relative paths
- Example: `import { User } from '@/types'` not `import { User } from '../types'`

## Error Handling

**Patterns:**
- Synchronous errors: throw descriptive `Error` instances with context
  - Example: `throw new Error('Unauthorized')` in `requireAuth()`
- Async errors in API routes: return standardized `apiError()` response
  - Always use: `apiError(message, statusCode)` → returns `{ success: false, data: null, error: message }`
- Error wrapping in middleware: `withErrorHandler()` catches unhandled errors and returns 500
  - Custom error message check: if error.message === 'Unauthorized', return 401
- Validation errors: Zod safeParse with formatted field-level messages
  - Example: join error paths with field names: `${e.path.join('.')}: ${e.message}`

**Pattern Example:**
```typescript
// In API route with error handler
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth() // Throws if not authenticated
  const { data, error } = await validateRequest(request, mySchema)
  if (error) return error // Returns apiError response
  // ... business logic
  return apiSuccess(result, 201)
})
```

## Logging

**Framework:** Pino v10 logger with PII redaction

**Patterns:**
- Create context-bound logger: `const log = createLogger('context-name')`
- Log levels: `debug`, `info`, `warn`, `error` — set via `LOG_LEVEL` env var
- Log on auth events: success/failure with user email (redacted)
- Log on external API calls: request/response status and error context
- Never log sensitive fields directly: use Pino's formatting layer

**PII Redaction:**
- Automatic pattern redaction: emails → `[EMAIL]`, phone → `[PHONE]`, zip → `[ZIP]`
- Key-based redaction: object keys in `REDACTED_KEYS` set → `[REDACTED]`
- Example: `logger.info({ email: 'user@example.com' })` logs as `{ email: '[REDACTED]' }`

**Usage Example:**
```typescript
const log = createLogger('ll-callback')
log.info({ email, memberstackId }, 'll-callback: created new auth user')
log.warn({ err }, 'll-callback: invalid or expired token')
```

## Comments

**When to Comment:**
- Block-level JSDoc for exported functions/types (see examples below)
- Explain the "why" not the "what" — code should be self-documenting
- Complex business logic: comment the intent before the code
- External API interactions: document expected response format

**JSDoc Pattern:**
```typescript
/**
 * GET /api/auth/ll-callback?token=JWT
 *
 * Listing Leads cross-app SSO callback.
 * Syncs profile data from LL on every login.
 */
export async function GET(request: NextRequest) {
```

**Type Documentation:**
```typescript
/** User record from our database */
export interface User {
  id: string
  email: string
  // ...
}
```

## Function Design

**Size:** Keep under 50 lines per function; extract utilities for complex logic
- Example: `redactValue()` extracted for reusable PII redaction
- Example: `validateRequest()` abstracted for schema validation across routes

**Parameters:**
- Use destructuring for object parameters (e.g., `{ memberstackId, email, role }`)
- Single responsibility: each function does one thing
- Dependencies injected via parameters, not global state

**Return Values:**
- Explicit returns: prefer returning values over side effects
- Async functions return typed Promises (e.g., `Promise<User>` or discriminated union for error handling)
- API route handlers return `NextResponse` via helpers (`apiSuccess()`, `apiError()`)

## Module Design

**Exports:**
- Named exports for utility functions and components: `export function myFunc() { ... }`
- Default exports for page/layout components: `export default function Page() { ... }`
- Type exports: `export type MyType = ...` or `export interface MyInterface { ... }`
- Avoid mixed default + named exports

**Barrel Files:**
- Not used for src/lib or src/components (kept separate)
- Types aggregated in single `src/types/index.ts`
- Each module has single responsibility

## Database Operations

**Patterns:**
- Use client factories from `@/lib/supabase/server.ts` (not inline creation)
- Admin operations: `createAdminClient()` for service-role operations
- User-bound operations: `createServerSupabaseClient()` respects RLS via user cookies
- Error handling: destructure `{ data, error }` and check both
- Query building: method chaining style (e.g., `.select().eq().single()`)

**Example:**
```typescript
const admin = createAdminClient()
const { data: user, error } = await admin
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

if (error || !user) {
  return apiError('User not found', 404)
}
```

## Validation

**Framework:** Zod v3 for all input validation

**Patterns:**
- Define schema at module/file top level
- Use `schema.safeParse()` to validate (never `parse()` which throws)
- Return either `{ data, error: null }` or `{ data: null, error }` via helper
- Validation happens at all boundaries (API routes, form submission)

**Example:**
```typescript
const parseSchema = z.object({
  text: z.string().min(1),
  age: z.number().int().positive(),
})

const parsed = parseSchema.safeParse(body)
if (!parsed.success) return apiError('Invalid input', 400)
const { text, age } = parsed.data
```

## React/Component Patterns

**Client Components:**
- Mark with `'use client'` directive at file top
- Use hooks: `useState`, `useRef`, `useEffect`, `useCallback` from React
- Use `'use client'` for any component using browser APIs (e.g., Web Speech API)
- TanStack Query hooks: `useQuery` for data fetching with automatic caching

**Props:**
- Define `Interface*Props` for component props
- Use destructuring in function signature
- Document prop purposes with comments if non-obvious

**State Management:**
- TanStack React Query v5 for server state (API data with caching)
- React hooks (`useState`) for local UI state (form inputs, modals, toggles)
- Never use Redux or Context API — keep it simple

**Example Component:**
```typescript
interface SmartInputProps {
  onComplete: (buyerName: string, description: string, criteria: PropertySearchCriteria) => void
}

export function SmartInput({ onComplete }: SmartInputProps) {
  const [text, setText] = useState('')
  const apiFetch = useApiFetch()

  const handleContinue = async () => {
    // ...
  }

  return <div>...</div>
}
```

## TypeScript

**Configuration:**
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- Target: `ES2017` (modern JavaScript features)
- Module resolution: `"bundler"` for Next.js
- Isolated modules: `true` for Next.js app router

**Patterns:**
- Always type function parameters and return types explicitly
- Use `type` for type aliases (discriminated unions), `interface` for object shapes
- Never use `any` — use `unknown` and narrow with type guards instead
- Type inference OK for obvious values: `const x = 5` (inferred as `number`)

## API Response Format

**All Routes:**
All API routes must return the standard envelope:
```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
}
```

**Success Response:**
```typescript
return apiSuccess(userData, 200)
// → { success: true, data: userData, error: null }
```

**Error Response:**
```typescript
return apiError('User not found', 404)
// → { success: false, data: null, error: 'User not found' }
```

Helpers defined in `@/lib/api/response.ts`.

---

*Convention analysis: 2026-03-21*
