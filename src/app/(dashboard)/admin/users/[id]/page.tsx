'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { MblCampaign } from '@/types'

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const apiFetch = useApiFetch()

  const { data, isLoading } = useQuery<{ user: { id: string; name: string; email: string; role: string }; campaigns: MblCampaign[] }>({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/users/${id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (!data) {
    return <div className="text-center py-12 text-destructive">User not found</div>
  }

  const { user, campaigns } = data

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{user.name || user.email}</h1>
          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{user.email} · {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <Link key={c.id} href={`/admin/users/${id}/campaigns/${c.id}`} className="block">
            <Card className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.buyer_name}</h3>
                      <Badge variant="secondary" className="text-xs capitalize">{c.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.criteria_city}{c.criteria_state ? `, ${c.criteria_state}` : ''} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{c.properties_sent} sent</p>
                    <p className="text-xs text-muted-foreground">${(c.total_cost_cents / 100).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {campaigns.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No campaigns
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
