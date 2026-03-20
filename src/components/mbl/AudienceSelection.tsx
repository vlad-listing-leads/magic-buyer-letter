'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ArrowRight, Sparkles, Filter, Home, MapPin } from 'lucide-react'
import { PropertyMap } from './PropertyMap'
import { AudienceFiltersPanel } from './AudienceFiltersPanel'
import { cn } from '@/lib/utils'
import type { MblProperty, AudienceFilters } from '@/types'

const DEFAULT_FILTERS: AudienceFilters = {
  cities: [],
  neighborhoods: [],
  zips: [],
  value_min: null,
  value_max: null,
  sqft_min: null,
  sqft_max: null,
  beds_min: null,
  baths_min: null,
  equity_min: null,
  years_owned_min: null,
  owner_types: [],
}

interface AudienceSelectionProps {
  properties: MblProperty[]
  selectedIds: Set<string>
  onSelectedIdsChange: (ids: Set<string>) => void
  area: string
  priceRange: string
  onBack: () => void
  onContinue: () => void
}

export function AudienceSelection({
  properties,
  selectedIds,
  onSelectedIdsChange,
  area,
  priceRange,
  onBack,
  onContinue,
}: AudienceSelectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<AudienceFilters>(DEFAULT_FILTERS)
  const [polygonFilterIds, setPolygonFilterIds] = useState<Set<string> | null>(null)

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Polygon draw filter — only show properties inside the drawn area
      if (polygonFilterIds && !polygonFilterIds.has(p.id)) return false
      if (filters.cities.length > 0 && !filters.cities.includes(p.city)) return false
      if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(p.neighborhood)) return false
      if (filters.zips.length > 0 && !filters.zips.includes(p.zip)) return false
      if (filters.value_min && (p.estimated_value ?? 0) < filters.value_min) return false
      if (filters.value_max && (p.estimated_value ?? Infinity) > filters.value_max) return false
      if (filters.sqft_min && (p.sqft ?? 0) < filters.sqft_min) return false
      if (filters.sqft_max && (p.sqft ?? Infinity) > filters.sqft_max) return false
      if (filters.beds_min && (p.bedrooms ?? 0) < filters.beds_min) return false
      if (filters.baths_min && (p.bathrooms ?? 0) < filters.baths_min) return false
      if (filters.equity_min && (p.equity_percent ?? 0) < filters.equity_min) return false
      if (filters.years_owned_min && (p.years_owned ?? 0) < filters.years_owned_min) return false
      if (filters.owner_types.length > 0 && !filters.owner_types.includes(p.owner_type)) return false
      return true
    })
  }, [properties, filters, polygonFilterIds])

  const toggleSelect = useCallback(
    (id: string) => {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onSelectedIdsChange(next)
    },
    [selectedIds, onSelectedIdsChange]
  )

  const selectAll = useCallback(() => {
    onSelectedIdsChange(new Set(filteredProperties.map((p) => p.id)))
  }, [filteredProperties, onSelectedIdsChange])

  const deselectAll = useCallback(() => {
    onSelectedIdsChange(new Set())
  }, [onSelectedIdsChange])

  const selectMany = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      onSelectedIdsChange(idSet)
      setPolygonFilterIds(idSet)
    },
    [onSelectedIdsChange]
  )

  const clearPolygonFilter = useCallback(() => {
    setPolygonFilterIds(null)
  }, [])

  const allSelected = filteredProperties.length > 0 && filteredProperties.every(p => selectedIds.has(p.id))
  const hasActiveFilters = Object.values(filters).some((v) => Array.isArray(v) ? v.length > 0 : v !== null)

  return (
    <div className="animate-fade-in flex flex-col flex-1 min-h-0">

      {/* ── Panels row ── */}
      <div className="flex-1 flex min-h-0">

      {/* ── Left panel: list ── */}
      <div className="flex-1 flex flex-col border-r border-border">

        {/* List header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight">{area}</h2>
              <p className="text-xs text-muted-foreground">
                {filteredProperties.length} properties{priceRange && ` · ${priceRange}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                selectedIds.size > 0 ? 'bg-[#006AFF]/10 text-[#006AFF]' : 'bg-muted text-muted-foreground'
              )}>
                <Home className="h-3 w-3" />
                {selectedIds.size}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className={cn(
                  'flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors',
                  hasActiveFilters ? 'bg-[#006AFF]/10 text-[#006AFF]' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <Filter className="h-3 w-3" />
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#006AFF]" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={allSelected ? deselectAll : selectAll} className="text-[11px] text-[#006AFF] hover:underline font-medium">
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {polygonFilterIds && (
              <button onClick={clearPolygonFilter} className="text-[11px] text-amber-500 hover:underline font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Area filter active · Show all
              </button>
            )}
          </div>
        </div>

        {/* Scrollable property cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredProperties.map((prop) => {
            const isSelected = selectedIds.has(prop.id)
            return (
              <div
                key={prop.id}
                onClick={() => toggleSelect(prop.id)}
                className={cn(
                  'flex items-start gap-3 p-3 cursor-pointer transition-all rounded-lg border',
                  isSelected
                    ? 'border-[#006AFF]/40 bg-[#006AFF]/[0.06]'
                    : 'border-[#333] bg-card hover:border-[#444] hover:bg-accent/30'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(prop.id)}
                  className="flex-shrink-0 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">{prop.address_line1}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {prop.city}, {prop.state} {prop.zip}
                      </p>
                    </div>
                    {prop.estimated_value && (
                      <p className="text-sm font-mono font-semibold tabular-nums flex-shrink-0">
                        ${prop.estimated_value.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                    {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                    {prop.sqft && <span>{prop.sqft.toLocaleString()} sqft</span>}
                    {prop.years_owned && <span>{prop.years_owned}yr owned</span>}
                    {prop.equity_percent && <span>{prop.equity_percent}% equity</span>}
                    {prop.owner_type !== 'owner' && (
                      <span className="text-amber-500 capitalize">{prop.owner_type}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filteredProperties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Filter className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No matches</p>
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-[#006AFF] hover:underline mt-1">Reset filters</button>
            </div>
          )}
        </div>

      </div>

      {/* ── Right panel: map (35% width) ── */}
      <div className="w-[40%] flex-shrink-0 min-h-0">
        <PropertyMap
          properties={filteredProperties}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectMany={selectMany}
        />
      </div>

      </div>{/* end panels row */}

      {/* ── Footer ── */}
      <div className="flex-shrink-0 h-14 border-t border-border bg-background flex items-center">
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={selectedIds.size === 0}
          className={cn(
            'gap-1.5 font-semibold text-sm',
            selectedIds.size > 0 ? 'bg-[#006AFF] text-white hover:bg-[#0058D4] shadow-lg shadow-[#006AFF]/20' : 'bg-muted text-muted-foreground'
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate {selectedIds.size} Letters
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        </div>
      </div>

      {/* Filters panel */}
      <AudienceFiltersPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        properties={properties}
        filters={filters}
        onFiltersChange={setFilters}
        matchCount={filteredProperties.length}
        onApplyAndSelectAll={() => { selectAll(); setFiltersOpen(false) }}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
    </div>
  )
}
