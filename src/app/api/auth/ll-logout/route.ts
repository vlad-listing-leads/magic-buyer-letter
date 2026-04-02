import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('ll-logout')

/**
 * POST /api/auth/ll-logout
 * Called by Listing Leads when a user logs out.
 * Revokes the user's Supabase session so they're logged out of MBL too.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CROSS_APP_AUTH_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    log.warn('ll-logout: invalid or missing authorization')
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const memberstackId = body?.memberstack_id

  if (!memberstackId) {
    return new Response('Missing memberstack_id', { status: 400 })
  }

  const admin = createAdminClient()

  // Find user by memberstack_id
  const { data: user } = await admin
    .from('users')
    .select('id')
    .eq('memberstack_id', memberstackId)
    .maybeSingle()

  if (!user) {
    log.info({ memberstackId }, 'll-logout: user not found (may not have used MBL)')
    return Response.json({ success: true })
  }

  // Revoke all sessions by updating the user's ban status temporarily,
  // then unbanning — this invalidates all existing refresh tokens.
  // There's no admin.signOut(userId) in supabase-js.
  const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: '1s', // ban for 1 second — immediately invalidates all sessions
  })

  if (banError) {
    log.error({ memberstackId, userId: user.id, error: banError.message }, 'll-logout: ban failed')
    return Response.json({ success: false, error: 'Failed to revoke session' }, { status: 500 })
  }

  // Unban immediately so they can log in again via SSO
  await admin.auth.admin.updateUserById(user.id, {
    ban_duration: 'none',
  })

  log.info({ memberstackId, userId: user.id }, 'll-logout: session revoked via ban cycle')

  return Response.json({ success: true })
}
