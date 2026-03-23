import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/** GET /api/mbl/campaigns/[id]/channels — list generated channels */
export const GET = withErrorHandler(async (_request, context) => {
  const user = await requireAuth()
  const { id } = await context.params
  const admin = createAdminClient()

  // Verify campaign ownership
  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!campaign || campaign.user_id !== user.id) {
    return apiError('Campaign not found', 404)
  }

  const { data: channels, error } = await admin
    .from('mbl_campaign_channels')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at')

  if (error) return apiError('Failed to fetch channels', 500)
  return apiSuccess(channels ?? [])
})
