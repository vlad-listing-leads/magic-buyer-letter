'use client'

import { useEffect, useState, useRef } from 'react'
import { Search, UserSearch, MapPin, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineEvent, PipelineStep } from '@/types'

const STEPS: { key: PipelineStep; label: string; icon: typeof Search; description: string }[] = [
  { key: 'searching', label: 'Finding properties', icon: Search, description: 'Searching off-market properties...' },
  { key: 'skip_tracing', label: 'Skip tracing owners', icon: UserSearch, description: 'Looking up owner contact info...' },
  { key: 'verifying', label: 'Verifying addresses', icon: MapPin, description: 'Checking deliverability with Lob...' },
  { key: 'generating', label: 'Writing letters', icon: Sparkles, description: 'AI personalizing each letter...' },
]

interface PipelineLoadingProps {
  campaignId: string | null
  buyerName?: string
  onComplete: (campaignId: string, readyCount: number) => void
  onError: (error: string) => void
}

export function PipelineLoading({ campaignId, buyerName, onComplete, onError }: PipelineLoadingProps) {
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Pulsing icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#006AFF]/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-[#006AFF]/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-[#006AFF]" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {buyerName ? `Finding homeowners for ${buyerName}` : 'Building your campaign'}
          </h2>
          <p className="text-sm text-muted-foreground">This takes about 30 seconds</p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">{message}</span>
            <span className="font-mono text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-[#006AFF] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {STEPS.map((step, i) => {
            const isActive = step.key === currentStep
            const isDone = i < currentStepIndex || currentStep === ('ready' as PipelineStep)
            const isError = error && isActive

            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300',
                  isActive && !isError && 'bg-card border border-border',
                  isDone && 'opacity-50',
                  isError && 'bg-destructive/5 border border-destructive/20',
                )}
              >
                <div className="flex-shrink-0">
                  {isDone ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : isError ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-[#006AFF] animate-spin" />
                  ) : (
                    <step.icon className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isActive && 'text-foreground',
                    isDone && 'text-muted-foreground',
                    !isActive && !isDone && 'text-muted-foreground/50'
                  )}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
                {counts[step.key] !== undefined && (
                  <span className={cn(
                    'text-xs font-mono',
                    isDone ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {counts[step.key]}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
