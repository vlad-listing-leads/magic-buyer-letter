'use client'

import { Mail, MessageSquare, Phone, Camera, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { MblCampaignChannel } from '@/types'

export type ChannelTab = 'letter' | 'email' | 'text' | 'social_post' | 'call_script'

const TABS: Array<{ id: ChannelTab; label: string; icon: typeof Mail; comingSoon?: boolean }> = [
  { id: 'letter', label: 'Letter', icon: Mail },
  { id: 'email', label: 'Email', icon: FileText },
  { id: 'text', label: 'Text', icon: MessageSquare },
  { id: 'social_post', label: 'Social post', icon: Camera, comingSoon: true },
  { id: 'call_script', label: 'Call script', icon: Phone },
]

interface ChannelTabsProps {
  activeTab: ChannelTab
  onTabChange: (tab: ChannelTab) => void
  letterSent: boolean
  channels: MblCampaignChannel[]
}

export function ChannelTabs({ activeTab, onTabChange, letterSent, channels }: ChannelTabsProps) {
  const channelMap = new Map(channels.map((c) => [c.channel as string, c]))

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const isGenerated = tab.id === 'letter' ? letterSent : !!channelMap.get(tab.id)
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => !tab.comingSoon && onTabChange(tab.id)}
            disabled={tab.comingSoon}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
              isActive
                ? 'bg-background border-foreground/20 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/10',
              tab.comingSoon && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.id === 'letter' && letterSent && (
              <span className="h-2 w-2 rounded-full bg-green-500" />
            )}
            {tab.comingSoon && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Soon
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
