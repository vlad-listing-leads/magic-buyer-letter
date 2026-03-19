import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

export const GET = withAdminGuard(async () => {
  const admin = createAdminClient()

  const { data: users, error } = await admin
    .from('users')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false })

  if (error) return apiError('Failed to fetch users', 500)

  // Get campaign counts per user
  const { data: campaigns } = await admin
    .from('mbl_campaigns')
    .select('user_id')

  const countMap = new Map<string, number>()
  for (const c of campaigns ?? []) {
    countMap.set(c.user_id, (countMap.get(c.user_id) ?? 0) + 1)
  }

  const usersWithCounts = (users ?? []).map(u => ({
    ...u,
    campaign_count: countMap.get(u.id) ?? 0,
  }))

  return apiSuccess(usersWithCounts)
})
