import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifyLLToken } from '@/lib/auth/jwt'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('ll-callback')

/**
 * GET /api/auth/ll-callback?token=JWT
 *
 * Cross-app SSO callback from Listing Leads.
 * 1. Validates JWT token signed with CROSS_APP_AUTH_SECRET
 * 2. Creates or syncs Supabase Auth user + local user record
 * 3. Verifies OTP to establish session with cookies on the redirect
 * 4. Redirects to dashboard
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login?error=no_token', request.url))
  }

  // 1. Verify JWT from Listing Leads
  const payload = await verifyLLToken(token)
  if (!payload) {
    log.warn('Invalid or expired LL token')
    return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url))
  }

  const { memberstackId, email, role, name } = payload
  const admin = createAdminClient()

  // 2. Find or create Supabase Auth user
  let authUserId: string

  const { data: authUsers } = await admin.auth.admin.listUsers()
  const existingAuth = authUsers?.users.find((u) => u.email === email) ?? null

  if (existingAuth) {
    authUserId = existingAuth.id
  } else {
    const { data: newAuth, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { memberstack_id: memberstackId, name },
    })

    if (createError || !newAuth.user) {
      log.error({ error: createError }, 'Failed to create auth user')
      return NextResponse.json(
        { error: 'Failed to create auth user', details: createError?.message },
        { status: 500 }
      )
    }

    authUserId = newAuth.user.id
  }

  // 3. Upsert local user record
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('memberstack_id', memberstackId)
    .single()

  if (existingUser) {
    await admin
      .from('users')
      .update({
        email,
        name: name || email,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('memberstack_id', memberstackId)
  } else {
    const { error: insertError } = await admin.from('users').insert({
      id: authUserId,
      email,
      name: name || email,
      memberstack_id: memberstackId,
      role: role || 'user',
    })

    if (insertError) {
      log.error({ error: insertError }, 'Failed to create user record')
      return NextResponse.json(
        { error: 'Failed to create user record', details: insertError.message },
        { status: 500 }
      )
    }
  }

  // 4. Generate magic link OTP
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    log.error({ error: linkError }, 'Failed to generate magic link')
    return NextResponse.json(
      { error: 'Failed to generate magic link', details: linkError?.message },
      { status: 500 }
    )
  }

  const linkUrl = new URL(linkData.properties.action_link)
  const otpToken = linkUrl.searchParams.get('token')

  if (!otpToken) {
    log.error({ actionLink: linkData.properties.action_link }, 'No token in magic link')
    return NextResponse.json(
      { error: 'No token in magic link' },
      { status: 500 }
    )
  }

  // 5. Verify OTP and set session cookies directly on the redirect response
  const redirectUrl = new URL(returnTo, appUrl)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: otpToken,
  })

  if (otpError) {
    log.error({ error: otpError }, 'OTP verification failed')
    return NextResponse.json(
      { error: 'OTP verification failed', details: otpError.message },
      { status: 500 }
    )
  }

  return response
}
