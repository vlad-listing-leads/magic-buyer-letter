import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { jwtVerify } from 'jose'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('ll-callback')

/**
 * GET /api/auth/ll-callback?token=JWT
 *
 * Cross-app SSO callback from Listing Leads.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 400 })
  }

  // 1. Verify JWT — with detailed error reporting
  const secret = process.env.CROSS_APP_AUTH_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CROSS_APP_AUTH_SECRET not set' }, { status: 500 })
  }

  let payload: Record<string, unknown>
  try {
    const key = new TextEncoder().encode(secret)
    const result = await jwtVerify(token, key, { algorithms: ['HS256'] })
    payload = result.payload as Record<string, unknown>
  } catch (err) {
    return NextResponse.json(
      { error: 'JWT verification failed', details: String(err) },
      { status: 401 }
    )
  }

  const memberstackId = payload.memberstackId as string
  const email = payload.email as string
  const role = (payload.role as string) || 'user'
  const name = (payload.name as string) || email

  if (!memberstackId || !email) {
    return NextResponse.json(
      { error: 'JWT missing required fields', payload },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // 2. Find or create Supabase Auth user
  let authUserId: string

  const { data: authUsers, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json(
      { error: 'Failed to list auth users', details: listError.message },
      { status: 500 }
    )
  }

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
      .update({ email, name, role, updated_at: new Date().toISOString() })
      .eq('memberstack_id', memberstackId)
  } else {
    const { error: insertError } = await admin.from('users').insert({
      id: authUserId,
      email,
      name,
      memberstack_id: memberstackId,
      role,
    })

    if (insertError) {
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
    return NextResponse.json(
      { error: 'Failed to generate magic link', details: linkError?.message },
      { status: 500 }
    )
  }

  const linkUrl = new URL(linkData.properties.action_link)
  const otpToken = linkUrl.searchParams.get('token')

  if (!otpToken) {
    return NextResponse.json(
      { error: 'No token in magic link', actionLink: linkData.properties.action_link },
      { status: 500 }
    )
  }

  // 5. Verify OTP and set session cookies on the redirect
  const response = NextResponse.redirect(new URL('/', appUrl))

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

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: otpToken,
  })

  if (otpError) {
    return NextResponse.json(
      { error: 'OTP verification failed', details: otpError.message },
      { status: 500 }
    )
  }

  return response
}
