'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, MapPin, DollarSign, BedDouble, Bath, Pencil } from 'lucide-react'
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
  onCriteriaChange: (criteria: PropertySearchCriteria) => void
  onBuyerNameChange: (name: string) => void
  initialProfile?: Partial<BuyerProfileData>
  onBack: () => void
  onComplete: (profile: BuyerProfileData) => void
}

// Common city → ZIP code mappings for MA cities
const CITY_ZIPS: Record<string, string[]> = {
  'newton': ['02458', '02459', '02460', '02461', '02462', '02464', '02465', '02466', '02467', '02468'],
  'boston': ['02101', '02102', '02103', '02104', '02105', '02106', '02107', '02108', '02109', '02110', '02111', '02112', '02113', '02114', '02115', '02116', '02117', '02118', '02119', '02120', '02121', '02122', '02124', '02125', '02126', '02127', '02128', '02129', '02130', '02131', '02132', '02134', '02135', '02136'],
  'brookline': ['02445', '02446', '02447'],
  'cambridge': ['02138', '02139', '02140', '02141', '02142'],
  'somerville': ['02143', '02144', '02145'],
  'wellesley': ['02481', '02482'],
  'needham': ['02492', '02494'],
  'waltham': ['02451', '02452', '02453', '02454'],
  'watertown': ['02471', '02472'],
  'arlington': ['02474', '02476'],
  'lexington': ['02420', '02421'],
  'natick': ['01760', '01761'],
  'framingham': ['01701', '01702', '01703', '01704', '01705'],
  'concord': ['01742'],
  'sudbury': ['01776'],
  'wayland': ['01778'],
  'weston': ['02493'],
  'dover': ['02030'],
  'sherborn': ['01770'],
  'medfield': ['02052'],
  'westwood': ['02090'],
  'dedham': ['02026', '02027'],
  'milton': ['02186', '02187'],
  'quincy': ['02169', '02170', '02171'],
  'braintree': ['02184', '02185'],
  'hingham': ['02043'],
  'cohasset': ['02025'],
  'scituate': ['02066'],
  'duxbury': ['02332'],
  'marshfield': ['02050'],
  'plymouth': ['02360', '02361', '02362'],
}

function getCityZips(city?: string): string[] {
  if (!city) return []
  return CITY_ZIPS[city.toLowerCase()] ?? []
}

function formatPrice(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1000) return `$${Math.round(val / 1000)}K`
  return `$${val}`
}

export function BuyerProfile({
  buyerName,
  criteria,
  onCriteriaChange,
  onBuyerNameChange,
  initialProfile,
  onBack,
  onComplete,
}: BuyerProfileProps) {
  const [profile, setProfile] = useState<BuyerProfileData>({
    financing: initialProfile?.financing ?? '',
    closing_flexibility: initialProfile?.closing_flexibility ?? '',
    condition_tolerance: initialProfile?.condition_tolerance ?? '',
    additional_notes: initialProfile?.additional_notes ?? '',
  })
  const [editingSearch, setEditingSearch] = useState(false)

  const bullets = generateBullets(profile, {
    min: criteria.price_min,
    max: criteria.price_max,
  })

  const canContinue = profile.financing !== ''

  const handleSubmit = () => {
    onComplete(profile)
  }

  const area = `${criteria.city ?? ''}${criteria.state ? `, ${criteria.state}` : ''}`
  const cityZips = getCityZips(criteria.city)
  const priceRange = criteria.price_min || criteria.price_max
    ? `${criteria.price_min ? formatPrice(criteria.price_min) : '?'}–${criteria.price_max ? formatPrice(criteria.price_max) : '?'}`
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          What should the letter say about {buyerName || 'your buyer'}?
        </h1>
        <p className="text-muted-foreground">
          Confirm search criteria, then pick what goes in the letter
        </p>
      </div>

      {/* Search criteria summary / edit */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search criteria
            </span>
            <button
              type="button"
              onClick={() => setEditingSearch(!editingSearch)}
              className="text-xs text-[#006AFF] hover:text-[#0058D4] font-medium flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              {editingSearch ? 'Done' : 'Edit'}
            </button>
          </div>

          {editingSearch ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">City</label>
                <Input
                  value={criteria.city ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, city: e.target.value || undefined })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">State</label>
                <Input
                  value={criteria.state ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, state: e.target.value || undefined })}
                  className="h-8 text-sm"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">ZIP</label>
                <Input
                  value={criteria.zip ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, zip: e.target.value || undefined })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Price min</label>
                <Input
                  type="number"
                  value={criteria.price_min ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, price_min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="400000"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Price max</label>
                <Input
                  type="number"
                  value={criteria.price_max ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, price_max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="1200000"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Beds min</label>
                <Input
                  type="number"
                  value={criteria.beds_min ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, beds_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Baths min</label>
                <Input
                  type="number"
                  value={criteria.baths_min ?? ''}
                  onChange={(e) => onCriteriaChange({ ...criteria, baths_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Location group */}
              {(area || criteria.zip || cityZips.length > 0) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</span>
                  </div>
                  {area && (
                    <p className="text-sm font-medium mb-1.5">{area}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {cityZips.map((zip) => (
                      <span key={zip} className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono">
                        {zip}
                      </span>
                    ))}
                    {criteria.zip && !cityZips.includes(criteria.zip) && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono">
                        {criteria.zip}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Price group */}
              {(criteria.price_min || criteria.price_max) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {criteria.price_min && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Low</p>
                        <p className="text-sm font-medium">{formatPrice(criteria.price_min)}</p>
                      </div>
                    )}
                    {criteria.price_min && criteria.price_max && (
                      <span className="text-muted-foreground">–</span>
                    )}
                    {criteria.price_max && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">High</p>
                        <p className="text-sm font-medium">{formatPrice(criteria.price_max)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Property details */}
              {(criteria.beds_min || criteria.baths_min) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BedDouble className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {criteria.beds_min && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                        {criteria.beds_min}+ beds
                      </span>
                    )}
                    {criteria.baths_min && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                        {criteria.baths_min}+ baths
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
