'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowRight, Mic, MicOff, User, MapPin, DollarSign, BedDouble, Bath, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApiFetch } from '@/hooks/useApiFetch'
import { toast } from 'sonner'
import type { PropertySearchCriteria } from '@/types'

const VOICE_BAR_HEIGHTS = [8, 20, 12, 28, 16, 24, 10, 30, 14, 22, 8, 26, 18, 32, 10, 20, 14, 28, 12, 24, 8, 18, 26, 14]

interface ParsedCriteria {
  buyer_name: string
  city: string | null
  state: string | null
  zip: string | null
  price_min: number | null
  price_max: number | null
  beds_min: number | null
  baths_min: number | null
  sqft_min: number | null
  sqft_max: number | null
  financing: string | null
  notes: string | null
}

interface SmartInputProps {
  onComplete: (buyerName: string, description: string, criteria: PropertySearchCriteria) => void
}

export function SmartInput({ onComplete }: SmartInputProps) {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedCriteria | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const baseTextRef = useRef('')
  const apiFetch = useApiFetch()

  const handleContinue = async () => {
    if (!text.trim()) return

    setIsParsing(true)
    try {
      const res = await apiFetch('/api/mbl/parse-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      const data = json.data as ParsedCriteria
      setParsed(data)

      // Convert to PropertySearchCriteria and continue
      const criteria: PropertySearchCriteria = {}
      if (data.city) criteria.city = data.city
      if (data.state) criteria.state = data.state
      if (data.zip) criteria.zip = data.zip
      if (data.price_min) criteria.price_min = data.price_min
      if (data.price_max) criteria.price_max = data.price_max
      if (data.beds_min) criteria.beds_min = data.beds_min
      if (data.baths_min) criteria.baths_min = data.baths_min
      if (data.sqft_min) criteria.sqft_min = data.sqft_min
      if (data.sqft_max) criteria.sqft_max = data.sqft_max

      const buyerName = data.buyer_name || 'My Buyer'

      // Pass financing and notes through for Step 2 pre-fill
      const enrichedCriteria = {
        ...criteria,
        ...(data.financing ? { financing: data.financing } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      }

      onComplete(buyerName, text, enrichedCriteria)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse description')
    } finally {
      setIsParsing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim() && !isParsing) {
      e.preventDefault()
      handleContinue()
    }
  }

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    baseTextRef.current = text

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      const base = baseTextRef.current
      const separator = base && !base.endsWith(' ') ? ' ' : ''
      setText(base + separator + final + interim)
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.start()
    setIsListening(true)
  }, [isListening, text])

  // Build detected items from parsed data
  const detectedItems = parsed ? (() => {
    const items: { icon: typeof User; label: string; value: string; color: string }[] = []
    if (parsed.buyer_name && parsed.buyer_name !== 'My Buyer') {
      items.push({ icon: User, label: 'Buyer', value: parsed.buyer_name, color: 'text-violet-400' })
    }
    if (parsed.city) {
      items.push({ icon: MapPin, label: 'Area', value: `${parsed.city}${parsed.state ? `, ${parsed.state}` : ''}`, color: 'text-emerald-400' })
    }
    if (parsed.zip) {
      items.push({ icon: MapPin, label: 'ZIP', value: parsed.zip, color: 'text-emerald-400' })
    }
    if (parsed.price_min || parsed.price_max) {
      const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`
      const price = parsed.price_min && parsed.price_max
        ? `${fmtK(parsed.price_min)}–${fmtK(parsed.price_max)}`
        : parsed.price_min ? `${fmtK(parsed.price_min)}+` : `up to ${fmtK(parsed.price_max!)}`
      items.push({ icon: DollarSign, label: 'Price', value: price, color: 'text-amber-400' })
    }
    if (parsed.beds_min) {
      items.push({ icon: BedDouble, label: 'Beds', value: `${parsed.beds_min}+`, color: 'text-blue-400' })
    }
    if (parsed.baths_min) {
      items.push({ icon: Bath, label: 'Baths', value: `${parsed.baths_min}+`, color: 'text-blue-400' })
    }
    return items
  })() : []

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero heading */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Describe your buyer
          </h1>
          <p className="text-muted-foreground text-base">
            One sentence is all it takes. We&apos;ll handle the rest.
          </p>
        </div>

        {/* Input with glow effect */}
        <div className="relative">
          <div
            className={cn(
              'absolute -inset-1 rounded-2xl bg-[#006AFF]/20 blur-xl transition-opacity duration-500',
              isFocused || text ? 'opacity-100' : 'opacity-0'
            )}
          />

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setParsed(null)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.max(64, e.target.scrollHeight)}px`
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Sarah, $800K-1.2M, 3 bed in Newton MA, pre-approved"
              disabled={isParsing}
              rows={1}
              className={cn(
                'w-full min-h-16 pl-5 pr-28 py-4 rounded-2xl border-2 bg-background text-lg resize-none overflow-hidden',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none transition-colors duration-200',
                'disabled:opacity-60',
                isFocused || text ? 'border-[#006AFF]/50' : 'border-border'
              )}
              autoFocus
            />
            <div className="absolute right-2 top-4 flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleVoice}
                disabled={isParsing}
                className={cn(
                  'p-2.5 rounded-xl transition-all',
                  isListening
                    ? 'bg-red-500/10 text-red-500 animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!text.trim() || isParsing}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  text.trim() && !isParsing
                    ? 'bg-[#006AFF] text-white hover:bg-[#0058D4] shadow-lg shadow-[#006AFF]/25'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI parsing indicator */}
        {isParsing && (
          <div className="flex items-center justify-center gap-2 text-sm text-[#006AFF]">
            <Sparkles className="h-4 w-4" />
            <span>AI is analyzing your description...</span>
          </div>
        )}

        {/* Voice visualizer */}
        {isListening && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-end justify-center gap-[3px] h-8">
              {VOICE_BAR_HEIGHTS.map((maxH, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-red-500"
                  style={{
                    animationName: 'voice-bar',
                    animationDuration: `${0.4 + (i % 5) * 0.1}s`,
                    animationDelay: `${i * 0.04}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDirection: 'alternate',
                    // @ts-expect-error CSS custom property
                    '--bar-max': `${maxH}px`,
                    height: '4px',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={toggleVoice}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              <MicOff className="h-3.5 w-3.5" />
              Stop recording
            </button>
            <style>{`
              @keyframes voice-bar {
                0% { height: 4px; }
                100% { height: var(--bar-max, 20px); }
              }
            `}</style>
          </div>
        )}

        {/* Detected criteria from AI parse */}
        {detectedItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
              AI detected
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {detectedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/60 text-sm"
                >
                  <item.icon className={cn('h-3.5 w-3.5', item.color)} />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example hint */}
        {!text && !isListening && (
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground/60">
              Try: &ldquo;Sarah and Mike, $800K-1.2M, 3 bed in Newton MA, pre-approved&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setText('Sarah and Mike, $800K-1.2M, 3 bed in Newton MA, pre-approved')}
              className="text-xs text-[#006AFF] hover:text-[#0058D4] font-medium"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
