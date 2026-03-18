'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Mic, MicOff, User, MapPin, DollarSign, BedDouble, Bath } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertySearchCriteria } from '@/types'

interface ParsedData {
  buyer_name: string
  criteria: PropertySearchCriteria
}

function parseDescription(text: string): ParsedData {
  const parsed: ParsedData = {
    buyer_name: '',
    criteria: {},
  }

  const nameMatch = text.match(/(?:my\s+)?(?:buyer|client|buyers|clients)\s+(?:named?\s+)?([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)/i)
  if (nameMatch) parsed.buyer_name = nameMatch[1]

  if (!parsed.buyer_name) {
    const leadNameMatch = text.match(/^([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)\s*,/)
    if (leadNameMatch) parsed.buyer_name = leadNameMatch[1]
  }

  // Parse price with K/M suffix support: "$800K-1.2M", "$400K-$600K", "$1.5M"
  const priceWithSuffix = /\$?([\d,.]+)\s*([kKmM])\s*(?:[-–to]+\s*\$?([\d,.]+)\s*([kKmM]))?/g
  const priceMatch = priceWithSuffix.exec(text)
  if (priceMatch) {
    const toNum = (val: string, suffix: string) => {
      const n = parseFloat(val.replace(/,/g, ''))
      return /[mM]/.test(suffix) ? n * 1_000_000 : n * 1000
    }
    parsed.criteria.price_min = toNum(priceMatch[1], priceMatch[2])
    if (priceMatch[3] && priceMatch[4]) {
      parsed.criteria.price_max = toNum(priceMatch[3], priceMatch[4])
    }
  }
  // Fallback: full dollar amounts without suffix
  if (!priceMatch) {
    const fullPricePattern = /\$?([\d,]+)\s*(?:[-–to]+\s*\$?([\d,]+))?/g
    const fp = fullPricePattern.exec(text)
    if (fp) {
      const val = parseInt(fp[1].replace(/,/g, ''), 10)
      if (val > 50000) {
        parsed.criteria.price_min = val
        if (fp[2]) {
          parsed.criteria.price_max = parseInt(fp[2].replace(/,/g, ''), 10)
        }
      }
    }
  }

  const bedMatch = text.match(/(\d+)\s*[-+]?\s*(?:bed(?:room)?s?|br|bd)/i)
  if (bedMatch) parsed.criteria.beds_min = parseInt(bedMatch[1], 10)

  const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*[-+]?\s*(?:bath(?:room)?s?|ba)/i)
  if (bathMatch) parsed.criteria.baths_min = parseFloat(bathMatch[1])

  const inMatch = text.match(/\bin\s+([A-Z][a-zA-Z\s]+?)(?:\s*,\s*([A-Z]{2}))?\s*(?:\.|$|between|under|over|around|near)/i)
  if (inMatch) {
    parsed.criteria.city = inMatch[1].trim()
    if (inMatch[2]) parsed.criteria.state = inMatch[2]
  }

  const zipMatch = text.match(/\b(\d{5})\b/)
  if (zipMatch) parsed.criteria.zip = zipMatch[1]

  if (!parsed.criteria.state) {
    const stateMatch = text.match(/,\s*([A-Z]{2})\b/)
    if (stateMatch) parsed.criteria.state = stateMatch[1]
  }

  return parsed
}

const VOICE_BAR_HEIGHTS = [8, 20, 12, 28, 16, 24, 10, 30, 14, 22, 8, 26, 18, 32, 10, 20, 14, 28, 12, 24, 8, 18, 26, 14]

interface SmartInputProps {
  onComplete: (buyerName: string, description: string, criteria: PropertySearchCriteria) => void
}

export function SmartInput({ onComplete }: SmartInputProps) {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const parsed = useMemo(() => parseDescription(text), [text])

  const hasCriteria = parsed.buyer_name || parsed.criteria.city || parsed.criteria.price_min || parsed.criteria.beds_min

  const handleContinue = () => {
    onComplete(parsed.buyer_name, text, parsed.criteria)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      e.preventDefault()
      handleContinue()
    }
  }

  const baseTextRef = useRef('')

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

  // Criteria items for the detection cards
  const detectedItems = useMemo(() => {
    const items: { icon: typeof User; label: string; value: string; color: string }[] = []
    if (parsed.buyer_name) {
      items.push({ icon: User, label: 'Buyer', value: parsed.buyer_name, color: 'text-violet-400' })
    }
    if (parsed.criteria.city) {
      const loc = `${parsed.criteria.city}${parsed.criteria.state ? `, ${parsed.criteria.state}` : ''}`
      items.push({ icon: MapPin, label: 'Area', value: loc, color: 'text-emerald-400' })
    }
    if (parsed.criteria.zip) {
      items.push({ icon: MapPin, label: 'ZIP', value: parsed.criteria.zip, color: 'text-emerald-400' })
    }
    if (parsed.criteria.price_min) {
      const price = `$${(parsed.criteria.price_min / 1000).toFixed(0)}K${parsed.criteria.price_max ? `–$${(parsed.criteria.price_max / 1000).toFixed(0)}K` : '+'}`
      items.push({ icon: DollarSign, label: 'Price', value: price, color: 'text-amber-400' })
    }
    if (parsed.criteria.beds_min) {
      items.push({ icon: BedDouble, label: 'Beds', value: `${parsed.criteria.beds_min}+`, color: 'text-blue-400' })
    }
    if (parsed.criteria.baths_min) {
      items.push({ icon: Bath, label: 'Baths', value: `${parsed.criteria.baths_min}+`, color: 'text-blue-400' })
    }
    return items
  }, [parsed])

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
          {/* Glow */}
          <div
            className={cn(
              'absolute -inset-1 rounded-2xl bg-[#006AFF]/20 blur-xl transition-opacity duration-500',
              isFocused || text ? 'opacity-100' : 'opacity-0'
            )}
          />

          <div className="relative">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Sarah, $400-600K, 3 bed 2 bath, Newton, pre-approved"
              className={cn(
                'w-full h-16 pl-5 pr-28 rounded-2xl border-2 bg-background text-lg',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none transition-colors duration-200',
                isFocused || text
                  ? 'border-[#006AFF]/50'
                  : 'border-border'
              )}
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleVoice}
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
                disabled={!text.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  text.trim()
                    ? 'bg-[#006AFF] text-white hover:bg-[#0058D4] shadow-lg shadow-[#006AFF]/25'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

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

        {/* Detected criteria — appears as cards */}
        {hasCriteria && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
              Auto-detected
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {detectedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/60 text-sm"
                  style={{ animationDelay: `${i * 0.05}s` }}
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
