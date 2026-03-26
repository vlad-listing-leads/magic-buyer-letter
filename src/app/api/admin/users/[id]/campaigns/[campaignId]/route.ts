import { NextRequest } from 'next/server'
import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

export const GET = withAdminGuard(async (_request: NextRequest, context) => {
  const admin = createAdminClient()
  const { campaignId } = await context.params

  const { data: campaign, error } = await admin
    .from('mbl_campaigns')
    .select('*, mbl_agents(*)')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) return apiError('Campaign not found', 404)

  const [propertiesResult, channelsResult] = await Promise.all([
    admin
      .from('mbl_properties')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true }),
    admin
      .from('mbl_campaign_channels')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at'),
  ])

  return apiSuccess({
    campaign,
    properties: propertiesResult.data ?? [],
    channels: channelsResult.data ?? [],
  })
})
