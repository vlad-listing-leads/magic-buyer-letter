'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LetterPreviewWizard } from '@/components/mbl/LetterPreviewWizard'
import { ChannelContent } from '@/components/mbl/ChannelContent'
import {
  ArrowLeft, CheckCircle, Trash2, Loader2, Sparkles,
  Mail, FileText, MessageSquare, Phone, Camera,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getTemplate } from '@/lib/templates'
import { sileo } from 'sileo'
import Link from 'next/link'
import type { MblCampaign, MblProperty, MblAgent, MblCampaignChannel, ChannelType } from '@/types'

type ChannelTab = 'letter' | 'email' | 'text' | 'call_script' | 'social_post'

const CHANNEL_NAV = [
  { id: 'letter' as const, label: 'Letter', desc: 'Direct mail', icon: Mail },
  { id: 'email' as const, label: 'Email', desc: 'Cold outreach', icon: FileText },
  { id: 'text' as const, label: 'Text', desc: 'SMS message', icon: MessageSquare },
  { id: 'call_script' as const, label: 'Call script', desc: 'Phone talk track', icon: Phone },
  { id: 'social_post' as const, label: 'Social post', desc: 'Coming soon', icon: Camera, comingSoon: true },
] as const

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeChannel, setActiveChannel] = useState<ChannelTab>('letter')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<{ campaign: MblCampaign; properties: MblProperty[] }>({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
  })

  const { data: agent } = useQuery<MblAgent | null>({
    queryKey: ['mbl-agent'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/agent')
      const json = await res.json()
      return json.data
    },
  })

  const { data: channels = [] } = useQuery<MblCampaignChannel[]>({
    queryKey: ['campaign-channels', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${id}/channels`)
      const json = await res.json()
      return json.data ?? []
    },
  })

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/mbl/campaigns/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      sileo.success({ title: 'Campaign deleted' })
      router.push('/')
    } catch (err) {
      sileo.error({ title: err instanceof Error ? err.message : 'Failed to delete' })
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load campaign</p>
        <Link href="/" className="text-sm text-muted-foreground underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const { campaign, properties } = data
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`
  const priceRange =
    campaign.criteria_price_min || campaign.criteria_price_max
      ? `${campaign.criteria_price_min ? `$${campaign.criteria_price_min.toLocaleString()}` : '?'} – ${campaign.criteria_price_max ? `$${campaign.criteria_price_max.toLocaleString()}` : '?'}`
      : ''
  const canDelete = campaign.status !== 'sent' && campaign.status !== 'sending' && campaign.status !== 'delivered'
  const hasLetterContent = campaign.letter_templates && Object.keys(campaign.letter_templates).length > 0
  const hasPropertyContent = properties.some(p => p.personalized_content)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {campaign.buyer_name} · {area}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {campaign.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {priceRange && `${priceRange} · `}
            {getTemplate(campaign.template_style).name} · {formatDate(campaign.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status !== 'cancelled' && campaign.status !== 'delivered' && (
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-sm font-medium hover:bg-accent transition-colors">
                <CheckCircle className="h-4 w-4" />
                Mark as Done
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Done with this campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the {campaign.buyer_name} campaign to your Done tab.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Not yet</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await apiFetch(`/api/mbl/campaigns/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'delivered' }),
                      })
                      window.location.reload()
                    }}
                    className="bg-[#006AFF] hover:bg-[#0058D4] text-white"
                  >
                    Mark as Done
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 h-8 text-sm font-medium text-destructive hover:bg-accent hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this campaign and all associated properties. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <hr className="border-border -mx-4 sm:-mx-6 md:-mx-8" />

      {/* Sidebar + Content — same layout as /new preview step */}
      <div className="flex -mb-4 sm:-mb-6 md:-mb-8">
        {/* Channel sidebar — flush top to bottom */}
        <div className="w-[240px] flex-shrink-0 pr-6 border-r border-border -mt-6 -mb-0 pt-6">
          <div className="sticky top-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">Channels</p>
            {CHANNEL_NAV.map((ch) => {
              const isActive = activeChannel === ch.id
              const isGenerated = ch.id === 'letter'
                ? true
                : channels.some((c) => c.channel === ch.id)
              const isComingSoon = 'comingSoon' in ch && ch.comingSoon
              const Icon = ch.icon
              return (
                <button
                  key={ch.id}
                  onClick={() => !isComingSoon && setActiveChannel(ch.id)}
                  disabled={isComingSoon}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all border ${
                    isActive
                      ? 'border-[#006AFF]/30 bg-[#006AFF]/5 shadow-sm'
                      : 'border-transparent hover:border-border hover:bg-accent/50'
                  } ${isComingSoon ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className={`flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0 ${
                    isActive ? 'bg-[#006AFF]/10 text-[#006AFF]' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                        {ch.label}
                      </span>
                      {!isComingSoon && (
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                          isGenerated ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`} />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{ch.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 pl-6 pt-8">
          <div key={activeChannel} className="animate-fade-in">
          {/* Letter */}
          {activeChannel === 'letter' && agent && (hasLetterContent || hasPropertyContent) && (
            <LetterPreviewWizard
              agent={agent}
              properties={properties}
              buyerName={campaign.buyer_name}
              bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
              templateStyle={campaign.template_style}
              onTemplateChange={() => {}}
              selectedSkillId={selectedSkillId}
              onSkillChange={setSelectedSkillId}
              onBack={() => {}}
              onContinue={() => {}}
              campaignId={id}
              letterTemplates={campaign.letter_templates}
            />
          )}

          {activeChannel === 'letter' && agent && !hasLetterContent && !hasPropertyContent && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No letter generated</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
                Generate a letter for this campaign. The AI call may have failed during initial creation.
              </p>
              <Button
                onClick={async () => {
                  const propertyIds = properties.map(p => p.id)
                  await apiFetch(`/api/mbl/campaigns/${id}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ property_ids: propertyIds }),
                  })
                  window.location.reload()
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Letter
              </Button>
            </div>
          )}

          {activeChannel === 'letter' && !agent && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Email / Text / Call Script */}
          {(activeChannel === 'email' || activeChannel === 'text' || activeChannel === 'call_script') && (
            <div className="max-w-[740px] mx-auto">
              <ChannelContent
                campaignId={id}
                channel={activeChannel as ChannelType}
                channelData={channels.find((c) => c.channel === activeChannel)}
              />
            </div>
          )}

          {/* Social post */}
          {activeChannel === 'social_post' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold">Social Post</p>
              <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
            </div>
          )}
          </div>{/* end keyed animation wrapper */}
        </div>
      </div>
    </div>
  )
}
