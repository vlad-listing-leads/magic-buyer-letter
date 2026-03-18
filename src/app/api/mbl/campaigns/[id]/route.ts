import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'

export const GET = withErrorHandler(async (_request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { id } = await context.params

  const { data: campaign, error } = await admin
    .from('mbl_campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !campaign) {
    return apiError('Campaign not found', 404)
  }

  const { data: properties } = await admin
    .from('mbl_properties')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  return apiSuccess({ campaign, properties: properties ?? [] })
})
