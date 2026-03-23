import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { jwtVerify } from 'jose'
import { createAdminClient } from '@/lib/supabase/server'
import { getListingLeadsProfile, createListingLeadsClient } from '@/lib/supabase/listing-leads'
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
 * Syncs profile data from LL on every login (same as ZMA).
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

  // 1b. Fetch plan data from satellite verify endpoint (must happen early — JWT expires in 60s)
  let activePlanIds: string[] = []
  let isTeamMember = false
  try {
    const verifyRes = await fetch('https://listingleads.com/api/auth/satellite/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (verifyRes.ok) {
      const { user: verifiedUser } = await verifyRes.json()
      activePlanIds = verifiedUser.activePlanIds ?? []
      isTeamMember = verifiedUser.isTeamMember ?? false
      log.info({ email, activePlanIds, isTeamMember }, 'll-callback: fetched plan data')
    } else {
      log.warn({ status: verifyRes.status }, 'll-callback: satellite verify failed (non-fatal)')
    }
  } catch (err) {
    log.warn({ error: String(err) }, 'll-callback: satellite verify error (non-fatal)')
  }

  // 1c. Resolve plan name from LL database (solo_plan_ids → solo_plans)
  let planName: string | null = null
  if (activePlanIds.length > 0) {
    try {
      const llClient = createListingLeadsClient()
      const { data: planIdRow } = await llClient
        .from('solo_plan_ids')
        .select('plan_id, solo_plans!inner(plan_name)')
        .in('memberstack_plan_id', activePlanIds)
        .limit(1)
        .single()

      if (planIdRow) {
        const soloPlans = planIdRow.solo_plans as unknown as { plan_name: string }
        planName = soloPlans?.plan_name ?? null
      }
      log.info({ email, planName }, 'll-callback: resolved plan name')
    } catch (err) {
      log.warn({ error: String(err) }, 'll-callback: failed to resolve plan name (non-fatal)')
    }
  }

  const displayName = name || email.split('@')[0]
  const admin = createAdminClient()

  // 1b. Fetch profile from Listing Leads database (same as ZMA)
  let llProfile: Awaited<ReturnType<typeof getListingLeadsProfile>> = null
  try {
    llProfile = await getListingLeadsProfile(memberstackId)
    if (llProfile) {
      log.info({ email, fields: Object.keys(llProfile.fields) }, 'll-callback: fetched LL profile')
    }
  } catch (err) {
    log.warn({ error: String(err) }, 'll-callback: failed to fetch LL profile (non-fatal)')
  }

  // Build agent profile data from LL
  const agentData: Record<string, string> = {}
  if (llProfile) {
    const f = llProfile.fields
    const fullName = [llProfile.firstName, llProfile.lastName].filter(Boolean).join(' ')
    if (fullName) agentData.name = fullName
    if (f.phone) agentData.phone = f.phone
    if (f.brokerage) agentData.brokerage = f.brokerage
    if (f.license_number) agentData.license_number = f.license_number
    if (f.website) agentData.website = f.website
    if (f.headshot) agentData.headshot_url = f.headshot
    if (f.logo) agentData.logo_url = f.logo
    if (f.address) agentData.address_line1 = f.address
  }

  // 2. Create Supabase Auth user (if not exists)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { memberstack_id: memberstackId },
  })

  let userId: string

  if (created?.user) {
    userId = created.user.id
    log.info({ email, memberstackId }, 'll-callback: created new auth user')

    // New user — create users table row
    await admin.from('users').insert({
      id: userId,
      email,
      name: agentData.name || displayName,
      role: role || 'user',
      memberstack_id: memberstackId,
    })

    // Auto-create agent profile with LL data
    await admin.from('mbl_agents').insert({
      user_id: userId,
      name: agentData.name || displayName,
      email,
      ...agentData,
    })
  } else {
    // Auth user exists — sync profile
    if (createErr) {
      log.info({ email, error: createErr.message }, 'll-callback: auth user exists, syncing')
    }

    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    userId = existing?.id ?? ''

    if (existing) {
      // Sync user record
      await admin
        .from('users')
        .update({
          memberstack_id: memberstackId,
          name: agentData.name || displayName,
          role: role || 'user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      // Sync agent profile from LL on every login
      const { data: existingAgent } = await admin
        .from('mbl_agents')
        .select('id')
        .eq('user_id', existing.id)
        .single()

      if (existingAgent) {
        // Update with LL data (only non-empty fields)
        if (Object.keys(agentData).length > 0) {
          await admin
            .from('mbl_agents')
            .update({ ...agentData, updated_at: new Date().toISOString() })
            .eq('id', existingAgent.id)
        }
      } else {
        // Create agent profile
        await admin.from('mbl_agents').insert({
          user_id: existing.id,
          name: agentData.name || displayName,
          email,
          ...agentData,
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

  const emailOtp = linkData.properties?.email_otp
  if (!emailOtp) {
    log.error('ll-callback: no email_otp in generateLink response')
    return NextResponse.json({ error: 'No email_otp in magic link response' }, { status: 500 })
  }

  // 4. Verify OTP — set session cookies on the redirect
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

  // 5. Store plan data on user record
  if (userId) {
    await admin
      .from('users')
      .update({
        active_plan_ids: activePlanIds,
        is_team_member: isTeamMember,
        plan_name: planName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  log.info({ email }, 'll-callback: session established')
  return response
}
