'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { MergeVariableHighlight } from './MergeVariableHighlight'
import { Copy, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { sileo } from 'sileo'
import type { MblCampaignChannel, ChannelType } from '@/types'

interface ChannelContentProps {
  campaignId: string
  channel: ChannelType
  channelData: MblCampaignChannel | undefined
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  email: 'Email',
  text: 'Text Message',
  call_script: 'Call Script',
}

export function ChannelContent({ campaignId, channel, channelData }: ChannelContentProps) {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${campaignId}/generate-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      if (!res.ok) throw new Error('Failed to generate')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-channels', campaignId] })
      sileo.success({ title: `${CHANNEL_LABELS[channel]} generated` })
    },
    onError: () => sileo.error({ title: `Failed to generate ${CHANNEL_LABELS[channel].toLowerCase()}` }),
  })

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    sileo.success({ title: `${label} copied` })
  }

  // Not generated yet
  if (!channelData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{CHANNEL_LABELS[channel]}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
          Generate a {CHANNEL_LABELS[channel].toLowerCase()} template based on your buyer&apos;s profile.
        </p>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Generate {CHANNEL_LABELS[channel]}</>
          )}
        </Button>
      </div>
    )
  }

  // Email layout — subject header + body + copy buttons at bottom
  if (channel === 'email') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Subject line header */}
          {channelData.subject && (
            <div className="border-b border-border px-6 py-4">
              <span className="text-sm text-muted-foreground mr-3">Subject:</span>
              <span className="text-[15px] font-medium">
                <MergeVariableHighlight text={channelData.subject} />
              </span>
            </div>
          )}

          {/* Email body */}
          <div className="px-6 py-6">
            <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
              {channelData.body.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-3" />
                return (
                  <p key={i}>
                    <MergeVariableHighlight text={line} />
                  </p>
                )
              })}
            </div>
          </div>

          {/* Bottom bar with copy buttons */}
          <div className="border-t border-border px-6 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="text-muted-foreground text-xs gap-1.5"
            >
              <RotateCcw className="h-3 w-3" /> Regenerate
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(channelData.body, 'Body')}
                className="text-xs gap-1.5"
              >
                <Copy className="h-3 w-3" /> Copy body
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${channelData.subject}\n\n${channelData.body}`,
                    'Email'
                  )
                }
                className="text-xs gap-1.5"
              >
                <Copy className="h-3 w-3" /> Copy all
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Text message layout — single bubble-like card
  if (channel === 'text') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-6">
            <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
              {channelData.body.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-3" />
                return (
                  <p key={i}>
                    <MergeVariableHighlight text={line} />
                  </p>
                )
              })}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="text-muted-foreground text-xs gap-1.5"
              >
                <RotateCcw className="h-3 w-3" /> Regenerate
              </Button>
              <span className="text-xs text-muted-foreground">
                {channelData.body.length} chars · Follow up in 48 hrs if no response
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(channelData.body, 'Text')}
              className="text-xs gap-1.5"
            >
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Call script layout — sections with colored headers
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-6">
          <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
            {channelData.body.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-3" />

              // Section headers like [OPENING], [IF YES — THE HOOK]
              if (line.match(/^\[.+\]$/)) {
                return (
                  <p key={i} className="font-semibold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-widest pt-2">
                    {line}
                  </p>
                )
              }

              return (
                <p key={i}>
                  <MergeVariableHighlight text={line} />
                </p>
              )
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="text-muted-foreground text-xs gap-1.5"
          >
            <RotateCcw className="h-3 w-3" /> Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(channelData.body, 'Call Script')}
            className="text-xs gap-1.5"
          >
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>
      </div>
    </div>
  )
}
