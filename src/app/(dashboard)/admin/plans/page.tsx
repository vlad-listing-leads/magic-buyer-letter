'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, Shield, Check } from 'lucide-react'
import { sileo } from 'sileo'

interface AllowedPlan {
  id: string
  memberstack_plan_id: string
  plan_name: string
  created_at: string
}

interface AvailablePlan {
  memberstack_plan_id: string
  plan_name: string
  type: string
  is_legacy?: boolean
}

export default function AdminPlansPage() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ allowed: AllowedPlan[]; availablePlans: AvailablePlan[] }>({
    queryKey: ['admin-allowed-plans'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/allowed-plans')
      const json = await res.json()
      return json.data ?? { allowed: [], availablePlans: [] }
    },
  })

  const allowed = data?.allowed ?? []
  const availablePlans = data?.availablePlans ?? []
  const allowedIds = new Set(allowed.map((p) => p.memberstack_plan_id))

  const addMutation = useMutation({
    mutationFn: async (plan: AvailablePlan) => {
      const res = await apiFetch('/api/admin/allowed-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberstack_plan_id: plan.memberstack_plan_id,
          plan_name: plan.plan_name,
        }),
      })
      if (!res.ok) throw new Error('Failed to add plan')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-allowed-plans'] })
      sileo.success({ title: 'Plan added' })
    },
    onError: () => sileo.error({ title: 'Failed to add plan' }),
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/admin/allowed-plans?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove plan')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-allowed-plans'] })
      sileo.success({ title: 'Plan removed' })
    },
    onError: () => sileo.error({ title: 'Failed to remove plan' }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan Access</h1>
        <p className="text-muted-foreground mt-1">
          Configure which Listing Leads plans can access this app. Users without an allowed plan see an upgrade page.
        </p>
      </div>

      {/* Currently Allowed Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Allowed Plans ({allowed.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allowed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plans configured — all users will see the upgrade page.
            </p>
          ) : (
            <div className="space-y-2">
              {allowed.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{plan.plan_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{plan.memberstack_plan_id}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(plan.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans to Add */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Plans from Listing Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availablePlans.map((plan) => {
              const isAllowed = allowedIds.has(plan.memberstack_plan_id)
              return (
                <div
                  key={plan.memberstack_plan_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{plan.plan_name}</p>
                        {plan.is_legacy && (
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            Legacy
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {plan.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{plan.memberstack_plan_id}</p>
                    </div>
                  </div>
                  {isAllowed ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Allowed
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addMutation.mutate(plan)}
                      disabled={addMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Allow
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
