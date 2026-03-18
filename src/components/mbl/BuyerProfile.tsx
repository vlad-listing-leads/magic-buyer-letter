'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'
import { ChipSelector } from './ChipSelector'
import { generateBullets } from '@/lib/bullets'
import { cn } from '@/lib/utils'
import type {
  BuyerProfileData,
  FinancingType,
  ClosingFlexibility,
  PropertyConditionTolerance,
  PropertySearchCriteria,
} from '@/types'

const FINANCING_OPTIONS = [
  { value: 'pre-approved', label: 'Pre-approved' },
  { value: 'cash', label: 'Cash buyer' },
  { value: 'fha', label: 'FHA' },
  { value: 'va', label: 'VA' },
  { value: 'conventional', label: 'Conventional' },
]

const CLOSING_OPTIONS = [
  { value: 'flexible', label: 'Flexible' },
  { value: 'quick-close', label: 'Quick close (21 days)' },
  { value: '30-days', label: '30 days' },
  { value: 'no-rush', label: 'No rush' },
  { value: 'rent-back', label: 'Open to rent-back' },
]

const CONDITION_OPTIONS = [
  { value: 'minor-updates', label: 'Minor updates OK' },
  { value: 'as-is', label: 'As-is / no repairs' },
  { value: 'move-in-ready', label: 'Move-in ready only' },
  { value: 'major-reno', label: 'Major reno OK' },
]

interface BuyerProfileProps {
  buyerName: string
  criteria: PropertySearchCriteria
  initialProfile?: Partial<BuyerProfileData>
  onBack: () => void
  onComplete: (profile: BuyerProfileData) => void
}

export function BuyerProfile({ buyerName, criteria, initialProfile, onBack, onComplete }: BuyerProfileProps) {
  const [profile, setProfile] = useState<BuyerProfileData>({
    financing: initialProfile?.financing ?? '',
    closing_flexibility: initialProfile?.closing_flexibility ?? '',
    condition_tolerance: initialProfile?.condition_tolerance ?? '',
    additional_notes: initialProfile?.additional_notes ?? '',
  })

  const bullets = generateBullets(profile, {
    min: criteria.price_min,
    max: criteria.price_max,
  })

  const canContinue = profile.financing !== ''

  const handleSubmit = () => {
    onComplete(profile)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          What should the letter say about {buyerName || 'your buyer'}?
        </h1>
        <p className="text-muted-foreground">
          Pick what applies — these become bullet points in your letter
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Selections — left */}
        <div className="lg:col-span-3 space-y-6">
          <ChipSelector
            label="Financing"
            options={FINANCING_OPTIONS}
            value={profile.financing}
            onChange={(v) =>
              setProfile((prev) => ({ ...prev, financing: v as FinancingType | '' }))
            }
          />

          <Separator />

          <ChipSelector
            label="Closing flexibility"
            options={CLOSING_OPTIONS}
            value={profile.closing_flexibility}
            onChange={(v) =>
              setProfile((prev) => ({ ...prev, closing_flexibility: v as ClosingFlexibility | '' }))
            }
          />

          <Separator />

          <ChipSelector
            label="Property condition"
            options={CONDITION_OPTIONS}
            value={profile.condition_tolerance}
            onChange={(v) =>
              setProfile((prev) => ({
                ...prev,
                condition_tolerance: v as PropertyConditionTolerance | '',
              }))
            }
          />

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Anything else?</label>
            <Input
              value={profile.additional_notes}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, additional_notes: e.target.value }))
              }
              placeholder="e.g. relocating from NYC, first-time buyer, growing family"
            />
          </div>
        </div>

        {/* Live bullet preview — right */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 border-[#006AFF]/20 bg-[#006AFF]/[0.03]">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-[#006AFF]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#006AFF]">
                  Letter preview
                </span>
              </div>
              {bullets.length > 0 ? (
                <ul className="space-y-3">
                  {bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select financing to see your letter bullets
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canContinue}
          className={cn(
            'px-8 h-11 text-sm font-semibold transition-all',
            canContinue
              ? 'bg-[#006AFF] text-white hover:bg-[#0058D4] shadow-lg shadow-[#006AFF]/25'
              : 'bg-muted text-muted-foreground'
          )}
          size="lg"
        >
          Generate Letters
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
