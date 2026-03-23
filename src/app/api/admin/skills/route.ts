import { NextRequest } from 'next/server'
import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const skillSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  prompt_instructions: z.string().min(1),
  channel: z.enum(['letter', 'email', 'text', 'call_script']).default('letter'),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
})

export const GET = withAdminGuard(async () => {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mbl_skills')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return apiError('Failed to fetch skills', 500)
  return apiSuccess(data)
})

export const POST = withAdminGuard(async (request: NextRequest) => {
  const body = await request.json()
  const parsed = skillSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mbl_skills')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return apiError('Failed to create skill', 500)
  return apiSuccess(data, 201)
})
