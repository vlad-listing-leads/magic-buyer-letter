# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**Oversized Page Components:**
- Issue: Several page components exceed 400 lines, combining multiple responsibilities within single files
- Files:
  - `src/app/(dashboard)/new/page.tsx` (449 lines)
  - `src/app/(dashboard)/campaigns/[id]/page.tsx` (378 lines)
  - `src/app/(dashboard)/settings/page.tsx` (391 lines)
- Impact: Difficult to test in isolation, harder to reuse logic, increases maintenance burden
- Fix approach: Extract multi-step wizard logic into smaller components; move state management to custom hooks; separate concerns (data fetching vs. UI layout)

**Large Component Files:**
- Issue: UI components exceed recommended size limits (400-600 lines)
- Files:
  - `src/components/ui/sidebar.tsx` (723 lines - shadcn component)
  - `src/components/mbl/AudienceFiltersPanel.tsx` (397 lines)
  - `src/components/mbl/PropertyMap.tsx` (391 lines)
  - `src/components/mbl/LetterPdf.tsx` (375 lines)
  - `src/components/mbl/SmartInput.tsx` (354 lines)
- Impact: Reduces reusability, increases cognitive load, harder to test individual features
- Fix approach: Extract sub-components (filter UI, map controls, PDF sections); create utility functions for complex logic

**Large Types File:**
- Issue: `src/types/index.ts` at 356 lines contains all shared types in one place
- Files: `src/types/index.ts`
- Impact: Makes the file a bottleneck for changes; harder to track which types are used where
- Fix approach: Organize types by feature domain (e.g., `src/types/campaign.ts`, `src/types/property.ts`, `src/types/skill.ts`)

## Error Handling Gaps

**Silent Catch Blocks:**
- Issue: Error handling with empty catch blocks or insufficient logging
- Files:
  - `src/app/api/mbl/campaigns/[id]/pipeline/route.ts` (line 134-136: address verification failures silently skipped)
  - `src/lib/services/reapi.ts` (line 217-220: skip trace failures logged at warn level only)
- Impact: Failed operations may not alert operators; hard to diagnose issues in production
- Fix approach: Log all failures at error level with context; implement retry logic for transient failures; consider dead letter queues for failed address verifications

**Graceful Degradation Without Visibility:**
- Issue: When Lob API key is missing, pipeline silently promotes unverified addresses without logging warning at sufficient level
- Files: `src/app/api/mbl/campaigns/[id]/pipeline/route.ts` (line 140)
- Impact: Users may send letters to unverified addresses without knowing; data quality degradation goes unnoticed
- Fix approach: Log at warn level always; consider blocking pipeline if critical service (Lob) is unavailable; send admin notifications

## Security Considerations

**Type Casting to Unknown:**
- Issue: Multiple locations use `as unknown as Type` to bypass TypeScript safety checks
- Files:
  - `src/lib/auth/jwt.ts` (line 33: JWT payload casting)
  - `src/app/api/mbl/campaigns/[id]/send-confirmed/route.ts` (line 43: agent relation casting)
  - `src/components/mbl/LetterPreviewWizard.tsx` (line 58: property content casting)
  - `src/app/api/auth/ll-callback/route.ts` (line 43: token payload casting)
- Impact: Bypasses compile-time type safety; runtime errors possible if API shape changes; harder to detect contract violations
- Fix approach: Define strict interface types matching API contracts; use Zod for runtime validation; add test fixtures for API responses

**Unsafe Property Access in Payment Handler:**
- Issue: Agent properties accessed without null checks before using in Lob letter creation
- Files: `src/app/api/mbl/campaigns/[id]/send-confirmed/route.ts` (lines 71-82)
- Impact: Missing agent data (e.g., `agent.lob_address_id` on line 93) could fail letter creation after payment; no recovery mechanism
- Fix approach: Validate all required agent fields before processing payment; store validated snapshot at payment time, not at send time

**JWT Token Age Validation is Hardcoded:**
- Issue: 60-second token expiry window is hardcoded in verification
- Files: `src/lib/auth/jwt.ts` (line 43)
- Impact: Cannot adjust token lifetime without code change; clock skew issues could lock out users
- Fix approach: Move token lifetime to environment variable; add configurable clock skew tolerance (e.g., ±5 seconds)

