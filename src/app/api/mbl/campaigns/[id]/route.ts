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

export const DELETE = withErrorHandler(async (_request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { id } = await context.params

  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return apiError('Campaign not found', 404)

  // Only allow deletion of campaigns that haven't been sent
  if (campaign.status === 'sent' || campaign.status === 'sending' || campaign.status === 'delivered') {
    return apiError('Cannot delete a campaign that has already been sent', 400)
  }

  // Delete properties first (FK constraint)
  await admin.from('mbl_properties').delete().eq('campaign_id', id)
  await admin.from('mbl_campaigns').delete().eq('id', id)

  return apiSuccess({ deleted: true })
})

export const PATCH = withErrorHandler(async (request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { id } = await context.params

  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return apiError('Campaign not found', 404)

  const body = await request.json()
  const updateData: Record<string, unknown> = {}

  if (body.status) updateData.status = body.status
  if (body.letter_templates) {
    // Merge with existing templates so edits don't destroy skill templates
    const { data: existing } = await admin
      .from('mbl_campaigns')
      .select('letter_templates')
      .eq('id', id)
      .single()
    const merged = { ...(existing?.letter_templates as Record<string, unknown> ?? {}), ...body.letter_templates }
    updateData.letter_templates = merged
  }

  // Criteria updates
  if (body.criteria) {
    const c = body.criteria
    if (c.city !== undefined) updateData.criteria_city = c.city ?? ''
    if (c.state !== undefined) updateData.criteria_state = c.state ?? ''
    if (c.zip !== undefined) updateData.criteria_zip = c.zip ?? ''
    if (c.price_min !== undefined) updateData.criteria_price_min = c.price_min ?? null
    if (c.price_max !== undefined) updateData.criteria_price_max = c.price_max ?? null
    if (c.beds_min !== undefined) updateData.criteria_beds_min = c.beds_min ?? null
    if (c.baths_min !== undefined) updateData.criteria_baths_min = c.baths_min ?? null
    if (c.sqft_min !== undefined) updateData.criteria_sqft_min = c.sqft_min ?? null
    if (c.sqft_max !== undefined) updateData.criteria_sqft_max = c.sqft_max ?? null
    if (c.years_owned_min !== undefined) updateData.criteria_years_owned_min = c.years_owned_min ?? null
    if (c.lot_sqft_min !== undefined) updateData.criteria_lot_sqft_min = c.lot_sqft_min ?? null
    if (c.lot_sqft_max !== undefined) updateData.criteria_lot_sqft_max = c.lot_sqft_max ?? null
    if (c.property_type !== undefined) updateData.criteria_property_type = c.property_type ?? null
    if (c.neighborhoods !== undefined) updateData.criteria_neighborhoods = c.neighborhoods ?? []
  }

  // Re-search: delete old properties, reset status, clear letter templates
  if (body.re_search) {
    await admin.from('mbl_properties').delete().eq('campaign_id', id)
    updateData.status = 'searching'
    updateData.total_properties = 0
    updateData.properties_skip_traced = 0
    updateData.properties_verified = 0
    updateData.properties_generated = 0
    updateData.letter_templates = null
  }

  if (Object.keys(updateData).length > 0) {
    await admin.from('mbl_campaigns').update(updateData).eq('id', id)
  }

  return apiSuccess({ updated: true })
})
