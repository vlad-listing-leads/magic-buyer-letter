import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { cancelLetter } from '@/lib/services/lob'

export const DELETE = withErrorHandler(async (_request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { lobLetterId } = await context.params

  // Find the property with this letter ID, verify ownership
  const { data: property } = await admin
    .from('mbl_properties')
    .select('*, mbl_campaigns!inner(user_id)')
    .eq('lob_letter_id', lobLetterId)
    .single()

  if (!property) return apiError('Letter not found', 404)

  const campaign = (property as Record<string, unknown>).mbl_campaigns as { user_id: string }
  if (campaign.user_id !== user.id) return apiError('Unauthorized', 403)

  // Cancel via Lob
  try {
    await cancelLetter(lobLetterId)
  } catch {
    return apiError('Failed to cancel letter — may be past cancellation window', 400)
  }

  await admin
    .from('mbl_properties')
    .update({ status: 'cancelled', delivery_status: 'cancelled' })
    .eq('lob_letter_id', lobLetterId)

  return apiSuccess({ cancelled: true })
})
