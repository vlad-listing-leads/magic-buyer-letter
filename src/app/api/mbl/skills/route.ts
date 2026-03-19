import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'

export const GET = withErrorHandler(async () => {
  await requireAuth()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('mbl_skills')
    .select('id, name, description')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return apiError('Failed to fetch skills', 500)
  return apiSuccess(data)
})
