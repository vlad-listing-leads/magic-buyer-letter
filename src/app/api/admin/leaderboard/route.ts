import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

export const GET = withAdminGuard(async () => {
  const admin = createAdminClient()

  // Fetch non-admin users
  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, name, email')
    .eq('role', 'user')

  if (usersError) return apiError('Failed to fetch users', 500)

  // Fetch all campaigns for aggregation
  const { data: campaigns, error: campaignsError } = await admin
    .from('mbl_campaigns')
    .select('user_id, properties_sent, total_cost_cents')

  if (campaignsError) return apiError('Failed to fetch campaigns', 500)

  // Aggregate per user: total_sent, campaign_count, total_spend
  const statsMap = new Map<string, { total_sent: number; campaign_count: number; total_spend: number }>()

  for (const c of campaigns ?? []) {
    const existing = statsMap.get(c.user_id) ?? { total_sent: 0, campaign_count: 0, total_spend: 0 }
    statsMap.set(c.user_id, {
      total_sent: existing.total_sent + (c.properties_sent ?? 0),
      campaign_count: existing.campaign_count + 1,
      total_spend: existing.total_spend + (c.total_cost_cents ?? 0),
    })
  }

  const leaderboard = (users ?? [])
    .map((u) => {
      const stats = statsMap.get(u.id) ?? { total_sent: 0, campaign_count: 0, total_spend: 0 }
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        total_sent: stats.total_sent,
        campaign_count: stats.campaign_count,
        total_spend: stats.total_spend,
      }
    })
    .filter((u) => u.total_sent > 0)
    .sort((a, b) => b.total_sent - a.total_sent)

  return apiSuccess(leaderboard)
})
