'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Mail, FileText, MessageSquare, Phone, Plus, ChevronRight,
  Sparkles, Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { MblCampaign, MblCampaignChannel, CampaignStatus } from '@/types'

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
  delivered: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
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

function CampaignCard({ campaign }: { campaign: MblCampaign }) {
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`
  const cost = (campaign.total_cost_cents / 100).toFixed(2)

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block group">
      <Card className="transition-all duration-200 hover:border-[#006AFF]/30 hover:shadow-[0_0_0_1px_rgba(0,106,255,0.1)] group-hover:bg-accent/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-[15px] truncate">{campaign.buyer_name}</h3>
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

            <div className="flex items-center gap-5 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-center min-w-[3rem]">
                    <p className="text-lg font-bold font-mono leading-none">{campaign.total_properties}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">found</p>
                  </TooltipTrigger>
                  <TooltipContent>Homes found matching criteria</TooltipContent>
                </Tooltip>
              </TooltipProvider>

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

function filterCampaigns(campaigns: MblCampaign[], tab: string): MblCampaign[] {
  if (tab === 'all') return campaigns
  if (tab === 'completed') return campaigns.filter((c) => c.status === 'delivered')
  if (tab === 'in_progress') {
    return campaigns.filter((c) =>
      ['ready', 'generating', 'searching', 'skip_tracing', 'verifying'].includes(c.status)
    )
  }
  return campaigns
}

export default function DashboardPage() {
  const apiFetch = useApiFetch()

  const { data: campaigns, isLoading } = useQuery<MblCampaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/campaigns')
      const json = await res.json()
      return json.data ?? []
    },
  })

  const { data: allChannels = [] } = useQuery<MblCampaignChannel[]>({
    queryKey: ['all-channels'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/channels')
      const json = await res.json()
      return json.data ?? []
    },
  })

  const totalCampaigns = campaigns?.length ?? 0
  const totalFound = campaigns?.reduce((sum, c) => sum + c.total_properties, 0) ?? 0
  const lettersCreated = campaigns?.filter(c => c.letter_templates && Object.keys(c.letter_templates).length > 0).length ?? 0
  const emailsCreated = allChannels.filter(c => c.channel === 'email').length
  const textsCreated = allChannels.filter(c => c.channel === 'text').length
  const callScriptsCreated = allChannels.filter(c => c.channel === 'call_script').length

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buyers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your buyer campaigns</p>
        </div>
        <Link href="/new">
          <Button className="bg-[#006AFF] hover:bg-[#0058D4] text-white gap-1.5">
            <Plus className="h-4 w-4" />
            New Buyer
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
        <Card className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Buyers</span>
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold mt-1">{totalCampaigns}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Homes Found</span>
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold mt-1">{totalFound}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Letters</span>
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold mt-1">{lettersCreated}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Emails</span>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold mt-1">{emailsCreated}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Texts</span>
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold mt-1">{textsCreated}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Call Scripts</span>
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold mt-1">{callScriptsCreated}</div>
        </Card>
      </div>

      {/* Campaigns with tab filters */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CampaignSkeleton key={i} />
          ))}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
            <TabsTrigger value="in_progress">Active ({tabCounts.in_progress})</TabsTrigger>
            <TabsTrigger value="completed">Done ({tabCounts.delivered})</TabsTrigger>
          </TabsList>

          {['all', 'in_progress', 'completed'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {filterCampaigns(campaigns, tab).length > 0 ? (
                <div className="space-y-2">
                  {filterCampaigns(campaigns, tab).map((c) => (
                    <CampaignCard key={c.id} campaign={c} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No campaigns match this filter</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
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
                New Buyer
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
