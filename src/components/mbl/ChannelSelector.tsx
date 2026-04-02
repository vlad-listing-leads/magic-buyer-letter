'use client'

import { useState } from 'react'
import { Mail, FileText, MessageSquare, Phone, Camera, AlertTriangle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { cn, getAgentProfileGaps } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useApiFetch } from '@/hooks/useApiFetch'
import type { MblAgent } from '@/types'

const CHANNELS = [
  {
    id: 'letter',
    label: 'Letter',
    description: 'Physical mail sent to homeowners via Lob',
    icon: Mail,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Cold outreach email with subject line',
    icon: FileText,
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Short SMS message (~160 chars)',
    icon: MessageSquare,
  },
  {
    id: 'call_script',
    label: 'Call Script',
    description: 'Structured phone script with talk tracks',
    icon: Phone,
  },
  {
    id: 'social_post',
    label: 'Social Post',
    description: 'Instagram / Facebook post for your area',
    icon: Camera,
    comingSoon: true,
  },
]

interface ChannelSelectorProps {
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  agent: MblAgent | null | undefined
  onAgentSync?: (agent: MblAgent) => void
}

export function ChannelSelector({ selected, onChange, agent, onAgentSync }: ChannelSelectorProps) {
  const apiFetch = useApiFetch()
  const [isSyncing, setIsSyncing] = useState(false)
  const profileGaps = getAgentProfileGaps(agent as Record<string, unknown> | null)
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Choose your channels</h1>
        <p className="text-sm text-muted-foreground">
          Select which touchpoints to create for this buyer
        </p>
      </div>

      {profileGaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Complete your agent profile to continue</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your generated letters, emails, and texts include your contact info.
              Missing: <span className="font-medium text-foreground">{profileGaps.map((g) => g.label).join(', ')}</span>
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => window.open('https://www.listingleads.com/profile', '_blank')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006AFF] hover:underline"
              >
                Update on Listing Leads
                <ExternalLink className="h-3 w-3" />
              </button>
              <span className="text-border">·</span>
              <button
                onClick={async () => {
                  setIsSyncing(true)
                  try {
                    const res = await apiFetch('/api/mbl/agent/sync', { method: 'POST' })
                    const json = await res.json()
                    if (json.success && json.data) {
                      onAgentSync?.(json.data)
                    }
                  } catch {} finally {
                    setIsSyncing(false)
                  }
                }}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006AFF] hover:underline disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                I&apos;ve updated my profile
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {CHANNELS.map((channel) => {
          const isSelected = selected.has(channel.id)
          const Icon = channel.icon
          const disabled = !!channel.comingSoon

          return (
            <button
              key={channel.id}
              onClick={() => !disabled && toggle(channel.id)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-4 rounded-lg border p-4 text-left transition-all',
                isSelected && !disabled
                  ? 'border-[#006AFF] bg-[#006AFF]/5 ring-1 ring-[#006AFF]/20'
                  : 'border-border hover:border-foreground/20',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  isSelected && !disabled
                    ? 'bg-[#006AFF]/10 text-[#006AFF]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{channel.label}</span>
                  {channel.comingSoon && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Coming soon
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{channel.description}</p>
              </div>
              {!disabled && (
                <div
                  className={cn(
                    'h-5 w-5 shrink-0 rounded border-2 transition-colors flex items-center justify-center',
                    isSelected
                      ? 'border-[#006AFF] bg-[#006AFF]'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selected.has('letter') && (
        <p className="text-xs text-muted-foreground text-center">
          Letter requires a property search — we&apos;ll find homes matching your buyer&apos;s criteria
        </p>
      )}
    </div>
  )
}
