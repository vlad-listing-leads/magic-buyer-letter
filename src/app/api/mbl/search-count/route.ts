import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth } from '@/lib/supabase/server'
import { countProperties } from '@/lib/services/reapi'
import { z } from 'zod'

const searchCountSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  beds_min: z.number().optional(),
  baths_min: z.number().optional(),
  sqft_min: z.number().optional(),
  sqft_max: z.number().optional(),
  years_owned_min: z.number().optional(),
})

/** POST /api/mbl/search-count — count matching properties without consuming credits */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireAuth()

  const body = await request.json()
  const parsed = searchCountSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? 'Invalid criteria', 400)
  }

  const criteria = parsed.data
  if (!criteria.city && !criteria.zip) {
    return apiError('Location (city or zip) is required', 400)
  }

  const count = await countProperties(criteria)

  return apiSuccess({ count })
})