## Performance Bottlenecks

**REAPI Pagination with Unbounded Memory:**
- Issue: `fetchAllPages` loads all properties into memory before returning; 20-page limit * 250/page = 5,000 properties in RAM
- Files: `src/lib/services/reapi.ts` (line 125-141)
- Impact: Memory usage scales linearly with result set; large searches could consume significant heap; potential OOM on edge functions
- Fix approach: Implement streaming response; batch insert into Supabase in chunks of 500; consider server-side pagination with cursor-based navigation

**Synchronous Letter Sending with 50ms Throttle:**
- Issue: Letters sent one-at-a-time with 50ms delays; sending 5,000 letters would take ~250 seconds
- Files: `src/app/api/mbl/campaigns/[id]/send-confirmed/route.ts` (line 116)
- Impact: API route timeout risk (Vercel default is 60s for serverless, 900s for background jobs); slower user experience; inefficient Lob API usage
- Fix approach: Implement parallel batching (10-20 concurrent requests); consider background job queue for large campaigns; use Lob's bulk API if available

**No Connection Pooling for Supabase Queries:**
- Issue: Each API route creates new Supabase client; no connection reuse across requests
- Files: Multiple routes using `createAdminClient()`
- Impact: Connection overhead on hot code paths; potentially high latency for many small queries
- Fix approach: Implement singleton Supabase client with proper lifecycle management; verify Vercel KV is configured for caching frequent queries

## Fragile Areas

**Leaflet Dynamic Import with Global State:**
- Issue: Leaflet module loaded dynamically and stored in module-level `let leafletModule` variable
- Files: `src/components/mbl/PropertyMap.tsx` (lines 32-45, 80-95)
- Impact: Race conditions if component renders before Leaflet loads; icon creation returns undefined during loading; no cleanup on unmount
- Safe modification: Use React.lazy() for Leaflet component; move Leaflet state to context; add proper error boundaries; ensure type safety during async loading
- Test coverage: No error boundary tests; no tests for render-before-load scenario

**Unvalidated Stripe Session Metadata:**
- Issue: `campaignId` and `agentId` extracted from Stripe session metadata without validation
- Files: `src/app/api/webhooks/stripe/route.ts` (line 15)
- Impact: If metadata is tampered or missing, campaign/agent ID validation would fail silently at webhook level; no audit trail
- Safe modification: Validate campaign ownership in webhook handler; add signature verification; log all webhook events for audit
- Test coverage: No tests for malformed webhook payloads

**Lob Address Verification Failure Ignored:**
- Issue: Failed address verifications in pipeline caught and silently skipped (line 134-136 of pipeline/route.ts)
- Files: `src/app/api/mbl/campaigns/[id]/pipeline/route.ts`
- Impact: Properties with unverifiable addresses still marked as "verified"; users may send to invalid addresses; Lob will charge but mail won't deliver
- Safe modification: Add retry logic with exponential backoff; fail the property status instead of silently passing; log failures with property IDs
- Test coverage: No tests for Lob API errors

**Recursive Property Filtering with Multiple Passes:**
- Issue: `applyFilters()` function does 7+ separate filter passes over the same array
- Files: `src/lib/services/reapi.ts` (lines 165-190)
- Impact: O(n*m) complexity where n=properties, m=filter criteria; large datasets slow down
- Safe modification: Combine filters into single pass using `every()` predicate; memoize filter functions
- Test coverage: Filters tested individually but not in combination

## Test Coverage Gaps

**No Tests for REAPI Error Scenarios:**
- What's not tested: Network failures, malformed API responses, pagination edge cases
- Files: `src/lib/services/reapi.ts`
- Risk: Silent failures with empty arrays; harder to diagnose production issues
- Priority: High - REAPI is critical data source

**No Tests for SSE Stream Error Handling:**
- What's not tested: Mid-stream failures, controller closure edge cases, error event serialization
- Files: `src/app/api/mbl/campaigns/[id]/pipeline/route.ts`, `src/app/api/mbl/campaigns/[id]/generate/route.ts`
- Risk: Client-side stream disconnection without proper error message; retry logic must be implemented client-side
- Priority: High - users see broken progress states

