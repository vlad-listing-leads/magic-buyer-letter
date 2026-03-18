'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Mic, MicOff } from 'lucide-react'
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

  // Extract buyer name — "my buyer Sarah", "my client John and Jane", "buyer named Mike"
  const nameMatch = text.match(/(?:my\s+)?(?:buyer|client|buyers|clients)\s+(?:named?\s+)?([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)/i)
  if (nameMatch) parsed.buyer_name = nameMatch[1]

  // Also try standalone name at beginning: "Sarah, $400K..."
  if (!parsed.buyer_name) {
    const leadNameMatch = text.match(/^([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)\s*,/)
    if (leadNameMatch) parsed.buyer_name = leadNameMatch[1]
  }

  // Extract price range
  const pricePattern = /\$?([\d,.]+)\s*[kK]\s*(?:[-–to]+\s*\$?([\d,.]+)\s*[kK])?/g
  const priceMatch = pricePattern.exec(text)
  if (priceMatch) {
    const p1 = parseFloat(priceMatch[1].replace(/,/g, '')) * 1000
    parsed.criteria.price_min = p1
    if (priceMatch[2]) {
      parsed.criteria.price_max = parseFloat(priceMatch[2].replace(/,/g, '')) * 1000
    }
  }
  // Also try full dollar amounts
  const fullPricePattern = /\$?([\d,]+)\s*(?:[-–to]+\s*\$?([\d,]+))?/g
  if (!priceMatch) {
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

  // Extract bedrooms
  const bedMatch = text.match(/(\d+)\s*[-+]?\s*(?:bed(?:room)?s?|br|bd)/i)
  if (bedMatch) parsed.criteria.beds_min = parseInt(bedMatch[1], 10)

  // Extract bathrooms
  const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*[-+]?\s*(?:bath(?:room)?s?|ba)/i)
  if (bathMatch) parsed.criteria.baths_min = parseFloat(bathMatch[1])

  // Extract area/city/state
  const inMatch = text.match(/\bin\s+([A-Z][a-zA-Z\s]+?)(?:\s*,\s*([A-Z]{2}))?\s*(?:\.|$|between|under|over|around|near)/i)
  if (inMatch) {
    parsed.criteria.city = inMatch[1].trim()
    if (inMatch[2]) parsed.criteria.state = inMatch[2]
  }

  // Extract ZIP
  const zipMatch = text.match(/\b(\d{5})\b/)
  if (zipMatch) parsed.criteria.zip = zipMatch[1]

  // Extract state if not found yet
  if (!parsed.criteria.state) {
    const stateMatch = text.match(/,\s*([A-Z]{2})\b/)
    if (stateMatch) parsed.criteria.state = stateMatch[1]
  }

  return parsed
}

// Pre-computed random heights for voice visualizer bars
const VOICE_BAR_HEIGHTS = [8, 20, 12, 28, 16, 24, 10, 30, 14, 22, 8, 26, 18, 32, 10, 20, 14, 28, 12, 24, 8, 18, 26, 14]

interface SmartInputProps {
  onComplete: (buyerName: string, description: string, criteria: PropertySearchCriteria) => void
}

export function SmartInput({ onComplete }: SmartInputProps) {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
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

    // Capture whatever text is already in the input as the base
    baseTextRef.current = text

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Rebuild full transcript from all results every time
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">New Magic Buyer Letter</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Describe your buyer in one line
        </p>
      </div>

      {/* Single-line input with inline buttons */}
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sarah, $400-600K, 3 bed 2 bath, Newton, pre-approved"
            className="w-full h-14 pl-4 pr-24 rounded-xl border border-border bg-background text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#006AFF]/50 focus:border-[#006AFF]"
            autoFocus
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                'p-2 rounded-lg transition-colors',
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
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#006AFF] text-white text-sm font-medium hover:bg-[#0058D4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Voice visualizer */}
        {isListening && (
          <div className="flex flex-col items-center gap-3 mt-4">
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
      </div>

      {/* Parsed preview */}
      {hasCriteria && (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <p className="text-sm text-muted-foreground mb-2">Include these for best results:</p>
          <div className="flex flex-wrap gap-2">
            {parsed.buyer_name && (
              <Badge variant="secondary">Buyer: {parsed.buyer_name}</Badge>
            )}
            {parsed.criteria.city && (
              <Badge variant="secondary">
                Area: {parsed.criteria.city}{parsed.criteria.state ? `, ${parsed.criteria.state}` : ''}
              </Badge>
            )}
            {parsed.criteria.zip && (
              <Badge variant="secondary">ZIP: {parsed.criteria.zip}</Badge>
            )}
            {parsed.criteria.price_min && (
              <Badge variant="secondary">
                Price: ${(parsed.criteria.price_min / 1000).toFixed(0)}K
                {parsed.criteria.price_max ? `–$${(parsed.criteria.price_max / 1000).toFixed(0)}K` : '+'}
              </Badge>
            )}
            {parsed.criteria.beds_min && (
              <Badge variant="secondary">{parsed.criteria.beds_min}+ beds</Badge>
            )}
            {parsed.criteria.baths_min && (
              <Badge variant="secondary">{parsed.criteria.baths_min}+ baths</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
