import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateChannelContent } from '@/lib/services/claude'
import { z } from 'zod'
import type { ChannelContext } from '@/lib/services/claude'

const schema = z.object({
  channel: z.enum(['email', 'text', 'call_script']),
})

/** POST /api/mbl/campaigns/[id]/generate-channel — generate content for a channel */
export const POST = withErrorHandler(async (request: NextRequest, context) => {
  const user = await requireAuth()
  const { id } = await context.params
  const admin = createAdminClient()

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Invalid channel', 400)

  const { channel } = parsed.data

  // Fetch campaign + agent
  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (!campaign || campaign.user_id !== user.id) {
    return apiError('Campaign not found', 404)
  }

  const { data: agent } = await admin
    .from('mbl_agents')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!agent) return apiError('Agent profile not found', 404)

  // Fetch active skill for this channel
  const { data: skill } = await admin
    .from('mbl_skills')
    .select('prompt_instructions')
    .eq('channel', channel)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Build context for generation
  const area = [campaign.criteria_city, campaign.criteria_state].filter(Boolean).join(', ')
  const priceMin = campaign.criteria_price_min
    ? `$${(campaign.criteria_price_min / 1000).toFixed(0)}K`
    : ''
  const priceMax = campaign.criteria_price_max
    ? `$${(campaign.criteria_price_max / 1000).toFixed(0)}K`
    : ''

  const channelContext: ChannelContext = {
    buyer_name: campaign.buyer_name || 'My Buyer',
    area,
    city: campaign.criteria_city || '',
    state: campaign.criteria_state || '',
    price_range: [priceMin, priceMax].filter(Boolean).join('–'),
    financing: campaign.financing || '',
    closing_flexibility: campaign.closing_flexibility || '',
    condition_tolerance: campaign.condition_tolerance || '',
    agent_name: agent.name || '',
    agent_phone: agent.phone || '',
    agent_brokerage: agent.brokerage || '',
  }

  // Generate content — skill prompt overrides the system prompt if available
  const result = await generateChannelContent(channel, channelContext, skill?.prompt_instructions)

  // Upsert into campaign_channels
  const { data: saved, error } = await admin
    .from('mbl_campaign_channels')
    .upsert(
      {
        campaign_id: id,
        channel,
        subject: result.subject ?? null,
        body: result.body,
        status: 'ready',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'campaign_id,channel' }
    )
    .select()
    .single()

  if (error) {
    return apiError('Failed to save channel content', 500)
  }

  return apiSuccess(saved)
})
