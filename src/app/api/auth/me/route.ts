import { NextResponse } from 'next/server'
import { getAuthUser, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's profile.
 * Includes memberstack_id, role, and profile data.
 */
export async function GET() {
  const authUser = await getAuthUser()

  if (!authUser) {
    return apiError('Unauthorized', 401)
  }

  const admin = createAdminClient()
  const { data: user, error } = await admin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) {
    return apiError('User profile not found', 404)
  }

  return apiSuccess({
    id: user.id,
    email: user.email,
    name: user.name,
    memberstackId: user.memberstack_id,
    role: user.role,
    isAdmin: ['admin', 'superadmin'].includes(user.role),
  })
}
