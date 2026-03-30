import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { PropertySearchCriteria } from '@/types'

const REAPI_BASE_URL = 'https://api.realestateapi.com'

/** Actual REAPI v2 PropertySearch response shape (flat structure) */
interface ReapiPropertyResult {
  id: string
  propertyId: string
  address: {
    address: string
    street: string
    city: string
    state: string
    zip: string
    county: string
  }
  latitude: number | null
  longitude: number | null
  location?: { latitude: number; longitude: number }
  lat?: number
  lng?: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  lotSquareFeet: number
  yearBuilt: number
  propertyType: string
  estimatedValue: number
  lastSaleAmount: string
  lastSaleDate: string
  equityPercent: number
  yearsOwned: number
  ownerOccupied: boolean
  absenteeOwner: boolean
  corporateOwned: boolean
  owner1FirstName: string
  owner1LastName: string
  neighborhood: { name: string; id: string } | null
  property?: { bedrooms: number; bathrooms: number; sqft: number; lotSqft: number; yearBuilt: number; propertyType: string }
  valuation?: { estimatedValue: number; lastSalePrice: number; lastSaleDate: string; equityPercent: number }
  ownership?: { yearsOwned: number; ownerType: string; absenteeOwner: boolean }
}

interface ReapiSkipTraceResult {
  persons: Array<{
    firstName: string
    lastName: string
    fullName: string
    phones: Array<{ number: string; type: string }> | null
    emails: Array<{ email: string }> | null
    address?: { address: string }
  }>
}

async function reapiFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${REAPI_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.reapi.key,
      ...(env.reapi.userId ? { 'x-user-id': env.reapi.userId } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error({ status: res.status, body: errorBody, path }, 'REAPI error')
    throw new Error(`REAPI error ${res.status}: ${errorBody}`)
  }

  return res.json() as Promise<T>
}

async function searchSingleBatch(
  params: Record<string, unknown>
): Promise<ReapiPropertyResult[]> {
  try {
    logger.info({ params }, 'REAPI request params')
    const result = await reapiFetch<{ data: ReapiPropertyResult[] }>('/v2/PropertySearch', params)
    logger.info({ resultKeys: Object.keys(result ?? {}), dataLength: result?.data?.length ?? 0 }, 'REAPI response shape')
    return result.data ?? []
  } catch (err) {
    logger.error({ err, params }, 'REAPI batch FAILED — check params and API key')
    return []
  }
}

