import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { getListingLeadsProfile } from '@/lib/supabase/listing-leads'

/**
 * GET /api/user/ll-profile
 * Fetches the current user's profile from the Listing Leads database.
 * Returns display-only data — users must edit on listingleads.com.
 */
export async function GET() {
  try {
    const authUser = await requireAuth()
    const admin = createAdminClient()

    // Look up memberstack_id from users table (by id, not email — email is mutable)
    const { data: user } = await admin
      .from('users')
      .select('memberstack_id')
      .eq('id', authUser.id)
      .single()

    if (!user?.memberstack_id) {
      return apiError('No Listing Leads account linked', 404)
    }

    const profile = await getListingLeadsProfile(user.memberstack_id)

    if (!profile) {
      return apiError('Listing Leads profile not found', 404)
    }

    return apiSuccess(profile)
  } catch {
    return apiError('Unauthorized', 401)
  }
}
