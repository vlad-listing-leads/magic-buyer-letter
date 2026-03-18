import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('auth-callback')

/**
 * GET /api/auth/callback
 *
 * Supabase auth callback — verifies OTP token and sets session cookies.
 * Used by both LL SSO flow and standard email auth.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as 'magiclink' | 'email'
  const next = request.nextUrl.searchParams.get('next') || '/'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (error) {
      log.error({ error }, 'OTP verification failed')
      return NextResponse.redirect(new URL('/auth/login?error=verification_failed', appUrl))
    }
  }

  return NextResponse.redirect(new URL(next, appUrl))
}