/** Deduplicate properties by street address + ZIP */
function deduplicateProperties(properties: ReapiPropertyResult[]): ReapiPropertyResult[] {
  const seen = new Set<string>()
  return properties.filter(p => {
    const key = `${p.address?.street ?? p.address?.address}|${p.address?.zip}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Build REAPI query params from our criteria using correct REAPI v2 parameter names */
function buildReapiParams(criteria: PropertySearchCriteria): Record<string, unknown> {
  const params: Record<string, unknown> = { size: 250 }
  if (criteria.city) params.city = criteria.city
  if (criteria.state) params.state = criteria.state
  if (criteria.zip) params.zip = criteria.zip
  if (criteria.beds_min) params.beds_min = criteria.beds_min
  if (criteria.baths_min) params.baths_min = criteria.baths_min
  if (criteria.price_min) params.value_min = criteria.price_min
  if (criteria.price_max) params.value_max = criteria.price_max
  if (criteria.sqft_min) params.building_size_min = criteria.sqft_min
  if (criteria.sqft_max) params.building_size_max = criteria.sqft_max
  if (criteria.years_owned_min) {
    params.years_owned = criteria.years_owned_min
    params.years_owned_operator = 'gte'
  }
  if (criteria.lot_sqft_min) params.lot_size_min = criteria.lot_sqft_min
  if (criteria.lot_sqft_max) params.lot_size_max = criteria.lot_sqft_max
  if (criteria.property_type) params.property_type = criteria.property_type
  return params
}

/**
 * Page through all REAPI results using resultIndex.
 * Returns up to MAX_PAGES * 250 properties.
 */
async function fetchAllPages(params: Record<string, unknown>): Promise<ReapiPropertyResult[]> {
  const MAX_PAGES = 20 // safety cap: 20 × 250 = 5,000 max
  let allResults: ReapiPropertyResult[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const pageParams = { ...params, resultIndex: page * 250 }
    const batch = await searchSingleBatch(pageParams)
    allResults = [...allResults, ...batch]

    logger.info({ page, resultIndex: page * 250, count: batch.length }, 'REAPI page result')

    // If we got fewer than 250, we've exhausted all results
    if (batch.length < 250) break
  }

  return allResults
}

/**
 * Count-only property search (size: 0). Does NOT consume API credits.
 * Returns the total number of matching properties without fetching records.
 */
export async function countProperties(
  criteria: PropertySearchCriteria
): Promise<number> {
  const params = { ...buildReapiParams(criteria), size: 1 }
  logger.info({ params }, 'REAPI count-only search')

  const result = await reapiFetch<{ resultCount?: number; totalResults?: number; data?: unknown[] }>(
    '/v2/PropertySearch',
    params
  )

  const count = result.resultCount ?? result.totalResults ?? result.data?.length ?? 0
  logger.info({ count }, 'REAPI count result')
  return count
}

/**
 * Search properties using correct REAPI v2 parameter names and pagination.
 *
 * Strategy:
 * 1. Send all filters server-side (beds_min, baths_min, value_min, etc.)
 * 2. Use resultIndex pagination to get past the 250-per-page limit
 * 3. Deduplicate and apply local filters as safety net
 */
export async function searchProperties(
  criteria: PropertySearchCriteria
): Promise<ReapiPropertyResult[]> {
  const params = buildReapiParams(criteria)

  logger.info({ params }, 'REAPI search: fetching all pages')
  const allProperties = await fetchAllPages(params)

  const deduplicated = deduplicateProperties(allProperties)
  logger.info({ total: deduplicated.length, raw: allProperties.length }, 'REAPI search complete')

  return applyFilters(deduplicated, criteria)
}

function applyFilters(properties: ReapiPropertyResult[], criteria: PropertySearchCriteria): ReapiPropertyResult[] {
  let filtered = properties
  if (criteria.price_min) {
    filtered = filtered.filter(p => (p.estimatedValue ?? 0) >= criteria.price_min!)
  }
  if (criteria.price_max) {
    filtered = filtered.filter(p => (p.estimatedValue ?? Infinity) <= criteria.price_max!)
  }
  if (criteria.beds_min) {
    filtered = filtered.filter(p => (p.bedrooms ?? 0) >= criteria.beds_min!)
  }
  if (criteria.baths_min) {
    filtered = filtered.filter(p => (p.bathrooms ?? 0) >= criteria.baths_min!)
  }
  if (criteria.sqft_min) {
    filtered = filtered.filter(p => (p.squareFeet ?? 0) >= criteria.sqft_min!)
  }
  if (criteria.sqft_max) {
    filtered = filtered.filter(p => (p.squareFeet ?? Infinity) <= criteria.sqft_max!)
  }
  if (criteria.years_owned_min) {
    filtered = filtered.filter(p => (p.yearsOwned ?? 0) >= criteria.years_owned_min!)
  }
  logger.info({ before: properties.length, after: filtered.length }, 'REAPI filtered')
  return filtered
}

/** Skip trace a single property by address. Returns owner contact info. */
export async function skipTraceByAddress(address: {
  address: string
  city: string
  state: string
  zip: string
}): Promise<{
  firstName: string
  lastName: string
  phone: string
  email: string
  mailingAddress: string
} | null> {
  try {
    const result = await reapiFetch<ReapiSkipTraceResult>('/v2/SkipTrace', address)
    const person = result.persons?.[0]
    if (!person) return null

    return {
      firstName: person.firstName ?? '',
      lastName: person.lastName ?? '',
      phone: person.phones?.[0]?.number ?? '',
      email: person.emails?.[0]?.email ?? '',
      mailingAddress: person.address?.address ?? '',
    }
  } catch (err) {
    logger.warn({ err, address: address.address }, 'Skip trace failed for address')
    return null
  }
}

export function mapOwnerType(result: ReapiPropertyResult): string {
  if (result.corporateOwned) return 'corporate'
  if (result.absenteeOwner) return 'absentee'
  if (!result.ownerOccupied) return 'absentee'
  return 'owner'
}

export function mapPropertyToDb(result: ReapiPropertyResult, campaignId: string) {
  return {
    campaign_id: campaignId,
    status: result.owner1FirstName ? 'skip_traced' as const : 'found' as const,
    address_line1: result.address?.street ?? result.address?.address ?? '',
    address_line2: '',
    city: result.address?.city ?? '',
    state: result.address?.state ?? '',
    zip: result.address?.zip ?? '',
    county: result.address?.county ?? '',
    neighborhood: result.neighborhood?.name ?? '',
    latitude: result.latitude ?? result.location?.latitude ?? result.lat ?? null,
    longitude: result.longitude ?? result.location?.longitude ?? result.lng ?? null,
    bedrooms: result.bedrooms ?? null,
    bathrooms: result.bathrooms ?? null,
    sqft: result.squareFeet ?? null,
    lot_sqft: result.lotSquareFeet ?? null,
    year_built: result.yearBuilt ?? null,
    estimated_value: result.estimatedValue ?? null,
    last_sale_price: result.lastSaleAmount ? parseInt(result.lastSaleAmount, 10) || null : null,
    last_sale_date: result.lastSaleDate || null,
    equity_percent: result.equityPercent ?? null,
    years_owned: result.yearsOwned ?? null,
    property_type: result.propertyType ?? '',
    owner_type: mapOwnerType(result),
    owner_first_name: result.owner1FirstName ?? null,
    owner_last_name: result.owner1LastName ?? null,
  }
}
