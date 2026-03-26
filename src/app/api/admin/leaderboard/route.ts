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

  // Fetch campaigns with letter_templates (letter generated = has keys in letter_templates)
  const { data: campaigns, error: campaignsError } = await admin
    .from('mbl_campaigns')
    .select('id, user_id, letter_templates')

  if (campaignsError) return apiError('Failed to fetch campaigns', 500)

  // Fetch all generated channels (email, text, call_script)
  const { data: channels, error: channelsError } = await admin
    .from('mbl_campaign_channels')
    .select('campaign_id, channel')

  if (channelsError) return apiError('Failed to fetch channels', 500)

  // Build channel count per campaign
  const channelCountMap = new Map<string, number>()
  for (const ch of channels ?? []) {
    channelCountMap.set(ch.campaign_id, (channelCountMap.get(ch.campaign_id) ?? 0) + 1)
  }

  // Aggregate per user: points (10 per content type), campaign_count, content breakdown
  const POINTS_PER_CONTENT = 10
  const statsMap = new Map<string, { points: number; campaign_count: number; letters: number; channels: number }>()

  for (const c of campaigns ?? []) {
    const existing = statsMap.get(c.user_id) ?? { points: 0, campaign_count: 0, letters: 0, channels: 0 }
    const templates = c.letter_templates as Record<string, unknown> | null
    const hasLetter = templates && Object.keys(templates).length > 0 ? 1 : 0
    const channelCount = channelCountMap.get(c.id) ?? 0

    statsMap.set(c.user_id, {
      points: existing.points + (hasLetter + channelCount) * POINTS_PER_CONTENT,
      campaign_count: existing.campaign_count + 1,
      letters: existing.letters + hasLetter,
      channels: existing.channels + channelCount,
    })
  }

  const leaderboard = (users ?? [])
    .map((u) => {
      const stats = statsMap.get(u.id) ?? { points: 0, campaign_count: 0, letters: 0, channels: 0 }
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        points: stats.points,
        campaign_count: stats.campaign_count,
        letters_generated: stats.letters,
        channels_generated: stats.channels,
      }
    })
    .filter((u) => u.points > 0)
    .sort((a, b) => b.points - a.points)

  return apiSuccess(leaderboard)
})
