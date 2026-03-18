import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess } from '@/lib/api/response'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export const GET = withErrorHandler(async () => {
  const user = await requireAuth()
  const admin = createAdminClient()

  const { data: agent } = await admin
    .from('mbl_agents')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return apiSuccess(agent)
})
