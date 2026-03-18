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

interface SmartInputProps {
  onComplete: (buyerName: string, description: string, criteria: PropertySearchCriteria) => void
}

export function SmartInput({ onComplete }: SmartInputProps) {
  const [text, setText] = useState('')
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
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Voice input"
            >
              <Mic className="h-5 w-5" />
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
