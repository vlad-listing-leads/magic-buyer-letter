'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { ChipSelector } from './ChipSelector'
import { generateBullets } from '@/lib/bullets'
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
  onBack: () => void
  onComplete: (profile: BuyerProfileData) => void
}

export function BuyerProfile({ buyerName, criteria, onBack, onComplete }: BuyerProfileProps) {
  const [profile, setProfile] = useState<BuyerProfileData>({
    financing: '',
    closing_flexibility: '',
    condition_tolerance: '',
    additional_notes: '',
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
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">New Magic Buyer Letter</h2>
        <p className="text-muted-foreground">
          These become the bullet points in your letter
        </p>
      </div>

      <div className="max-w-3xl mx-auto grid gap-6 lg:grid-cols-5">
        {/* Form — left side */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                What should the letter say about {buyerName || 'your buyer'}?
              </CardTitle>
              <CardDescription>
                Select one option from each category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ChipSelector
                label="Financing"
                options={FINANCING_OPTIONS}
                value={profile.financing}
                onChange={(v) =>
                  setProfile((prev) => ({ ...prev, financing: v as FinancingType | '' }))
                }
              />

              <ChipSelector
                label="Closing flexibility"
                options={CLOSING_OPTIONS}
                value={profile.closing_flexibility}
                onChange={(v) =>
                  setProfile((prev) => ({ ...prev, closing_flexibility: v as ClosingFlexibility | '' }))
                }
              />

              <ChipSelector
                label="Property condition tolerance"
                options={CONDITION_OPTIONS}
                value={profile.condition_tolerance}
                onChange={(v) =>
                  setProfile((prev) => ({
                    ...prev,
                    condition_tolerance: v as PropertyConditionTolerance | '',
                  }))
                }
              />

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
            </CardContent>
          </Card>
        </div>

        {/* Live preview — right side */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Letter will say:
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bullets.length > 0 ? (
                <ul className="space-y-3">
                  {bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select options to see your letter bullets
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="bg-[#006AFF] hover:bg-[#0058D4] text-white px-8"
          size="lg"
        >
          Generate Letters
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
