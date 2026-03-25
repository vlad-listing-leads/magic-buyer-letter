import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateChannelSchema = z.object({
  channelId: z.string().uuid(),
  subject: z.string().optional(),
  body: z.string().min(1),
})

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

/** PATCH /api/mbl/campaigns/[id]/channels — update channel content */
export const PATCH = withErrorHandler(async (request: NextRequest, context) => {
  const user = await requireAuth()
  const { id } = await context.params
  const admin = createAdminClient()

  const body = await request.json()
  const parsed = updateChannelSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)

  // Verify campaign ownership
  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!campaign || campaign.user_id !== user.id) {
    return apiError('Campaign not found', 404)
  }

  const updateData: Record<string, string> = { body: parsed.data.body }
  if (parsed.data.subject !== undefined) updateData.subject = parsed.data.subject

  const { data: updated, error } = await admin
    .from('mbl_campaign_channels')
    .update(updateData)
    .eq('id', parsed.data.channelId)
    .eq('campaign_id', id)
    .select()
    .single()

  if (error) return apiError('Failed to update channel', 500)
  return apiSuccess(updated)
})
