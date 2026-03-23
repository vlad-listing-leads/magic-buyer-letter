'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MergeVariableHighlight } from './MergeVariableHighlight'
import { Copy, Loader2, Sparkles } from 'lucide-react'
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
          Uses the same story as your letter.
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

  // Generated — show content
  return (
    <div className="space-y-4">
      {/* Status + copy buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {channel === 'call_script' ? 'Script ready' : 'Ready to send'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {channel === 'email' && channelData.subject && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(channelData.subject!, 'Subject')}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copy subject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(channelData.body, 'Body')}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copy body
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
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copy all
              </Button>
            </>
          )}
          {channel !== 'email' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(channelData.body, CHANNEL_LABELS[channel])}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          )}
        </div>
      </div>

      {/* Email subject */}
      {channel === 'email' && channelData.subject && (
        <Card className="bg-muted/50">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Subject line</p>
            <p className="text-base font-medium">
              <MergeVariableHighlight text={channelData.subject} />
            </p>
          </CardContent>
        </Card>
      )}

      {/* Body content */}
      <Card>
        <CardContent className="py-6 px-6">
          <div className="space-y-4 text-[15px] leading-relaxed">
            {channelData.body.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-2" />

              // Call script section headers
              if (line.match(/^\[.+\]$/)) {
                return (
                  <p key={i} className="font-semibold text-amber-600 dark:text-amber-400 text-sm uppercase tracking-wide">
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
        </CardContent>
      </Card>

      {/* Channel-specific hints */}
      {channel === 'text' && (
        <p className="text-xs text-muted-foreground">
          {channelData.body.length} chars ideal for first text · Follow up in 48 hrs if no response
        </p>
      )}
      {channel === 'call_script' && (
        <p className="text-xs text-muted-foreground">
          Tip: Practice the script 2-3 times before calling. Sound natural, not scripted.
        </p>
      )}

      {/* Regenerate */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        className="text-muted-foreground"
      >
        {generateMutation.isPending ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Regenerating...</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Regenerate</>
        )}
      </Button>
    </div>
  )
}
