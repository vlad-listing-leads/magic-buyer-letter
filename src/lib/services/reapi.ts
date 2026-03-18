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
  // Nested access helpers
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
    address: { address: string } | null
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

export async function searchProperties(
  criteria: PropertySearchCriteria
): Promise<ReapiPropertyResult[]> {
  // REAPI v2 uses snake_case params
  const searchParams: Record<string, unknown> = {
    size: 100,
    property_type: 'SFR',
  }

  // Location — REAPI uses zip_codes (array), city, state
  if (criteria.zip) searchParams.zip_codes = [criteria.zip]
  if (criteria.city) searchParams.city = criteria.city
  if (criteria.state) searchParams.state = criteria.state

  // Server-side filters (snake_case field names)
  if (criteria.price_min) searchParams.estimated_value_min = criteria.price_min
  if (criteria.price_max) searchParams.estimated_value_max = criteria.price_max
  if (criteria.beds_min) searchParams.bedrooms_min = criteria.beds_min
  if (criteria.baths_min) searchParams.bathrooms_min = criteria.baths_min
  if (criteria.sqft_min) searchParams.living_area_min = criteria.sqft_min
  if (criteria.sqft_max) searchParams.living_area_max = criteria.sqft_max

  logger.info({ searchParams }, 'REAPI search params')

  const result = await reapiFetch<{ data: ReapiPropertyResult[] }>('/v2/PropertySearch', searchParams)
  const properties = result.data ?? []

  logger.info({
    returned: properties.length,
    hasCoords: properties.filter(p => p.latitude || p.location?.latitude || p.lat).length,
    sampleKeys: properties[0] ? Object.keys(properties[0]).slice(0, 10) : [],
  }, 'REAPI search results')

  return properties
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
    status: 'found' as const,
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
  }
}
