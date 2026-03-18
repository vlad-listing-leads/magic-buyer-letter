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
  latitude: number
  longitude: number
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
  // REAPI only supports location-based search params
  const searchParams: Record<string, unknown> = {
    size: 25,
  }

  if (criteria.city) searchParams.city = criteria.city
  if (criteria.state) searchParams.state = criteria.state
  if (criteria.zip) searchParams.zip = criteria.zip

  const result = await reapiFetch<{ data: ReapiPropertyResult[] }>('/v2/PropertySearch', searchParams)
  let properties = result.data ?? []

  // Filter results client-side for price, beds, baths, sqft
  if (criteria.price_min) {
    properties = properties.filter(p => (p.estimatedValue ?? 0) >= criteria.price_min!)
  }
  if (criteria.price_max) {
    properties = properties.filter(p => (p.estimatedValue ?? Infinity) <= criteria.price_max!)
  }
  if (criteria.beds_min) {
    properties = properties.filter(p => (p.bedrooms ?? 0) >= criteria.beds_min!)
  }
  if (criteria.baths_min) {
    properties = properties.filter(p => (p.bathrooms ?? 0) >= criteria.baths_min!)
  }
  if (criteria.sqft_min) {
    properties = properties.filter(p => (p.squareFeet ?? 0) >= criteria.sqft_min!)
  }
  if (criteria.sqft_max) {
    properties = properties.filter(p => (p.squareFeet ?? Infinity) <= criteria.sqft_max!)
  }

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
    latitude: result.latitude ?? null,
    longitude: result.longitude ?? null,
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
