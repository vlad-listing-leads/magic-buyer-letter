'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ChipSelector } from './ChipSelector'
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
  onCriteriaChange: (criteria: PropertySearchCriteria) => void
  onBuyerNameChange: (name: string) => void
  initialProfile?: Partial<BuyerProfileData>
  onProfileChange?: (profile: BuyerProfileData) => void
  onBack: () => void
  onComplete: (profile: BuyerProfileData) => void
}

export function BuyerProfile({
  buyerName,
  criteria,
  onCriteriaChange,
  onBuyerNameChange,
  initialProfile,
  onProfileChange,
  onBack,
  onComplete,
}: BuyerProfileProps) {
  const [profile, setProfile] = useState<BuyerProfileData>({
    financing: initialProfile?.financing ?? '',
    closing_flexibility: initialProfile?.closing_flexibility ?? '',
    condition_tolerance: initialProfile?.condition_tolerance ?? '',
    additional_notes: initialProfile?.additional_notes ?? '',
  })

  useEffect(() => {
    onProfileChange?.(profile)
  }, [profile, onProfileChange])

  const [propertyCount, setPropertyCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasLocation = !!(criteria.city && criteria.state) || !!criteria.zip
  const hasPrice = !!(criteria.price_min && criteria.price_max)
  const priceGapOk = !hasPrice || ((criteria.price_max! - criteria.price_min!) <= 600000)
  const hasYearsOwned = criteria.years_owned_min !== undefined
  const hasBeds = !!criteria.beds_min
  const hasBaths = !!criteria.baths_min
  const canContinue = hasLocation && hasPrice && priceGapOk
  const canCount = hasLocation && hasPrice && priceGapOk

  const fetchCount = useCallback(async (c: PropertySearchCriteria) => {
    setCountLoading(true)
    try {
      const res = await fetch('/api/mbl/search-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      })
      const json = await res.json()
      if (json.success) {
        setPropertyCount(json.data.count)
      }
    } catch {
      setPropertyCount(null)
    } finally {
      setCountLoading(false)
    }
  }, [])

  // Debounced count fetch when search criteria change
  useEffect(() => {
    if (!canCount) {
      setPropertyCount(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCount(criteria), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [criteria, canCount, fetchCount])

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in pb-20">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {buyerName || 'Your buyer'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Search criteria &amp; letter content
        </p>
      </div>

      {/* Search section */}
      <div className="space-y-4">
        {/* Location row */}
        <div>
          <label className={cn('text-sm font-medium mb-2 block', !hasLocation ? 'text-destructive' : 'text-muted-foreground')}>Location</label>
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <Input
                value={criteria.city ?? ''}
                onChange={(e) => onCriteriaChange({ ...criteria, city: e.target.value || undefined })}
                placeholder="City"
                className="h-8 text-sm"
              />
            </div>
            <Input
              value={criteria.state ?? ''}
              onChange={(e) => onCriteriaChange({ ...criteria, state: e.target.value || undefined })}
              placeholder="State"
              maxLength={2}
              className="h-8 text-sm"
            />
            <Input
              value={criteria.zip ?? ''}
              onChange={(e) => onCriteriaChange({ ...criteria, zip: e.target.value || undefined })}
              placeholder="ZIP"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Value + sqft row */}
        <div>
          <label className={cn('text-sm font-medium mb-2 block', !hasPrice ? 'text-destructive' : 'text-muted-foreground')}>Value &amp; Size</label>
          <div className="grid grid-cols-4 gap-2">
            <Input
              type="number"
              value={criteria.price_min ? criteria.price_min / 1000 : ''}
              onChange={(e) => onCriteriaChange({ ...criteria, price_min: e.target.value ? Number(e.target.value) * 1000 : undefined })}
              placeholder="Min $K"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              value={criteria.price_max ? criteria.price_max / 1000 : ''}
              onChange={(e) => onCriteriaChange({ ...criteria, price_max: e.target.value ? Number(e.target.value) * 1000 : undefined })}
              placeholder="Max $K"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              value={criteria.sqft_min ?? ''}
              onChange={(e) => onCriteriaChange({ ...criteria, sqft_min: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Sqft min"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              value={criteria.sqft_max ?? ''}
              onChange={(e) => onCriteriaChange({ ...criteria, sqft_max: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Sqft max"
              className="h-8 text-sm"
            />
          </div>
          {hasPrice && !priceGapOk && (
            <p className="text-xs text-destructive mt-1">Gap cannot exceed $600K</p>
          )}
        </div>

        {/* Years / Beds / Baths — all on one row */}
        <div className="grid grid-cols-3 gap-3">
          <ChipSelector
            label="Years owned *"
            options={[
              { value: 'any', label: 'Any' },
              { value: '3', label: '3+' },
              { value: '5', label: '5+' },
              { value: '10', label: '10+' },
              { value: '20', label: '20+' },
            ]}
            value={criteria.years_owned_min === 0 ? 'any' : criteria.years_owned_min ? String(criteria.years_owned_min) : ''}
            onChange={(v) => onCriteriaChange({ ...criteria, years_owned_min: v === 'any' ? 0 : v ? Number(v) : undefined })}
          />
          <ChipSelector
            label="Beds *"
            options={[
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
            ]}
            value={criteria.beds_min ? String(criteria.beds_min) : ''}
            onChange={(v) => onCriteriaChange({ ...criteria, beds_min: v ? Number(v) : undefined })}
            error
          />
          <ChipSelector
            label="Baths *"
            options={[
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
            ]}
            value={criteria.baths_min ? String(criteria.baths_min) : ''}
            onChange={(v) => onCriteriaChange({ ...criteria, baths_min: v ? Number(v) : undefined })}
            error
          />
        </div>
      </div>

      {/* Property count preview */}
      {canCount && (
        <div className={cn(
          'rounded-lg border px-4 py-3 text-sm',
          countLoading ? 'border-border text-muted-foreground' :
          propertyCount === null ? 'border-border text-muted-foreground' :
          propertyCount < 25 ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
          propertyCount > 2000 ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
          'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300'
        )}>
          {countLoading ? (
            'Counting properties...'
          ) : propertyCount === null ? (
            'Checking available properties...'
          ) : propertyCount === 0 ? (
            'No properties found — try expanding your search area or price range.'
          ) : propertyCount < 25 ? (
            <><strong>{propertyCount.toLocaleString()}</strong> properties found — consider expanding your criteria for better results.</>
          ) : propertyCount > 2000 ? (
            <><strong>{propertyCount.toLocaleString()}</strong> properties found — consider narrowing your price range or area to refine results.</>
          ) : (
            <><strong>{propertyCount.toLocaleString()}</strong> properties found</>
          )}
        </div>
      )}

      <Separator />

      {/* Letter content section */}
      <div className="space-y-3">
        <ChipSelector
          label="Financing *"
          error
          options={FINANCING_OPTIONS}
          value={profile.financing}
          onChange={(v) => setProfile((prev) => ({ ...prev, financing: v as FinancingType | '' }))}
        />

        <ChipSelector
          label="Closing flexibility"
          options={CLOSING_OPTIONS}
          value={profile.closing_flexibility}
          onChange={(v) => setProfile((prev) => ({ ...prev, closing_flexibility: v as ClosingFlexibility | '' }))}
        />

        <ChipSelector
          label="Property condition"
          options={CONDITION_OPTIONS}
          value={profile.condition_tolerance}
          onChange={(v) => setProfile((prev) => ({ ...prev, condition_tolerance: v as PropertyConditionTolerance | '' }))}
        />

        <div className="space-y-1">
          <label className="text-sm font-medium">Anything else?</label>
          <textarea
            value={profile.additional_notes}
            onChange={(e) => setProfile((prev) => ({ ...prev, additional_notes: e.target.value }))}
            placeholder="e.g. relocating from NYC, first-time buyer, growing family..."
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  )
}
