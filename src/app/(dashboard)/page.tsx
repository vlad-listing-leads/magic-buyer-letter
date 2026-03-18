'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Mail, Send, CheckCircle, DollarSign, Plus, ChevronRight,
  Undo2, Clock, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { MblCampaign, CampaignStatus } from '@/types'

type FilterTab = 'all' | 'delivered' | 'sent' | 'in_progress'

const FILTER_STATUSES: Record<FilterTab, CampaignStatus[] | null> = {
  all: null,
  delivered: ['delivered'],
  sent: ['sent'],
  in_progress: ['sending', 'ready', 'generating', 'searching', 'skip_tracing', 'verifying'],
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  delivered: { label: 'Delivered', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  sent: { label: 'Sent', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  sending: { label: 'Sending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  ready: { label: 'Ready', className: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  generating: { label: 'Generating', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  searching: { label: 'Searching', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  skip_tracing: { label: 'Processing', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  verifying: { label: 'Verifying', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  error: { label: 'Error', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-secondary text-secondary-foreground' }
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0', config.className)}>
      {config.label}
    </Badge>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Mail
  label: string
  value: string | number
  accent: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5', accent)} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </p>
            <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
          </div>
          <Icon className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  )
}

function CampaignCard({ campaign }: { campaign: MblCampaign }) {
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`
  const cost = (campaign.total_cost_cents / 100).toFixed(2)
  const hasReturns = campaign.properties_returned > 0

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block group">
      <Card className="transition-all duration-200 hover:border-[#006AFF]/30 hover:shadow-[0_0_0_1px_rgba(0,106,255,0.1)] group-hover:bg-accent/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Left — Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-[15px] truncate">
                  {campaign.buyer_name}
                </h3>
                <StatusBadge status={campaign.status} />
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span>{area}</span>
                <span className="text-border">·</span>
                <span className="capitalize">{campaign.template_style}</span>
                <span className="text-border">·</span>
                <span>{relativeTime(campaign.created_at)}</span>
              </div>
            </div>

            {/* Right — Metrics */}
            <div className="flex items-center gap-5 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-center min-w-[3rem]">
                    <p className="text-lg font-bold font-mono leading-none">
                      {campaign.properties_sent}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">sent</p>
                  </TooltipTrigger>
                  <TooltipContent>Letters sent via Lob</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-center min-w-[3rem]">
                    <p className="text-lg font-bold font-mono leading-none text-emerald-400">
                      {campaign.properties_delivered}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">delivered</p>
                  </TooltipTrigger>
                  <TooltipContent>Confirmed delivered by USPS</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {hasReturns && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="text-center min-w-[3rem]">
                      <p className="text-lg font-bold font-mono leading-none text-red-400">
                        {campaign.properties_returned}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">returned</p>
                    </TooltipTrigger>
                    <TooltipContent>Letters returned by USPS</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              <div className="text-right hidden sm:block min-w-[4.5rem]">
                <p className="text-sm font-mono font-semibold">${cost}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">cost</p>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function CampaignSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-5">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-16 hidden sm:block" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
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

  const totalCampaigns = campaigns?.length ?? 0
  const totalSent = campaigns?.reduce((sum, c) => sum + c.properties_sent, 0) ?? 0
  const totalDelivered = campaigns?.reduce((sum, c) => sum + c.properties_delivered, 0) ?? 0
  const totalSpend = campaigns?.reduce((sum, c) => sum + c.total_cost_cents, 0) ?? 0

  const filtered = useMemo(() => {
    if (!campaigns) return []
    const statuses = FILTER_STATUSES[activeTab]
    if (!statuses) return campaigns
    return campaigns.filter((c) => statuses.includes(c.status))
  }, [campaigns, activeTab])

  const tabCounts = useMemo(() => {
    if (!campaigns) return { all: 0, delivered: 0, sent: 0, in_progress: 0 }
    return {
      all: campaigns.length,
      delivered: campaigns.filter((c) => c.status === 'delivered').length,
      sent: campaigns.filter((c) => c.status === 'sent').length,
      in_progress: campaigns.filter((c) =>
        ['sending', 'ready', 'generating', 'searching', 'skip_tracing', 'verifying'].includes(c.status)
      ).length,
    }
  }, [campaigns])

  const TABS: { key: FilterTab; label: string; icon: typeof Mail }[] = [
    { key: 'all', label: 'All', icon: Mail },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    { key: 'sent', label: 'Sent', icon: Send },
    { key: 'in_progress', label: 'In Progress', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your buyer letter campaigns
          </p>
        </div>
        <Link href="/new">
          <Button className="bg-[#006AFF] hover:bg-[#0058D4] text-white gap-1.5">
            <Plus className="h-4 w-4" />
            New Letter
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Mail} label="Campaigns" value={totalCampaigns} accent="bg-[#006AFF]" />
        <StatCard icon={Send} label="Letters Sent" value={totalSent} accent="bg-violet-500" />
        <StatCard icon={CheckCircle} label="Delivered" value={totalDelivered} accent="bg-emerald-500" />
        <StatCard
          icon={DollarSign}
          label="Total Spend"
          value={`$${(totalSpend / 100).toFixed(2)}`}
          accent="bg-amber-500"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {TABS.map(({ key, label, icon: TabIcon }) => {
          const count = tabCounts[key]
          const isActive = activeTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-t-md',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-semibold rounded-full px-1.5 py-px leading-none',
                    isActive
                      ? 'bg-[#006AFF] text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#006AFF] rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Campaign list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CampaignSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No campaigns match this filter
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="text-sm text-[#006AFF] hover:underline mt-1"
          >
            Show all campaigns
          </button>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-[#006AFF]/10 p-4 mb-4">
              <Sparkles className="h-6 w-6 text-[#006AFF]" />
            </div>
            <h3 className="text-lg font-semibold">Create your first campaign</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
              Describe your buyer and we&apos;ll find matching homeowners, write personalized letters, and mail them via USPS.
            </p>
            <Link href="/new">
              <Button className="bg-[#006AFF] hover:bg-[#0058D4] text-white gap-1.5">
                <Plus className="h-4 w-4" />
                New Letter
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
