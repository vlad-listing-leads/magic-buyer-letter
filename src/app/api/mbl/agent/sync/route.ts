import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { getListingLeadsProfile } from '@/lib/supabase/listing-leads'

/**
 * POST /api/mbl/agent/sync
 * Re-syncs agent profile from Listing Leads without requiring logout/login.
 */
export const POST = withErrorHandler(async () => {
  const user = await requireAuth()
  const admin = createAdminClient()

  // Get user's memberstack_id
  const { data: userRecord } = await admin
    .from('users')
    .select('memberstack_id')
    .eq('id', user.id)
    .single()

  if (!userRecord?.memberstack_id) {
    return apiError('No Listing Leads account linked', 400)
  }

  // Fetch fresh profile from LL
  const llProfile = await getListingLeadsProfile(userRecord.memberstack_id)
  if (!llProfile) {
    return apiError('Could not fetch profile from Listing Leads', 502)
  }

  // Build update data from LL fields
  const f = llProfile.fields
  const fullName = [llProfile.firstName, llProfile.lastName].filter(Boolean).join(' ')
  const agentData: Record<string, string> = {}
  if (fullName) agentData.name = fullName
  if (f.email) agentData.email = f.email
  if (f.phone) agentData.phone = f.phone
  if (f.brokerage) agentData.brokerage = f.brokerage
  if (f.license_number) agentData.license_number = f.license_number
  if (f.website) agentData.website = f.website
  if (f.headshot) agentData.headshot_url = f.headshot
  if (f.logo) agentData.logo_url = f.logo
  if (f.address) agentData.address_line1 = f.address

  // Upsert agent record
  const { data: existingAgent } = await admin
    .from('mbl_agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingAgent) {
    await admin
      .from('mbl_agents')
      .update({ ...agentData, updated_at: new Date().toISOString() })
      .eq('id', existingAgent.id)
  } else {
    await admin.from('mbl_agents').insert({
      user_id: user.id,
      name: fullName || user.email!,
      email: llProfile.email,
      ...agentData,
    })
  }

  // Return updated agent
  const { data: agent } = await admin
    .from('mbl_agents')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return apiSuccess(agent)
})
