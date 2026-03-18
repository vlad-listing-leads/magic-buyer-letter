import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('dev-login')

/**
 * GET /api/auth/dev-login
 *
 * Development-only auth bypass.
 * Creates a dev user and establishes a session without LL SSO.
 * BLOCKED in production by middleware.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  if (process.env.DEV_LOGIN_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Dev login not enabled' }, { status: 403 })
  }

  const email = process.env.DEV_USER_EMAIL || 'dev@localhost.test'
  const admin = createAdminClient()

  // Create or get dev user
  const { data: authUsers } = await admin.auth.admin.listUsers()
  let authUser = authUsers?.users.find((u) => u.email === email)

  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { memberstack_id: 'dev_local', name: 'Dev User' },
    })
    if (error) {
      log.error({ error }, 'Failed to create dev user')
      return NextResponse.json({ error: 'Failed to create dev user' }, { status: 500 })
    }
    authUser = data.user

    // Create user record
    await admin.from('users').upsert({
      id: authUser.id,
      email,
      name: 'Dev User',
      memberstack_id: 'dev_local',
      role: 'admin',
    })
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
  }

  const linkUrl = new URL(linkData.properties.action_link)
  const otpToken = linkUrl.searchParams.get('token')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'
  const callbackUrl = new URL('/api/auth/callback', appUrl)
  callbackUrl.searchParams.set('token_hash', otpToken!)
  callbackUrl.searchParams.set('type', 'magiclink')
  callbackUrl.searchParams.set('next', '/')

  return NextResponse.redirect(callbackUrl)
}
