'use client'

import { Mail, FileText, MessageSquare, Phone, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
}

export function ChannelSelector({ selected, onChange }: ChannelSelectorProps) {
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
