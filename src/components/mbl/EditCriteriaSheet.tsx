'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChipSelector } from './ChipSelector'
import { Loader2 } from 'lucide-react'
import type { MblCampaign } from '@/types'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function parseCurrency(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9]/g, '')
  return cleaned ? Number(cleaned) : undefined
}

interface EditCriteriaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: MblCampaign
  onSave: (criteria: Record<string, unknown>, reSearch: boolean) => Promise<void>
}

export function EditCriteriaSheet({ open, onOpenChange, campaign, onSave }: EditCriteriaSheetProps) {
  const [city, setCity] = useState(campaign.criteria_city ?? '')
  const [state, setState] = useState(campaign.criteria_state ?? '')
  const [zip, setZip] = useState(campaign.criteria_zip ?? '')
  const [priceMin, setPriceMin] = useState<number | undefined>(campaign.criteria_price_min ?? undefined)
  const [priceMax, setPriceMax] = useState<number | undefined>(campaign.criteria_price_max ?? undefined)
  const [bedsMin, setBedsMin] = useState<number | undefined>(campaign.criteria_beds_min ?? undefined)
  const [bathsMin, setBathsMin] = useState<number | undefined>(campaign.criteria_baths_min ?? undefined)
  const [sqftMin, setSqftMin] = useState<number | undefined>(campaign.criteria_sqft_min ?? undefined)
  const [sqftMax, setSqftMax] = useState<number | undefined>(campaign.criteria_sqft_max ?? undefined)
  const [yearsOwnedMin, setYearsOwnedMin] = useState<number | undefined>(campaign.criteria_years_owned_min ?? undefined)
  const [propertyType, setPropertyType] = useState(campaign.criteria_property_type ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const hasLocation = !!(city && state) || !!zip
  const hasPrice = !!(priceMin && priceMax)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(
        {
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          price_min: priceMin,
          price_max: priceMax,
          beds_min: bedsMin,
          baths_min: bathsMin,
          sqft_min: sqftMin,
          sqft_max: sqftMax,
          years_owned_min: yearsOwnedMin,
          property_type: propertyType || undefined,
        },
        true // always re-search when criteria change
      )
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm flex flex-col overflow-hidden px-6">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Edit Search Criteria</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-3 flex-1 overflow-y-auto">
          {/* Location */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="h-8 text-sm"
                />
              </div>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                maxLength={2}
                className="h-8 text-sm"
              />
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={priceMin ? formatCurrency(priceMin) : ''}
                onChange={(e) => setPriceMin(parseCurrency(e.target.value))}
                placeholder="Min price"
                className="h-8 text-sm"
              />
              <Input
                value={priceMax ? formatCurrency(priceMax) : ''}
                onChange={(e) => setPriceMax(parseCurrency(e.target.value))}
                placeholder="Max price"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Sqft */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size (sqft)</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={sqftMin ?? ''}
                onChange={(e) => setSqftMin(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Min"
                className="h-8 text-sm"
              />
              <Input
                type="number"
                value={sqftMax ?? ''}
                onChange={(e) => setSqftMax(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Max"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Property Type */}
          <ChipSelector
            label="Property type"
            options={[
              { value: 'SFR', label: 'Single Family' },
              { value: 'MFR', label: 'Multi-Family' },
              { value: 'CONDO', label: 'Condo' },
              { value: 'MOBILE', label: 'Mobile Home' },
              { value: 'LAND', label: 'Land' },
            ]}
            value={propertyType}
            onChange={(v) => setPropertyType(v)}
          />

          {/* Years / Beds / Baths */}
          <ChipSelector
            label="Years owned"
            options={[
              { value: 'any', label: 'Any' },
              { value: '3', label: '3+' },
              { value: '5', label: '5+' },
              { value: '10', label: '10+' },
              { value: '20', label: '20+' },
            ]}
            value={yearsOwnedMin === 0 ? 'any' : yearsOwnedMin ? String(yearsOwnedMin) : ''}
            onChange={(v) => setYearsOwnedMin(v === 'any' ? 0 : v ? Number(v) : undefined)}
          />

          <div className="grid grid-cols-2 gap-3">
            <ChipSelector
              label="Beds"
              options={[
                { value: '2', label: '2+' },
                { value: '3', label: '3+' },
                { value: '4', label: '4+' },
              ]}
              value={bedsMin ? String(bedsMin) : ''}
              onChange={(v) => setBedsMin(v ? Number(v) : undefined)}
            />
            <ChipSelector
              label="Baths"
              options={[
                { value: '1', label: '1+' },
                { value: '2', label: '2+' },
                { value: '3', label: '3+' },
              ]}
              value={bathsMin ? String(bathsMin) : ''}
              onChange={(v) => setBathsMin(v ? Number(v) : undefined)}
            />
          </div>
        </div>

        <SheetFooter className="flex-shrink-0 border-t border-border pt-3">
          <div className="w-full space-y-2">
            <p className="text-[11px] text-muted-foreground text-center">
              This will re-search properties and regenerate all content.
            </p>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasLocation || !hasPrice}
              className="w-full bg-[#006AFF] hover:bg-[#0058D4] text-white"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update &amp; Re-search
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