**No Tests for Payment Flow End-to-End:**
- What's not tested: Stripe webhook validation, session state transitions, concurrent payment attempts
- Files: `src/app/api/webhooks/stripe/route.ts`, `src/app/api/mbl/campaigns/[id]/checkout/route.ts`, `src/app/api/mbl/campaigns/[id]/send-confirmed/route.ts`
- Risk: Payment processed but letters never sent; double-charging on race conditions
- Priority: Critical - financial impact

**Missing Tests for PropertyMap Interactive Features:**
- What's not tested: Polygon drawing, marker selection, click handlers during async load
- Files: `src/components/mbl/PropertyMap.tsx`
- Risk: Map becomes unresponsive during Leaflet loading; user selections lost on component remount
- Priority: Medium - impacts UX but not data integrity

## Dependencies at Risk

**react-leaflet Version Compatibility:**
- Risk: Leaflet component loading via dynamic import with heavy type casting (`as unknown as React.ComponentType`)
- Impact: Upgrading react-leaflet may break due to interface changes; icon creation fallback doesn't handle failures
- Migration plan: Use Leaflet context provider instead of module-level state; write integration tests; consider replacing with lightweight alternative like Deck.gl for large datasets

**Pino Logger Version Lock:**
- Risk: Logger relies on specific Pino version for PII redaction behavior
- Impact: Major version bump could change log format; redaction patterns may become insufficient
- Migration plan: Add test suite for redaction patterns; consider using structured logging library with built-in PII handling

## Known Issues

**Stripe Webhook May Process Same Event Twice:**
- Symptoms: Campaign marked "sent" multiple times; duplicate payment records possible
- Files: `src/app/api/webhooks/stripe/route.ts`
- Current mitigation: None - idempotency not implemented
- Recommendation: Store processed webhook IDs in Supabase; return 200 immediately for duplicate events

**Address Verification Stops at First Error:**
- Symptoms: Pipeline completes but only some properties verified; unclear which ones failed
- Files: `src/app/api/mbl/campaigns/[id]/pipeline/route.ts` (line 134)
- Current mitigation: Error logged at debug level, not visible in UI
- Recommendation: Count failures; expose per-property status to user interface

**Map Drawing Mode Race Condition:**
- Symptoms: Drawing mode may activate before Leaflet module loads; user clicks create no markers
- Files: `src/components/mbl/PropertyMap.tsx`
- Current mitigation: None - no check for module availability before rendering
- Recommendation: Disable drawing mode UI until Leaflet ready

## Missing Critical Features

**No Bulk Resend for Failed Letters:**
- Problem: If letters fail to send (Lob API down, invalid address), no way to retry batch
- Blocks: Users must manually recreate campaign to resend; data loss if database cleared
- Recommendation: Add resend endpoint filtering for `status = 'send_failed'`; implement exponential backoff

**No Campaign Analytics:**
- Problem: No visibility into delivery rates, bounce reasons, or engagement
- Blocks: Users can't track campaign effectiveness
- Recommendation: Store Lob webhooks in `mbl_campaign_events` table; expose dashboard

**No Rate Limiting on API Routes:**
- Problem: Clients can hammer pipeline/generate endpoints without throttling
- Blocks: Potential for abuse; runaway costs on Claude/Lob calls
- Recommendation: Implement rate limiter using Vercel KV; 1 active pipeline per campaign

## Scaling Limits

**Single-Region Supabase:**
- Current capacity: Single Postgres instance; designed for <1000 concurrent users
- Limit: RLS policy evaluation becomes bottleneck at ~500 concurrent writes
- Scaling path: Add read replicas for property lookups; migrate to regional shards if user base grows 10x

**Synchronous Letter Sending:**
- Current capacity: ~50 letters/minute (with 50ms throttle)
- Limit: Vercel function timeout at 900s = max 750 letters per campaign
- Scaling path: Implement background job worker; use Lob batch API; target 1000+ letters/min

**REAPI Search Pagination:**
- Current capacity: 20 pages * 250 results = 5,000 properties
- Limit: 20-page cap prevents searching large markets completely; memory constrained on serverless
- Scaling path: Add cursor-based pagination; implement streaming results; consider REAPI v3 API

---

*Concerns audit: 2026-03-21*
