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

/** Chip button for single-select options (years, beds, etc.) */
function OptionChip({
  label,
  selected,
  isDefault,
  onClick,
}: {
  label: string
  selected: boolean
  isDefault: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-md text-xs border transition-colors',
        selected && !isDefault && 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]',
        selected && isDefault && 'border-border bg-accent text-foreground',
        !selected && 'border-transparent text-muted-foreground hover:bg-accent',
      )}
    >
      {label}
    </button>
  )
}

/** Chip button for multi-select facets (city, zip, etc.) */
function FacetChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border',
        selected
          ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
          : 'border-border text-muted-foreground hover:bg-accent'
      )}
    >
      {label} <span className="text-[10px] opacity-60">{count}</span>
    </button>
  )
}

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

  const toggleArrayFilter = (key: 'cities' | 'neighborhoods' | 'zips', value: string) => {
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
      <SheetContent className="overflow-y-auto w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-3">
          {/* Location */}
          {(facets.cities.length > 0 || facets.zips.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</h4>

              {facets.cities.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">City</label>
                  <div className="flex flex-wrap gap-1.5">
                    {facets.cities.map(([city, count]) => (
                      <FacetChip
                        key={city}
                        label={city}
                        count={count}
                        selected={filters.cities.includes(city)}
                        onClick={() => toggleArrayFilter('cities', city)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {facets.neighborhoods.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Neighborhoods</label>
                  <div className="flex flex-wrap gap-1.5">
                    {facets.neighborhoods.map(([n, count]) => (
                      <FacetChip
                        key={n}
                        label={n}
                        count={count}
                        selected={filters.neighborhoods.includes(n)}
                        onClick={() => toggleArrayFilter('neighborhoods', n)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {facets.zips.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">ZIP codes</label>
                  <div className="flex flex-wrap gap-1.5">
                    {facets.zips.map(([z, count]) => (
                      <FacetChip
                        key={z}
                        label={z}
                        count={count}
                        selected={filters.zips.includes(z)}
                        onClick={() => toggleArrayFilter('zips', z)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Property */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property</h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Value min ($K)</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.value_min ? filters.value_min / 1000 : ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      value_min: e.target.value ? Number(e.target.value) * 1000 : null,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Value max ($K)</label>
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
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Years owned</label>
              <div className="flex gap-1">
                {YEARS_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.label}
                    label={opt.label}
                    selected={filters.years_owned_min === opt.value}
                    isDefault={opt.value === null}
                    onClick={() => onFiltersChange({ ...filters, years_owned_min: opt.value })}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Bedrooms</label>
                <div className="flex gap-1">
                  {BEDS_OPTIONS.map((opt) => (
                    <OptionChip
                      key={opt.label}
                      label={opt.label}
                      selected={filters.beds_min === opt.value}
                      isDefault={opt.value === null}
                      onClick={() => onFiltersChange({ ...filters, beds_min: opt.value })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Bathrooms</label>
                <div className="flex gap-1">
                  {BATHS_OPTIONS.map((opt) => (
                    <OptionChip
                      key={opt.label}
                      label={opt.label}
                      selected={filters.baths_min === opt.value}
                      isDefault={opt.value === null}
                      onClick={() => onFiltersChange({ ...filters, baths_min: opt.value })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Sq ft min</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.sqft_min ?? ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, sqft_min: e.target.value ? Number(e.target.value) : null })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Sq ft max</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.sqft_max ?? ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, sqft_max: e.target.value ? Number(e.target.value) : null })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Equity %</label>
              <div className="flex gap-1">
                {EQUITY_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.label}
                    label={opt.label}
                    selected={filters.equity_min === opt.value}
                    isDefault={opt.value === null}
                    onClick={() => onFiltersChange({ ...filters, equity_min: opt.value })}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Owner type */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner type</h4>
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
              Reset
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
