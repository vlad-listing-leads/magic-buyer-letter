'use client'

import { useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { MblProperty, AudienceFilters, OwnerType } from '@/types'
import { cn } from '@/lib/utils'

interface AudienceFiltersPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: MblProperty[]
  filters: AudienceFilters
  onFiltersChange: (filters: AudienceFilters) => void
  matchCount: number
  onApplyAndSelectAll: () => void
  onReset: () => void
}

const YEARS_OPTIONS = [
  { label: 'Any', value: null },
  { label: '3+', value: 3 },
  { label: '5+', value: 5 },
  { label: '10+', value: 10 },
  { label: '20+', value: 20 },
]

const BEDS_OPTIONS = [
  { label: 'Any', value: null },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
]

const BATHS_OPTIONS = [
  { label: 'Any', value: null },
  { label: '1+', value: 1 },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
]

const EQUITY_OPTIONS = [
  { label: 'Any', value: null },
  { label: '20%+', value: 20 },
  { label: '40%+', value: 40 },
  { label: '60%+', value: 60 },
]

const OWNER_TYPES: { value: OwnerType; label: string }[] = [
  { value: 'absentee', label: 'Absentee' },
  { value: 'owner', label: 'Owner-occupied' },
  { value: 'investor', label: 'Investors' },
]

export function AudienceFiltersPanel({
  open,
  onOpenChange,
  properties,
  filters,
  onFiltersChange,
  matchCount,
  onApplyAndSelectAll,
  onReset,
}: AudienceFiltersPanelProps) {
  // Compute available facets from properties
  const facets = useMemo(() => {
    const cities = new Map<string, number>()
    const neighborhoods = new Map<string, number>()
    const zips = new Map<string, number>()

    for (const p of properties) {
      if (p.city) cities.set(p.city, (cities.get(p.city) ?? 0) + 1)
      if (p.neighborhood) neighborhoods.set(p.neighborhood, (neighborhoods.get(p.neighborhood) ?? 0) + 1)
      if (p.zip) zips.set(p.zip, (zips.get(p.zip) ?? 0) + 1)
    }

    return {
      cities: Array.from(cities.entries()).sort((a, b) => b[1] - a[1]),
      neighborhoods: Array.from(neighborhoods.entries()).sort((a, b) => b[1] - a[1]),
      zips: Array.from(zips.entries()).sort((a, b) => b[1] - a[1]),
    }
  }, [properties])

  const toggleArrayFilter = (
    key: 'cities' | 'neighborhoods' | 'zips',
    value: string
  ) => {
    const current = filters[key]
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onFiltersChange({ ...filters, [key]: next })
  }

  const toggleOwnerType = (type: OwnerType) => {
    const current = filters.owner_types
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    onFiltersChange({ ...filters, owner_types: next })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Location */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Location</h4>

            {/* Cities */}
            {facets.cities.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">City</label>
                <div className="flex flex-wrap gap-1.5">
                  {facets.cities.map(([city, count]) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleArrayFilter('cities', city)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border',
                        filters.cities.includes(city)
                          ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {city} <span className="text-[10px] opacity-60">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhoods */}
            {facets.neighborhoods.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Neighborhoods</label>
                <div className="flex flex-wrap gap-1.5">
                  {facets.neighborhoods.map(([n, count]) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleArrayFilter('neighborhoods', n)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border',
                        filters.neighborhoods.includes(n)
                          ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {n} <span className="text-[10px] opacity-60">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ZIPs */}
            {facets.zips.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">ZIP codes</label>
                <div className="flex flex-wrap gap-1.5">
                  {facets.zips.map(([z, count]) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleArrayFilter('zips', z)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border',
                        filters.zips.includes(z)
                          ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {z} <span className="text-[10px] opacity-60">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Property */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Property</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Est. value min ($K)</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.value_min ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      value_min: e.target.value ? Number(e.target.value) * 1000 : null,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Est. value max ($K)</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.value_max ? filters.value_max / 1000 : ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      value_max: e.target.value ? Number(e.target.value) * 1000 : null,
                    })
                  }
                />
              </div>
            </div>

            {/* Years owned */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Years owned</label>
              <div className="flex gap-1.5">
                {YEARS_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, years_owned_min: opt.value })}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs border transition-colors',
                      filters.years_owned_min === opt.value
                        ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Beds */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bedrooms</label>
              <div className="flex gap-1.5">
                {BEDS_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, beds_min: opt.value })}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs border transition-colors',
                      filters.beds_min === opt.value
                        ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Baths */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bathrooms</label>
              <div className="flex gap-1.5">
                {BATHS_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, baths_min: opt.value })}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs border transition-colors',
                      filters.baths_min === opt.value
                        ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sqft */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Sq ft min</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.sqft_min ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      sqft_min: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Sq ft max</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.sqft_max ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      sqft_max: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            {/* Equity */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Equity %</label>
              <div className="flex gap-1.5">
                {EQUITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, equity_min: opt.value })}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs border transition-colors',
                      filters.equity_min === opt.value
                        ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Owner type */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Owner type</h4>
            {OWNER_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={`owner-${type.value}`}
                  checked={filters.owner_types.includes(type.value)}
                  onCheckedChange={() => toggleOwnerType(type.value)}
                />
                <label htmlFor={`owner-${type.value}`} className="text-sm">
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex items-center justify-between w-full">
            <Badge variant="secondary" className="text-xs">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </Badge>
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Reset to defaults
            </button>
          </div>
          <Button
            onClick={onApplyAndSelectAll}
            className="w-full bg-[#006AFF] hover:bg-[#0058D4] text-white"
          >
            Apply &amp; select all
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
