'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Search, UserSearch, MapPin, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineEvent, PipelineStep } from '@/types'

const STEPS: { key: PipelineStep; label: string; icon: typeof Search; description: string }[] = [
  { key: 'searching', label: 'Finding Properties', icon: Search, description: 'Searching for matching properties...' },
  { key: 'skip_tracing', label: 'Skip Tracing Owners', icon: UserSearch, description: 'Looking up owner contact information...' },
  { key: 'verifying', label: 'Verifying Addresses', icon: MapPin, description: 'Checking address deliverability...' },
  { key: 'generating', label: 'Personalizing Letters', icon: Sparkles, description: 'AI is writing personalized content...' },
]

interface PipelineLoadingProps {
  campaignId: string | null
  onComplete: (campaignId: string, readyCount: number) => void
  onError: (error: string) => void
}

export function PipelineLoading({ campaignId, onComplete, onError }: PipelineLoadingProps) {
  const [currentStep, setCurrentStep] = useState<PipelineStep>('searching')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Starting pipeline...')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const completedRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!campaignId || startedRef.current) return
    startedRef.current = true

    const abortController = new AbortController()

    async function runPipeline() {
      try {
        const res = await fetch(`/api/mbl/campaigns/${campaignId}/pipeline`, {
          signal: abortController.signal,
          credentials: 'same-origin',
        })

        if (!res.ok) {
          const text = await res.text()
          setError(text || `Pipeline failed (${res.status})`)
          onError(text || 'Pipeline failed')
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          setError('No stream available')
          onError('No stream available')
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event: PipelineEvent = JSON.parse(line.slice(6))

              if (event.step === 'error') {
                setError(event.error ?? 'Pipeline error')
                onError(event.error ?? 'Pipeline error')
                return
              }

              if (event.step === 'ready' && !completedRef.current) {
                completedRef.current = true
                setCurrentStep('ready' as PipelineStep)
                setProgress(100)
                setMessage('Pipeline complete!')
                onComplete(event.campaignId!, event.count!)
                return
              }

              setCurrentStep(event.step)
              setProgress(event.progress)
              setMessage(event.message)
              if (event.count !== undefined) {
                setCounts(prev => ({ ...prev, [event.step]: event.count! }))
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return
        const msg = err instanceof Error ? err.message : 'Connection lost'
        setError(msg)
        onError(msg)
      }
    }

    runPipeline()

    return () => {
      abortController.abort()
    }
  }, [campaignId, onComplete, onError])

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Building Your Campaign</h2>
        <p className="text-muted-foreground">
          This typically takes 1-3 minutes
        </p>
      </div>

      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-6">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{message}</span>
              <span className="font-mono text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-[#006AFF] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const isActive = step.key === currentStep
              const isDone = i < currentStepIndex || currentStep === ('ready' as PipelineStep)
              const isError = error && isActive

              return (
                <div
                  key={step.key}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg transition-colors',
                    isActive && !isError && 'bg-[#006AFF]/5',
                    isDone && 'opacity-60',
                    isError && 'bg-destructive/5',
                  )}
                >
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : isError ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-[#006AFF] animate-spin" />
                    ) : (
                      <step.icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', isActive && 'text-foreground', !isActive && !isDone && 'text-muted-foreground')}>
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                  {counts[step.key] !== undefined && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {counts[step.key]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
