import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { jwtVerify } from 'jose'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('ll-callback')

interface CrossAppTokenPayload {
  memberstackId: string
  email: string
  role: string
  name?: string
  timestamp: number
}

/**
 * GET /api/auth/ll-callback?token=JWT
 *
 * Listing Leads cross-app SSO callback.
 * Matches ZMA's implementation exactly.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token = searchParams.get('token')

  if (!token) {
    log.warn('ll-callback: missing token')
    return NextResponse.redirect(new URL('/auth/login?error=missing_token', origin))
  }

  const secret = process.env.CROSS_APP_AUTH_SECRET
  if (!secret) {
    log.error('ll-callback: CROSS_APP_AUTH_SECRET not configured')
    return NextResponse.json({ error: 'CROSS_APP_AUTH_SECRET not set' }, { status: 500 })
  }

  // 1. Validate JWT
  let payload: CrossAppTokenPayload
  try {
    const result = await jwtVerify(token, new TextEncoder().encode(secret))
    payload = result.payload as unknown as CrossAppTokenPayload
  } catch (err) {
    log.warn({ err }, 'll-callback: invalid or expired token')
    return NextResponse.json(
      { error: 'JWT verification failed', details: String(err) },
      { status: 401 }
    )
  }

  const { memberstackId, email, role, name } = payload
  if (!memberstackId || !email) {
    return NextResponse.json(
      { error: 'JWT missing required fields', payload },
      { status: 400 }
    )
  }

  const displayName = name || email.split('@')[0]
  const admin = createAdminClient()

  // 2. Create Supabase Auth user (if not exists)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { memberstack_id: memberstackId },
  })

  if (created?.user) {
    // New auth user — create users table row
    log.info({ email, memberstackId }, 'll-callback: created new auth user')
    await admin.from('users').insert({
      id: created.user.id,
      email,
      name: displayName,
      role: role || 'user',
      memberstack_id: memberstackId,
    })

    // Auto-create agent profile
    await admin.from('mbl_agents').insert({
      user_id: created.user.id,
      name: displayName,
      email,
    })
  } else {
    // Auth user already exists — sync profile
    if (createErr) {
      log.info({ email, error: createErr.message }, 'll-callback: auth user exists, syncing')
    }

    const { data: existing } = await admin
      .from('users')
      .select('id, memberstack_id')
      .eq('email', email)
      .single()

    if (existing) {
      await admin
        .from('users')
        .update({
          memberstack_id: memberstackId,
          name: displayName,
          role: role || 'user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      // Ensure agent profile exists
      const { data: existingAgent } = await admin
        .from('mbl_agents')
        .select('id')
        .eq('user_id', existing.id)
        .single()

      if (!existingAgent) {
        await admin.from('mbl_agents').insert({
          user_id: existing.id,
          name: displayName,
          email,
        })
      }
    }
  }

  // 3. Generate magic link OTP
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    log.error({ error: linkError }, 'll-callback: failed to generate magic link')
    return NextResponse.json(
      { error: 'Failed to generate magic link', details: linkError?.message },
      { status: 500 }
    )
  }

  // Extract email_otp (same as ZMA)
  const emailOtp = linkData.properties?.email_otp
  if (!emailOtp) {
    log.error('ll-callback: no email_otp in generateLink response')
    return NextResponse.json(
      { error: 'No email_otp in magic link response' },
      { status: 500 }
    )
  }

  // 4. Verify OTP directly — set session cookies on the redirect response
  const response = NextResponse.redirect(new URL('/', origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name: n, value, options }) => {
            response.cookies.set(n, value, options)
          })
        },
      },
    }
  )

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: emailOtp,
    type: 'magiclink',
  })

  if (verifyError) {
    log.error({ error: verifyError.message }, 'll-callback: OTP verification failed')
    return NextResponse.json(
      { error: 'OTP verification failed', details: verifyError.message },
      { status: 500 }
    )
  }

  log.info({ email }, 'll-callback: session established')
  return response
}
