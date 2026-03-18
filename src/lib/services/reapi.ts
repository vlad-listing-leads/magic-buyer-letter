import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { PropertySearchCriteria } from '@/types'

const REAPI_BASE_URL = 'https://api.realestateapi.com'

interface ReapiPropertyResult {
  id: string
  address: {
    line1: string
    line2: string
    city: string
    state: string
    zip: string
    county: string
  }
  location: {
    latitude: number
    longitude: number
  }
  property: {
    bedrooms: number
    bathrooms: number
    sqft: number
    lotSqft: number
    yearBuilt: number
    propertyType: string
  }
  valuation: {
    estimatedValue: number
    lastSalePrice: number
    lastSaleDate: string
    equityPercent: number
  }
  ownership: {
    yearsOwned: number
    ownerType: string
    absenteeOwner: boolean
  }
  neighborhood: string
}

interface ReapiSkipTraceResult {
  propertyId: string
  owner: {
    firstName: string
    lastName: string
    mailingAddress: string
    phone: string
    email: string
  }
}

async function reapiFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${REAPI_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.reapi.key,
      'x-user-id': env.reapi.userId,
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
  const searchParams: Record<string, unknown> = {
    size: 100,
  }

  if (criteria.city) searchParams.city = criteria.city
  if (criteria.state) searchParams.state = criteria.state
  if (criteria.zip) searchParams.zip = criteria.zip
  if (criteria.price_min) searchParams.estimatedValueMin = criteria.price_min
  if (criteria.price_max) searchParams.estimatedValueMax = criteria.price_max
  if (criteria.beds_min) searchParams.bedroomsMin = criteria.beds_min
  if (criteria.baths_min) searchParams.bathroomsMin = criteria.baths_min
  if (criteria.sqft_min) searchParams.sqftMin = criteria.sqft_min
  if (criteria.sqft_max) searchParams.sqftMax = criteria.sqft_max

  const result = await reapiFetch<{ data: ReapiPropertyResult[] }>('/v2/PropertySearch', searchParams)
  return result.data ?? []
}

export async function bulkSkipTrace(
  propertyIds: string[]
): Promise<ReapiSkipTraceResult[]> {
  const results: ReapiSkipTraceResult[] = []
  const batchSize = 50
  const delayMs = 1000

  for (let i = 0; i < propertyIds.length; i += batchSize) {
    const batch = propertyIds.slice(i, i + batchSize)

    const batchResult = await reapiFetch<{ data: ReapiSkipTraceResult[] }>('/v2/BulkSkipTrace', {
      propertyIds: batch,
    })

    results.push(...(batchResult.data ?? []))

    // Rate limit between batches
    if (i + batchSize < propertyIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}

export function mapOwnerType(result: ReapiPropertyResult): string {
  if (result.ownership.absenteeOwner) return 'absentee'
  if (result.ownership.ownerType === 'investor') return 'investor'
  if (result.ownership.ownerType === 'corporate') return 'corporate'
  return 'owner'
}

export function mapPropertyToDb(result: ReapiPropertyResult, campaignId: string) {
  return {
    campaign_id: campaignId,
    status: 'found' as const,
    address_line1: result.address.line1,
    address_line2: result.address.line2 ?? '',
    city: result.address.city,
    state: result.address.state,
    zip: result.address.zip,
    county: result.address.county ?? '',
    neighborhood: result.neighborhood ?? '',
    latitude: result.location?.latitude ?? null,
    longitude: result.location?.longitude ?? null,
    bedrooms: result.property.bedrooms,
    bathrooms: result.property.bathrooms,
    sqft: result.property.sqft,
    lot_sqft: result.property.lotSqft,
    year_built: result.property.yearBuilt,
    estimated_value: result.valuation.estimatedValue,
    last_sale_price: result.valuation.lastSalePrice,
    last_sale_date: result.valuation.lastSaleDate || null,
    equity_percent: result.valuation.equityPercent,
    years_owned: result.ownership.yearsOwned,
    property_type: result.property.propertyType ?? '',
    owner_type: mapOwnerType(result),
  }
}
