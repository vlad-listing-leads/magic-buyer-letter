import { NextRequest } from 'next/server'
import { withAdminGuard } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'
import { createListingLeadsClient } from '@/lib/supabase/listing-leads'
import { z } from 'zod'

const addPlanSchema = z.object({
  memberstack_plan_id: z.string().min(1),
  plan_name: z.string().min(1),
})

/** GET /api/admin/allowed-plans — list allowed plans + all available LL plans */
export const GET = withAdminGuard(async () => {
  const admin = createAdminClient()

  // Fetch allowed plans from local DB
  const { data: allowed, error } = await admin
    .from('allowed_plans')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return apiError('Failed to fetch allowed plans', 500)

  // Fetch all available plans from LL database
  const llClient = createListingLeadsClient()

  const [soloResult, teamResult] = await Promise.all([
    llClient
      .from('solo_plan_ids')
      .select('memberstack_plan_id, billing_interval, label, solo_plans!inner(plan_name, tier, is_legacy)')
      .order('display_order'),
    llClient
      .from('team_plan_ids')
      .select('memberstack_plan_id, billing_interval, label, team_seat_tiers!inner(seat_limit, team_plans!inner(plan_name))')
      .order('display_order'),
  ])

  const availablePlans: Array<{ memberstack_plan_id: string; plan_name: string; type: string }> = []

  if (soloResult.data) {
    for (const row of soloResult.data) {
      const solo = row.solo_plans as unknown as { plan_name: string; tier: string; is_legacy: boolean }
      if (solo.is_legacy) continue
      availablePlans.push({
        memberstack_plan_id: row.memberstack_plan_id,
        plan_name: `${solo.plan_name} (${row.billing_interval})`,
        type: 'solo',
      })
    }
  }

  if (teamResult.data) {
    for (const row of teamResult.data) {
      const tier = row.team_seat_tiers as unknown as { seat_limit: number; team_plans: { plan_name: string } }
      availablePlans.push({
        memberstack_plan_id: row.memberstack_plan_id,
        plan_name: `${tier.team_plans.plan_name} - ${tier.seat_limit} seats (${row.billing_interval})`,
        type: 'team',
      })
    }
  }

  return apiSuccess({ allowed, availablePlans })
})

/** POST /api/admin/allowed-plans — add a plan to the allowed list */
export const POST = withAdminGuard(async (request: NextRequest) => {
  const body = await request.json()
  const parsed = addPlanSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('allowed_plans')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Plan already in allowed list', 409)
    return apiError('Failed to add plan', 500)
  }

  return apiSuccess(data, 201)
})

/** DELETE /api/admin/allowed-plans — remove a plan from the allowed list */
export const DELETE = withAdminGuard(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  if (!id) return apiError('Missing id parameter', 400)

  const admin = createAdminClient()
  const { error } = await admin
    .from('allowed_plans')
    .delete()
    .eq('id', id)

  if (error) return apiError('Failed to remove plan', 500)
  return apiSuccess(null)
})
