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
    const result = await reapiFetch<{ data: ReapiPropertyResult[] }>('/v2/PropertySearch', params)
    return result.data ?? []
  } catch (err) {
    logger.warn({ err, params }, 'REAPI batch failed')
    return []
  }
}

/**
 * Search properties with automatic expansion to get past the 250 limit.
 *
 * Strategy: first search by city/state. If we hit 250 (cap), search each
 * unique ZIP found in results individually. Each ZIP can return up to 250.
 * For single-ZIP areas, we additionally split by value ranges to get more.
 */
export async function searchProperties(
  criteria: PropertySearchCriteria
): Promise<ReapiPropertyResult[]> {
  const { getCityZips } = await import('@/lib/city-zips')

  // Step 1: Initial search by city/state
  const initialParams: Record<string, unknown> = { size: 250 }
  if (criteria.city) initialParams.city = criteria.city
  if (criteria.state) initialParams.state = criteria.state
  if (criteria.zip) initialParams.zip = criteria.zip

  logger.info({ initialParams }, 'REAPI step 1: initial search')
  const initialResults = await searchSingleBatch(initialParams)
  logger.info({ count: initialResults.length }, 'REAPI step 1 results')

  // If under cap, that's everything — no expansion needed
  if (initialResults.length < 250) {
    return applyFilters(initialResults, criteria)
  }

  // Step 2: Collect all ZIPs to search
  const allZips = new Set<string>()
  for (const p of initialResults) {
    if (p.address?.zip) allZips.add(p.address.zip)
  }
  for (const z of getCityZips(criteria.city)) allZips.add(z)
  if (criteria.zip) allZips.add(criteria.zip)

  const zipsToSearch = Array.from(allZips)
  logger.info({ zips: zipsToSearch, count: zipsToSearch.length }, 'REAPI step 2: expanding by ZIP')

  // Step 3: Search each ZIP. If a ZIP returns 250, split it by value ranges.
  let allProperties: ReapiPropertyResult[] = []

  for (const zip of zipsToSearch) {
    const baseParams = { size: 250, zip, ...(criteria.state ? { state: criteria.state } : {}) }
    const zipResults = await searchSingleBatch(baseParams)
    allProperties = [...allProperties, ...zipResults]

    logger.info({ zip, count: zipResults.length }, 'REAPI ZIP result')

    // If this ZIP hit 250, split by value ranges to get more
    if (zipResults.length >= 250) {
      logger.info({ zip }, 'REAPI ZIP hit cap, splitting by value ranges')

      // Determine value ranges from what we got
      const values = zipResults
        .map(p => p.estimatedValue)
        .filter(v => v > 0)
        .sort((a, b) => a - b)

      if (values.length > 0) {
        // Split into ranges: 0-median, median-max*2
        const median = values[Math.floor(values.length / 2)]
        const ranges = [
          { min: 0, max: Math.floor(median * 0.5) },
          { min: Math.floor(median * 0.5), max: median },
          { min: median, max: Math.floor(median * 1.5) },
          { min: Math.floor(median * 1.5), max: Math.floor(median * 3) },
          { min: Math.floor(median * 3), max: 99999999 },
        ]

        for (const range of ranges) {
          try {
            const rangeResults = await searchSingleBatch({
              ...baseParams,
              estimated_value_min: range.min,
              estimated_value_max: range.max,
            })
            allProperties = [...allProperties, ...rangeResults]
            logger.info({ zip, range: `${range.min}-${range.max}`, count: rangeResults.length }, 'REAPI value range result')
          } catch {
            // If value range params not supported, skip silently
            logger.info({ zip }, 'REAPI value range params not supported, skipping')
            break
          }
        }
      }
    }
  }

  // Deduplicate by address
  const seen = new Set<string>()
  allProperties = allProperties.filter(p => {
    const key = `${p.address?.street ?? p.address?.address}|${p.address?.zip}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  logger.info({ total: allProperties.length, zips: zipsToSearch.length }, 'REAPI total after dedup')

  return applyFilters(allProperties, criteria)
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
