import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { generateChannelContent } from '@/lib/services/claude'
import { logger } from '@/lib/logger'
import type { ChannelContext } from '@/lib/services/claude'
import { z } from 'zod'

const campaignCreateSchema = z.object({
  buyer_name: z.string().default('My Buyer'),
  buyer_description: z.string().default(''),
  criteria: z.object({
    price_min: z.number().optional(),
    price_max: z.number().optional(),
    beds_min: z.number().optional(),
    baths_min: z.number().optional(),
    sqft_min: z.number().optional(),
    sqft_max: z.number().optional(),
    years_owned_min: z.number().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }),
  template_style: z.enum(['warm', 'direct', 'luxury']).optional().default('warm'),
  bullet_1: z.string().default(''),
  bullet_2: z.string().default(''),
  bullet_3: z.string().default(''),
  bullet_4: z.string().optional(),
  financing: z.string().optional(),
  closing_flexibility: z.string().optional(),
  condition_tolerance: z.string().optional(),
  additional_notes: z.string().optional(),
  selected_channels: z.array(z.string()).optional().default([]),
})

// GET — list campaigns
export async function GET() {
  try {
    const user = await requireAuth()
    const admin = createAdminClient()

    const { data: campaigns, error } = await admin
      .from('mbl_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return apiError('Failed to fetch campaigns', 500)
    return apiSuccess(campaigns)
  } catch {
    return apiError('Unauthorized', 401)
  }
}

// POST — create campaign and return ID (pipeline runs separately via GET [id]/pipeline)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = campaignCreateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)
    }

    const data = parsed.data
    const admin = createAdminClient()

    // Get agent profile
    const { data: agent } = await admin
      .from('mbl_agents')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!agent) {
      return apiError('Please set up your agent profile first', 400)
    }

    // Create campaign record
    const { data: campaign, error: createError } = await admin
      .from('mbl_campaigns')
      .insert({
        user_id: user.id,
        agent_id: agent.id,
        status: 'searching',
        selected_channels: data.selected_channels,
        buyer_name: data.buyer_name,
        buyer_description: data.buyer_description,
        criteria_price_min: data.criteria.price_min ?? null,
        criteria_price_max: data.criteria.price_max ?? null,
        criteria_beds_min: data.criteria.beds_min ?? null,
        criteria_baths_min: data.criteria.baths_min ?? null,
        criteria_sqft_min: data.criteria.sqft_min ?? null,
        criteria_sqft_max: data.criteria.sqft_max ?? null,
        criteria_years_owned_min: data.criteria.years_owned_min ?? null,
        criteria_area: data.criteria.area ?? '',
        criteria_city: data.criteria.city ?? '',
        criteria_state: data.criteria.state ?? '',
        criteria_zip: data.criteria.zip ?? '',
        template_style: data.template_style,
        bullet_1: data.bullet_1,
        bullet_2: data.bullet_2,
        bullet_3: data.bullet_3,
        bullet_4: data.bullet_4 ?? null,
        ...(data.financing ? { financing: data.financing } : {}),
        ...(data.closing_flexibility ? { closing_flexibility: data.closing_flexibility } : {}),
        ...(data.condition_tolerance ? { condition_tolerance: data.condition_tolerance } : {}),
        ...(data.additional_notes ? { additional_notes: data.additional_notes } : {}),
      })
      .select()
      .single()

    if (createError || !campaign) {
      return apiError('Failed to create campaign', 500)
    }

    // Auto-generate non-letter channels in background
    const nonLetterChannels = data.selected_channels.filter(
      (ch: string) => ch !== 'letter' && ch !== 'social_post'
    )
    if (nonLetterChannels.length > 0) {
      const area = [data.criteria.city, data.criteria.state].filter(Boolean).join(', ')
      const priceMin = data.criteria.price_min ? `$${(data.criteria.price_min / 1000).toFixed(0)}K` : ''
      const priceMax = data.criteria.price_max ? `$${(data.criteria.price_max / 1000).toFixed(0)}K` : ''

      const channelContext: ChannelContext = {
        buyer_name: data.buyer_name,
        area,
        city: data.criteria.city || '',
        state: data.criteria.state || '',
        price_range: [priceMin, priceMax].filter(Boolean).join('–'),
        financing: data.financing || '',
        closing_flexibility: data.closing_flexibility || '',
        condition_tolerance: data.condition_tolerance || '',
        agent_name: agent.name || '',
        agent_phone: agent.phone || '',
        agent_brokerage: agent.brokerage || '',
      }

      // Fire-and-forget — don't block response
      Promise.all(
        nonLetterChannels.map(async (channel: string) => {
          try {
            const result = await generateChannelContent(channel, channelContext)
            await admin
              .from('mbl_campaign_channels')
              .upsert({
                campaign_id: campaign.id,
                channel,
                subject: result.subject ?? null,
                body: result.body,
                status: 'ready',
              }, { onConflict: 'campaign_id,channel' })
            logger.info({ campaignId: campaign.id, channel }, 'Auto-generated channel')
          } catch (err) {
            logger.error({ err, channel, campaignId: campaign.id }, 'Failed to auto-generate channel')
          }
        })
      ).catch(() => {})  // swallow unhandled rejection
    }

    return apiSuccess({ id: campaign.id }, 201)
  } catch {
    return apiError('Unauthorized', 401)
  }
}
