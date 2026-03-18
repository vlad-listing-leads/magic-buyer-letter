'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle, DollarSign, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { MblCampaign } from '@/types'

export default function DashboardPage() {
  const { user } = useCurrentUser()
  const apiFetch = useApiFetch()

  const { data: campaigns, isLoading } = useQuery<MblCampaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/campaigns')
      const json = await res.json()
      return json.data ?? []
    },
  })

  const displayName = user?.name?.split(' ')[0] ?? 'there'
  const totalCampaigns = campaigns?.length ?? 0
  const totalSent = campaigns?.reduce((sum, c) => sum + c.properties_sent, 0) ?? 0
  const totalDelivered = campaigns?.reduce((sum, c) => sum + c.properties_delivered, 0) ?? 0
  const totalSpend = campaigns?.reduce((sum, c) => sum + c.total_cost_cents, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground">
          Your Magic Buyer Letter dashboard
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Letters Sent
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDelivered}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spend
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalSpend / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent campaigns */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left font-medium text-muted-foreground">Buyer</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Area</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Template</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Sent</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Delivered</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 10).map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">
                          {c.buyer_name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {c.criteria_city}{c.criteria_state ? `, ${c.criteria_state}` : ''}
                      </td>
                      <td className="p-3 capitalize">{c.template_style}</td>
                      <td className="p-3 font-mono">{c.properties_sent}</td>
                      <td className="p-3 font-mono">{c.properties_delivered}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">${(c.total_cost_cents / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first Magic Buyer Letter campaign to get started
            </p>
            <Link
              href="/new"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 bg-[#006AFF] text-white hover:bg-[#0058D4] transition-colors"
            >
              Create New Letter
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
