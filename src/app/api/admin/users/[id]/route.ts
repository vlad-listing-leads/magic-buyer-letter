import { NextRequest } from 'next/server'
import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

export const GET = withAdminGuard(async (_request: NextRequest, context) => {
  const admin = createAdminClient()
  const { id } = await context.params

  const { data: user, error: userError } = await admin
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('id', id)
    .single()

  if (userError || !user) return apiError('User not found', 404)

  const { data: campaigns } = await admin
    .from('mbl_campaigns')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  return apiSuccess({ user, campaigns: campaigns ?? [] })
})
