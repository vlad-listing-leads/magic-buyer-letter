'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MblCampaign, MblCampaignChannel } from '@/types'

const MERGE_VARS = [
  { key: '{{first_name}}', description: "Owner's first name" },
  { key: '{{address}}', description: 'Full property address' },
  { key: '{{street}}', description: 'Street name only' },
  { key: '{{neighborhood}}', description: 'Neighborhood name' },
]

const ALL_CHANNELS = [
  { id: 'letter', label: 'Letter' },
  { id: 'email', label: 'Email' },
  { id: 'text', label: 'Text' },
  { id: 'social_post', label: 'Social post' },
  { id: 'call_script', label: 'Call script' },
]

interface ChannelSidebarProps {
  campaign: MblCampaign
  channels: MblCampaignChannel[]
  letterSent: boolean
}

export function ChannelSidebar({ campaign, channels, letterSent }: ChannelSidebarProps) {
  const channelMap = new Map(channels.map((c) => [c.channel as string, c]))

  function getStatus(id: string): { label: string; color: string } {
    if (id === 'letter') {
      return letterSent
        ? { label: 'Sent', color: 'bg-green-500' }
        : { label: 'Not sent', color: 'bg-zinc-400' }
    }
    if (id === 'social_post') return { label: 'Coming soon', color: 'bg-zinc-400' }
    const ch = channelMap.get(id)
    return ch
      ? { label: 'Ready', color: 'bg-amber-500' }
      : { label: 'Not generated', color: 'bg-zinc-400' }
  }

  return (
    <div className="space-y-4">
      {/* Merge Variables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Merge variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {MERGE_VARS.map((v) => (
            <div key={v.key} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/50 dark:border-amber-700/50">
                {v.key}
              </span>
              <span className="text-xs text-muted-foreground">{v.description}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All 5 channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALL_CHANNELS.map((ch) => {
            const status = getStatus(ch.id)
            return (
              <div key={ch.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${status.color}`} />
                  <span className="text-sm">{ch.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{status.label}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Buyer Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Buyer profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <ProfileRow label="Name" value={campaign.buyer_name} />
          <ProfileRow
            label="Area"
            value={[campaign.criteria_city, campaign.criteria_state].filter(Boolean).join(', ')}
          />
          <ProfileRow
            label="Price"
            value={
              campaign.criteria_price_min && campaign.criteria_price_max
                ? `$${(campaign.criteria_price_min / 1000).toFixed(0)}K–$${(campaign.criteria_price_max / 1000).toFixed(0)}K`
                : ''
            }
          />
          <ProfileRow label="Financing" value={campaign.financing} />
          <ProfileRow label="Closing" value={campaign.closing_flexibility} />
          <ProfileRow label="Condition" value={campaign.condition_tolerance} />
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{value.replace(/-/g, ' ')}</span>
    </div>
  )
}
