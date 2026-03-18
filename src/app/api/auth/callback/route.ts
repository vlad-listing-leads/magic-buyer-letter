import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createLogger } from '@/lib/logger'

const log = createLogger('auth-callback')

/**
 * GET /api/auth/callback
 *
 * Supabase auth callback — verifies OTP token and sets session cookies.
 * Uses response-based cookie setting to ensure cookies survive the redirect.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as 'magiclink' | 'email'
  const next = request.nextUrl.searchParams.get('next') || '/'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'
  const redirectUrl = new URL(next, appUrl)

  // Create redirect response first so cookies can be attached to it
  const response = NextResponse.redirect(redirectUrl)

  if (tokenHash && type) {
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

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (error) {
      log.error({ error }, 'OTP verification failed')
      return NextResponse.redirect(new URL('/auth/login?error=verification_failed', appUrl))
    }
  }

  return response
}
