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

  // Revoke all sessions for this user
  await admin.auth.admin.signOut(user.id, 'global')
  log.info({ memberstackId, userId: user.id }, 'll-logout: session revoked')

  return Response.json({ success: true })
}
