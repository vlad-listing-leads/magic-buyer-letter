import { NextRequest } from 'next/server'
import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  prompt_instructions: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
})

export const GET = withAdminGuard(async (_request: NextRequest, context) => {
  const admin = createAdminClient()
  const { id } = await context.params

  const { data, error } = await admin
    .from('mbl_skills')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return apiError('Skill not found', 404)
  return apiSuccess(data)
})

export const PUT = withAdminGuard(async (request: NextRequest, context) => {
  const admin = createAdminClient()
  const { id } = await context.params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)

  const { data, error } = await admin
    .from('mbl_skills')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return apiError('Failed to update skill', 500)
  return apiSuccess(data)
})

export const DELETE = withAdminGuard(async (_request: NextRequest, context) => {
  const admin = createAdminClient()
  const { id } = await context.params

  // Prevent deleting last active skill
  const { count } = await admin
    .from('mbl_skills')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if ((count ?? 0) <= 1) {
    // Check if the one we're deleting is the last active one
    const { data: skill } = await admin.from('mbl_skills').select('is_active').eq('id', id).single()
    if (skill?.is_active) {
      return apiError('Cannot delete the last active skill', 400)
    }
  }

  const { error } = await admin.from('mbl_skills').delete().eq('id', id)
  if (error) return apiError('Failed to delete skill', 500)
  return apiSuccess({ deleted: true })
})
