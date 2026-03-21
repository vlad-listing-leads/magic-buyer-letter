# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Runner:**
- Vitest v4.0
- Config: `vitest.config.ts` (located at project root)
- Environment: jsdom (for DOM testing)
- Globals enabled (no need to import `describe`, `it`, `expect`)

**Assertion Library:**
- Built into Vitest (uses Chai assertions via `expect()`)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode with automatic re-run
npm run test:coverage    # Generate coverage report
```

## Test File Organization

**Location:**
- Tests are co-located with source code (not in separate test directory)
- Test files created adjacent to source files (same directory)

**Naming:**
- `.test.ts` extension for unit tests (e.g., `parseUtil.test.ts`)
- `.spec.ts` extension for integration/feature specs (alternate convention)
- Current codebase: No test files exist yet — ZERO coverage

**Directory Structure (when created):**
```
src/
├── lib/
│   ├── api/
│   │   ├── response.ts
│   │   ├── response.test.ts          ← API response testing
│   │   └── validation.test.ts        ← Zod schema validation
│   ├── logger.ts
│   ├── logger.test.ts                ← PII redaction testing
│   └── supabase/
│       └── server.test.ts            ← Client factory testing
├── components/
│   ├── ui/
│   │   └── button.test.tsx           ← Component snapshot tests
│   └── mbl/
│       └── SmartInput.test.tsx       ← Integration tests
└── test/
    └── setup.ts                      ← Vitest global setup
```

## Test Structure

**Current Setup File:**
```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest'

afterEach(() => {
  // Clean up after each test
})
```

The setup file imports `expect` and `afterEach` from Vitest (globals enabled in config).

**Suite Organization Pattern (to implement):**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLogger } from '@/lib/logger'

describe('Logger', () => {
  let mockLogger: ReturnType<typeof createLogger>

  beforeEach(() => {
    // Set up test fixtures
    mockLogger = createLogger('test')
  })

  afterEach(() => {
    // Clean up
    vi.clearAllMocks()
  })

  it('should redact email addresses from logs', () => {
    const log = mockLogger.info({ email: 'user@example.com' })
    expect(log).toContain('[EMAIL]')
  })

  it('should redact phone numbers', () => {
    const log = mockLogger.info({ phone: '5551234567' })
    expect(log).toContain('[PHONE]')
  })
})
```

**Patterns:**
- Setup phase: `beforeEach()` initializes state/mocks
- Teardown phase: `afterEach()` cleans up (reset mocks, clear timers)
- Assertion phase: `expect()` validates behavior

## Mocking

**Framework:** Vitest built-in `vi` module

**Patterns (to implement):**
```typescript
import { vi } from 'vitest'

// Mock module
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
  createServerSupabaseClient: vi.fn(() => mockServerClient),
}))

// Mock function
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: () => ({ success: true, data: {} })
})

global.fetch = fetchMock

// Reset mocks
vi.clearAllMocks()
```

**What to Mock:**
- External API calls (Supabase, Anthropic, Lob, Stripe)
- Environment-dependent functions (time, random)
- Third-party library methods
- fetch/HTTP requests

**What NOT to Mock:**
- Core business logic utilities (should test real implementation)
- Zod schemas (test actual validation rules)
- Logger formatting (test real PII redaction)
- Component rendering (test real props/state)

## Fixtures and Factories

**Test Data Pattern (to implement):**
```typescript
// src/test/fixtures.ts
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  memberstack_id: 'ms_123',
  role: 'user' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

export const mockCampaign = {
  id: 'camp_123',
  user_id: mockUser.id,
  agent_id: 'agent_123',
  status: 'searching' as const,
  buyer_name: 'John Doe',
  criteria_city: 'Auburn',
  criteria_state: 'NH',
  total_properties: 50,
  // ... all required fields
}

export function createMockUser(overrides = {}) {
  return { ...mockUser, ...overrides }
}
```

**Location:**
- Create `src/test/fixtures.ts` for shared test data
- Keep reusable factory functions alongside fixtures

## Coverage

**Requirements:** Not currently enforced (0% coverage baseline)

**View Coverage:**
```bash
npm run test:coverage
```

This generates a coverage report showing which lines, branches, and functions are tested.

**Recommended Target:** 80%+ overall coverage
- Unit tests: 90%+ (utility functions, helpers)
- Integration tests: 70%+ (API routes)
- Components: 60%+ (UI components)

## Test Types

**Unit Tests:**
- Scope: Single function/utility in isolation
- Approach: Test one behavior per test, mock dependencies
- Example: `logger.test.ts` tests PII redaction patterns without external calls
- Run: All unit tests should complete in <100ms total

**Integration Tests:**
- Scope: Multiple modules working together (e.g., API route + database)
- Approach: Mock external services (API calls, database), test real business logic
- Example: `/api/auth/ll-callback` test validates JWT, creates user, returns session
- Run: All integration tests should complete in <1s total

**E2E Tests:**
- Framework: Not yet implemented (could use Playwright or Cypress)
- Scope: Full user workflows (login → campaign create → send letter)
- Current Status: No E2E tests in codebase

## Common Patterns

**Async Testing:**
```typescript
it('should fetch user data', async () => {
  const user = await fetchUser('123')
  expect(user.id).toBe('123')
  expect(user.email).toBeDefined()
})

// With timeout for slow operations
it('should complete campaign', async () => {
  const campaign = await createCampaign(data)
  expect(campaign.status).toBe('ready')
}, 10000) // 10 second timeout
```

**Error Testing:**
```typescript
it('should throw on missing user', async () => {
  await expect(requireAuth()).rejects.toThrow('Unauthorized')
})

it('should return error response on invalid input', () => {
  const result = mySchema.safeParse({})
  expect(result.success).toBe(false)
  expect(result.error.issues).toHaveLength(1)
})
```

**Component Testing Pattern (to implement):**
```typescript
import { render, screen } from '@testing-library/react'
import { SmartInput } from '@/components/mbl/SmartInput'

it('should render input field', () => {
  const handleComplete = vi.fn()
  render(<SmartInput onComplete={handleComplete} />)
  expect(screen.getByRole('textbox')).toBeInTheDocument()
})

it('should call onComplete on enter', async () => {
  const handleComplete = vi.fn()
  render(<SmartInput onComplete={handleComplete} />)
  const input = screen.getByRole('textbox')
  await userEvent.type(input, 'Auburn NH 900K')
  await userEvent.type(input, '{Enter}')
  expect(handleComplete).toHaveBeenCalled()
})
```

## Setup Requirements

**Vitest Config:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Setup File:**
```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest'

afterEach(() => {
  // Clean up after each test
})
```

## Best Practices

1. **Test Behavior, Not Implementation** - Test what the function does, not how it does it
2. **One Assertion Per Test** - Keep tests focused on single behavior (use multiple tests if needed)
3. **Descriptive Test Names** - Name should read as specification: `should redact PII from log output`
4. **Arrange-Act-Assert Pattern** - Setup (arrange) → Execute (act) → Verify (assert)
5. **Mock External Dependencies** - Never make real API calls in tests
6. **Use Fixtures Over Inline Data** - Keep test data in factories for reusability
7. **Avoid Test Interdependence** - Each test should pass independently
8. **Clean Up After Tests** - Reset mocks, clear state in `afterEach()`

## Current Status

**Coverage:** 0% — No tests exist yet in `src/`
- `vitest.config.ts` configured but no test files
- `src/test/setup.ts` created with minimal setup
- Ready for test implementation when needed

**Dependencies Installed:**
- `vitest` v4.0.0 in devDependencies
- All testing utilities available

---

*Testing analysis: 2026-03-21*
