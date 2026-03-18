import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/services/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  letter_count: z.number().min(1),
})

export const POST = withErrorHandler(async (request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { id } = await context.params

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid input', 400)

  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('*, mbl_agents(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return apiError('Campaign not found', 404)
  if (campaign.status !== 'ready') return apiError('Campaign is not ready to send', 400)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

  const { url, sessionId } = await createCheckoutSession({
    campaignId: id,
    agentId: campaign.agent_id,
    letterCount: parsed.data.letter_count,
    pricePerLetterCents: campaign.price_per_letter_cents,
    successUrl: `${appUrl}/api/mbl/campaigns/${id}/send-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/campaigns/${id}`,
  })

  await admin
    .from('mbl_campaigns')
    .update({
      stripe_session_id: sessionId,
      total_cost_cents: parsed.data.letter_count * campaign.price_per_letter_cents,
    })
    .eq('id', id)

  return apiSuccess({ url })
})
