import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const parseSchema = z.object({
  text: z.string().min(1),
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireAuth()

  const body = await request.json()
  const parsed = parseSchema.safeParse(body)
  if (!parsed.success) return apiError('Text is required', 400)

  const { text } = parsed.data

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `You extract structured buyer search criteria from natural language descriptions written by real estate agents. Return ONLY valid JSON, no explanation.

Extract these fields:
- buyer_name: string (the buyer's name, e.g. "Sarah and Mike")
- city: string or null (city they want to buy in)
- state: string or null (2-letter state code, e.g. "MA")
- zip: string or null (5-digit ZIP code)
- price_min: number or null (minimum price in dollars, e.g. 800000)
- price_max: number or null (maximum price in dollars, e.g. 1200000)
- beds_min: number or null (minimum bedrooms)
- baths_min: number or null (minimum bathrooms)
- sqft_min: number or null (minimum square feet)
- sqft_max: number or null (maximum square feet)
- years_owned_min: number or null (minimum years the owner has owned the property. "any" = 0, "3+" = 3, "5+" = 5, "10+" = 10, "20+" = 20)
- lot_sqft_min: number or null (minimum lot size in square feet. Convert acres: 1 acre = 43560 sqft. "half acre" = 21780, "quarter acre" = 10890)
- lot_sqft_max: number or null (maximum lot size in square feet)
- property_type: string or null (one of: "SFR", "MFR", "CONDO", "MOBILE", "LAND", "OTHER". Map: "single family"/"house"/"townhouse"/"townhome" = "SFR", "condo"/"condominium" = "CONDO", "duplex"/"triplex"/"multi-family"/"multifamily" = "MFR", "mobile home"/"manufactured" = "MOBILE", "lot"/"land"/"vacant" = "LAND")
- financing: string or null (one of: "pre-approved", "cash", "fha", "va", "conventional")
- closing_flexibility: string or null (one of: "flexible", "quick-close", "30-days", "no-rush", "rent-back")
- condition_tolerance: string or null (one of: "minor-updates", "as-is", "move-in-ready", "major-reno")
- notes: string or null (any other relevant details about the buyer not covered above)

Convert shorthand: "800K" = 800000, "1.2M" = 1200000, "3bd" = 3 beds, etc.
Map natural language: "flexible closing" = "flexible", "quick close" = "quick-close", "major reno ok" = "major-reno", "as-is" = "as-is", "move-in ready" = "move-in-ready", "minor updates" = "minor-updates", "any years owned" = 0.
If a field isn't mentioned, set it to null.
If no buyer name is found, use "My Buyer".`,
        messages: [
          { role: 'user', content: text },
        ],
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      logger.error({ status: res.status, body: errBody, hasKey: !!env.anthropic.apiKey, keyPrefix: env.anthropic.apiKey?.slice(0, 10) }, 'Claude parse error')
      return apiError(`Failed to parse buyer description (${res.status})`, 500)
    }

    const result = await res.json()
    const content = result.content?.[0]?.text ?? '{}'

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.error({ content }, 'Claude returned non-JSON')
      return apiError('Failed to parse response', 500)
    }

    const criteria = JSON.parse(jsonMatch[0])

    return apiSuccess(criteria)
  } catch (err) {
    logger.error({ err }, 'Parse buyer error')
    return apiError('Failed to parse buyer description', 500)
  }
})
