import { NextRequest, NextResponse } from 'next/server'
import { verifyLLToken } from '@/lib/auth/jwt'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('ll-callback')

/**
 * GET /api/auth/ll-callback?token=JWT
 *
 * Cross-app SSO callback from Listing Leads.
 * 1. Validates JWT token signed with CROSS_APP_AUTH_SECRET
 * 2. Creates or syncs local Supabase user
 * 3. Establishes session via magic link OTP
 * 4. Redirects to dashboard
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/'

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 1. Verify JWT from Listing Leads
  const payload = await verifyLLToken(token)
  if (!payload) {
    log.warn('Invalid or expired LL token')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { memberstackId, email, role, name } = payload
  const admin = createAdminClient()

  // 2. Check if user exists in our database
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('memberstack_id', memberstackId)
    .single()

  if (existingUser) {
    // Sync profile fields from LL (name, role may have changed)
    await admin
      .from('users')
      .update({
        email,
        name: name || email,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('memberstack_id', memberstackId)
  }

  // 3. Create or get Supabase Auth user
  let authUserId: string

  const { data: authUsers } = await admin.auth.admin.listUsers()
  const existingAuth = authUsers?.users.find((u) => u.email === email)

  if (existingAuth) {
    authUserId = existingAuth.id
  } else {
    // Create new Supabase Auth user
    const { data: newAuth, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { memberstack_id: memberstackId, name },
    })

    if (createError || !newAuth.user) {
      log.error({ error: createError }, 'Failed to create auth user')
      return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
    }

    authUserId = newAuth.user.id
  }

  // 4. Create local user record if it doesn't exist
  if (!existingUser) {
    const { error: insertError } = await admin.from('users').insert({
      id: authUserId,
      email,
      name: name || email,
      memberstack_id: memberstackId,
      role: role || 'user',
    })

    if (insertError) {
      log.error({ error: insertError }, 'Failed to create user record')
    }
  }

  // 5. Generate magic link to establish session
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    log.error({ error: linkError }, 'Failed to generate magic link')
    return NextResponse.redirect(new URL('/auth/login?error=session_failed', request.url))
  }

  // 6. Verify OTP directly to establish session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

  // Extract the token hash from the link
  const linkUrl = new URL(linkData.properties.action_link)
  const otpToken = linkUrl.searchParams.get('token')

  if (!otpToken) {
    log.error('No token in magic link')
    return NextResponse.redirect(new URL('/auth/login?error=session_failed', request.url))
  }

  // Redirect to auth callback which will verify the OTP and set cookies
  const callbackUrl = new URL('/api/auth/callback', appUrl)
  callbackUrl.searchParams.set('token_hash', otpToken)
  callbackUrl.searchParams.set('type', 'magiclink')
  callbackUrl.searchParams.set('next', returnTo)

  return NextResponse.redirect(callbackUrl)
}
