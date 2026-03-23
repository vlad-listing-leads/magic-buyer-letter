import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'

/** GET /api/allowed-plans — returns list of allowed memberstack plan IDs */
export const GET = withErrorHandler(async () => {
  const user = await getAuthUser()
  if (!user) return apiError('Unauthorized', 401)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('allowed_plans')
    .select('memberstack_plan_id')

  if (error) return apiError('Failed to fetch allowed plans', 500)

  const allowedIds = (data ?? []).map((row) => row.memberstack_plan_id)
  return apiSuccess(allowedIds)
})
