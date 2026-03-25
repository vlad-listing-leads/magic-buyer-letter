import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const selectSchema = z.object({
  propertyId: z.string().uuid(),
  selected: z.boolean(),
})

/** PATCH /api/mbl/campaigns/[id]/properties/select — toggle property selected state */
export const PATCH = withErrorHandler(async (request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { id } = await context.params

  const body = await request.json()
  const parsed = selectSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)

  // Verify campaign belongs to user
  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return apiError('Campaign not found', 404)

  // Update property selected state
  const { error } = await admin
    .from('mbl_properties')
    .update({ selected: parsed.data.selected })
    .eq('id', parsed.data.propertyId)
    .eq('campaign_id', id)

  if (error) return apiError('Failed to update property', 500)

  return apiSuccess({ propertyId: parsed.data.propertyId, selected: parsed.data.selected })
})
