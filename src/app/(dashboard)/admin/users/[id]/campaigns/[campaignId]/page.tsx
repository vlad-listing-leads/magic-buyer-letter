'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LetterPreview } from '@/components/mbl/LetterPreview'
import { LetterPreviewWithMap } from '@/components/mbl/LetterPreviewWithMap'
import { MergeVariableHighlight } from '@/components/mbl/MergeVariableHighlight'
import {
  ArrowLeft, Loader2, Search, Send, DollarSign,
  Mail, FileText, MessageSquare, Phone, Camera,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { MblCampaign, MblProperty, MblAgent, MblCampaignChannel } from '@/types'

type ChannelTab = 'letter' | 'email' | 'text' | 'call_script' | 'social_post'

const CHANNEL_NAV = [
  { id: 'letter' as const, label: 'Letter', desc: 'Direct mail', icon: Mail },
  { id: 'email' as const, label: 'Email', desc: 'Cold outreach', icon: FileText },
  { id: 'text' as const, label: 'Text', desc: 'SMS message', icon: MessageSquare },
  { id: 'call_script' as const, label: 'Call script', desc: 'Phone talk track', icon: Phone },
  { id: 'social_post' as const, label: 'Social post', desc: 'Coming soon', icon: Camera, comingSoon: true },
] as const

export default function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>
}) {
  const { id, campaignId } = use(params)
  const apiFetch = useApiFetch()
  const [activeChannel, setActiveChannel] = useState<ChannelTab>('letter')

  const { data, isLoading } = useQuery<{
    campaign: MblCampaign & { mbl_agents: MblAgent | null }
    properties: MblProperty[]
    channels: MblCampaignChannel[]
  }>({
    queryKey: ['admin-campaign', campaignId],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/users/${id}/campaigns/${campaignId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (!data) {
    return <div className="text-center py-12 text-destructive">Campaign not found</div>
  }

  const { campaign, properties, channels } = data
  const agent = campaign.mbl_agents
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

  // Resolve letter content — prefer campaign templates (has user edits), fall back to property content
  const campaignTemplate = campaign.letter_templates
    ? (campaign.letter_templates['_active'] ?? Object.values(campaign.letter_templates)[0] ?? null)
    : null
  const propertyContent = properties.find(p => p.personalized_content)?.personalized_content as { body?: string; ps?: string } | null
  const letterContent = campaignTemplate?.body
    ? campaignTemplate
    : propertyContent?.body
      ? { body: propertyContent.body, ps: propertyContent.ps }
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/admin/users/${id}`} className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.buyer_name} · {area}</h1>
          <Badge variant="secondary" className="capitalize">{campaign.status.replace('_', ' ')}</Badge>
          <Badge variant="outline" className="text-xs">Admin view</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {campaign.template_style && `${campaign.template_style} · `}{formatDate(campaign.created_at)}
          {' · '}{properties.length} properties · {campaign.properties_sent} sent
        </p>
      </div>

      <hr className="border-border -mx-4 sm:-mx-6 md:-mx-8" />

      {/* Sidebar + Content */}
      <div className="flex">
        {/* Channel sidebar */}
        <div className="w-[240px] flex-shrink-0 pr-6 border-r border-border -mt-6 pt-6">
          <div className="sticky top-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">Channels</p>
            {CHANNEL_NAV.map((ch) => {
              const isActive = activeChannel === ch.id
              const isGenerated = ch.id === 'letter'
                ? !!letterContent?.body
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
          {activeChannel === 'letter' && (
            letterContent?.body && agent ? (
              <div className="space-y-6">
                {/* Letter previews */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">With Map</p>
                    <LetterPreviewWithMap
                      agent={agent}
                      letterContent={letterContent}
                      allProperties={properties}
                      buyerName={campaign.buyer_name}
                      bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
                      templateStyle={campaign.template_style ?? 'warm'}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Without Map</p>
                    <LetterPreview
                      agent={agent}
                      letterContent={letterContent}
                      buyerName={campaign.buyer_name}
                      bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
                      templateStyle={campaign.template_style ?? 'warm'}
                    />
                  </div>
                </div>

                {/* Properties table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Properties ({properties.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                            <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {properties.map((prop) => (
                            <tr key={prop.id} className="border-b border-border/50 last:border-b-0">
                              <td className="p-3 font-medium">
                                {prop.owner_first_name} {prop.owner_last_name}
                              </td>
                              <td className="p-3">
                                <div>{prop.address_line1}</div>
                                <div className="text-xs text-muted-foreground">{prop.city}, {prop.state} {prop.zip}</div>
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {prop.estimated_value ? `$${prop.estimated_value.toLocaleString()}` : '—'}
                                {' · '}{prop.bedrooms ?? '?'}bd/{prop.bathrooms ?? '?'}ba
                                {prop.sqft ? ` · ${prop.sqft.toLocaleString()} sqft` : ''}
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary" className="text-xs capitalize">{prop.owner_type}</Badge>
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary" className="text-xs capitalize">{prop.status.replace('_', ' ')}</Badge>
                              </td>
                            </tr>
                          ))}
                          {properties.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No properties</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No letter content generated yet
                </CardContent>
              </Card>
            )
          )}

          {/* Email / Text / Call Script */}
          {(activeChannel === 'email' || activeChannel === 'text' || activeChannel === 'call_script') && (
            <div className="max-w-[740px] mx-auto">
              {(() => {
                const channelData = channels.find((c) => c.channel === activeChannel)
                if (!channelData) {
                  return (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        Not generated yet
                      </CardContent>
                    </Card>
                  )
                }
                return (
                  <Card>
                    {activeChannel === 'email' && channelData.subject && (
                      <div className="border-b border-border px-6 py-4">
                        <span className="text-sm text-muted-foreground mr-3">Subject:</span>
                        <span className="text-[15px] font-medium">
                          <MergeVariableHighlight text={channelData.subject} />
                        </span>
                      </div>
                    )}
                    <CardContent className="px-6 py-6">
                      <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
                        {channelData.body.split('\n').map((line, i) => {
                          if (!line.trim()) return <div key={i} className="h-3" />
                          if (activeChannel === 'call_script' && line.match(/^\[.+\]$/)) {
                            return (
                              <p key={i} className="font-semibold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-widest pt-2">
                                {line}
                              </p>
                            )
                          }
                          return <p key={i}><MergeVariableHighlight text={line} /></p>
                        })}
                      </div>
                      {activeChannel === 'text' && (
                        <p className="text-xs text-muted-foreground mt-4">
                          {channelData.body.length} chars
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}
            </div>
          )}

          {/* Social post */}
          {activeChannel === 'social_post' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold">Social Post</p>
              <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  )
}
