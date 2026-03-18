'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle, DollarSign, Loader2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { MblCampaign, CampaignStatus } from '@/types'

type FilterTab = 'all' | 'delivered' | 'sent' | 'sending'

const FILTER_STATUSES: Record<FilterTab, CampaignStatus[] | null> = {
  all: null,
  delivered: ['delivered'],
  sent: ['sent'],
  sending: ['sending', 'ready', 'generating', 'searching', 'skip_tracing', 'verifying'],
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMo = Math.floor(diffDay / 30)
  return `${diffMo}mo ago`
}

export default function DashboardPage() {
  const { user } = useCurrentUser()
  const apiFetch = useApiFetch()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

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

  // Filter campaigns by tab
  const filtered = useMemo(() => {
    if (!campaigns) return []
    const statuses = FILTER_STATUSES[activeTab]
    if (!statuses) return campaigns
    return campaigns.filter((c) => statuses.includes(c.status))
  }, [campaigns, activeTab])

  // Tab counts
  const tabCounts = useMemo(() => {
    if (!campaigns) return { all: 0, delivered: 0, sent: 0, sending: 0 }
    return {
      all: campaigns.length,
      delivered: campaigns.filter((c) => c.status === 'delivered').length,
      sent: campaigns.filter((c) => c.status === 'sent').length,
      sending: campaigns.filter((c) =>
        ['sending', 'ready', 'generating', 'searching', 'skip_tracing', 'verifying'].includes(c.status)
      ).length,
    }
  }, [campaigns])

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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campaigns</CardTitle>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 mt-2">
              {(['all', 'delivered', 'sent', 'sending'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-[#006AFF] text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {' '}
                  <span className={cn(
                    'text-xs',
                    activeTab === tab ? 'text-white/80' : 'text-muted-foreground'
                  )}>
                    ({tabCounts[tab]})
                  </span>
                </button>
              ))}
            </div>
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
                    <th className="p-3 text-left font-medium text-muted-foreground">Returned</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Cost</th>
                    <th className="p-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">
                          {c.buyer_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {relativeTime(c.created_at)}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {c.criteria_city}{c.criteria_state ? `, ${c.criteria_state}` : ''}
                      </td>
                      <td className="p-3 capitalize">{c.template_style}</td>
                      <td className="p-3 font-mono">{c.properties_sent}</td>
                      <td className="p-3 font-mono">{c.properties_delivered}</td>
                      <td className="p-3">
                        <span className={cn(
                          'font-mono',
                          c.properties_returned > 0 && 'text-destructive font-semibold'
                        )}>
                          {c.properties_returned}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">${(c.total_cost_cents / 100).toFixed(2)}</td>
                      <td className="p-3">
                        <Link href={`/campaigns/${c.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        No campaigns match this filter
                      </td>
                    </tr>
                  )}
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
