import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'

/** GET /api/mbl/channels — all generated channels for the current user's campaigns */
export const GET = withErrorHandler(async () => {
  const user = await requireAuth()
  const admin = createAdminClient()

  // Get user's campaign IDs
  const { data: campaigns } = await admin
    .from('mbl_campaigns')
    .select('id')
    .eq('user_id', user.id)

  const campaignIds = (campaigns ?? []).map(c => c.id)
  if (campaignIds.length === 0) return apiSuccess([])

  const { data: channels, error } = await admin
    .from('mbl_campaign_channels')
    .select('id, campaign_id, channel')
    .in('campaign_id', campaignIds)

  if (error) return apiError('Failed to fetch channels', 500)
  return apiSuccess(channels ?? [])
})
