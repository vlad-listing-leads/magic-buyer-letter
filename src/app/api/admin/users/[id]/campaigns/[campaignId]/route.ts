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

  const { data: properties } = await admin
    .from('mbl_properties')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  return apiSuccess({ campaign, properties: properties ?? [] })
})
