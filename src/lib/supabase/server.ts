import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client — respects RLS via user cookies.
 * Use in Server Components, Route Handlers, Server Actions.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in Server Components (read-only)
          }
        },
      },
    }
  )
}

/**
 * Admin client — bypasses RLS.
 * Use for operations that need full access (pipeline processing, admin tasks).
 * NEVER expose to the client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Get the currently authenticated user.
 * Returns null if not authenticated.
 * Supports both cookie-based (web) and Bearer token (mobile) auth.
 */
export async function getAuthUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Require authentication — throws if not authenticated.
 * Use in protected API routes.
 */
export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
