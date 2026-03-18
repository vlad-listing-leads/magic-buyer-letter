'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Filter, List, MapIcon } from 'lucide-react'
import { PropertyList } from './PropertyList'
import { PropertyMap } from './PropertyMap'
import { AudienceFiltersPanel } from './AudienceFiltersPanel'
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<AudienceFilters>(DEFAULT_FILTERS)

  // Filter properties based on current filters
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filters.cities.length > 0 && !filters.cities.includes(p.city)) return false
      if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(p.neighborhood))
        return false
      if (filters.zips.length > 0 && !filters.zips.includes(p.zip)) return false
      if (filters.value_min && (p.estimated_value ?? 0) < filters.value_min) return false
      if (filters.value_max && (p.estimated_value ?? Infinity) > filters.value_max) return false
      if (filters.sqft_min && (p.sqft ?? 0) < filters.sqft_min) return false
      if (filters.sqft_max && (p.sqft ?? Infinity) > filters.sqft_max) return false
      if (filters.beds_min && (p.bedrooms ?? 0) < filters.beds_min) return false
      if (filters.baths_min && (p.bathrooms ?? 0) < filters.baths_min) return false
      if (filters.equity_min && (p.equity_percent ?? 0) < filters.equity_min) return false
      if (filters.years_owned_min && (p.years_owned ?? 0) < filters.years_owned_min) return false
      if (
        filters.owner_types.length > 0 &&
        !filters.owner_types.includes(p.owner_type)
      )
        return false
      return true
    })
  }, [properties, filters])

  // Sendable = filtered + have address verified or status >= generated
  const sendable = filteredProperties.filter(
    (p) => p.status === 'generated' || p.status === 'verified' || p.status === 'skip_traced'
  )

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

  const handleApplyAndSelectAll = () => {
    onSelectedIdsChange(new Set(filteredProperties.map((p) => p.id)))
    setFiltersOpen(false)
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">
            {filteredProperties.length} sendable homeowners
          </h2>
          <p className="text-sm text-muted-foreground">
            {area} {priceRange && `· ${priceRange}`} · {filteredProperties.length} of{' '}
            {properties.length} shown · Addresses verified
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selection counter */}
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} of {filteredProperties.length} selected
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-[#006AFF] hover:underline"
          >
            All
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="mr-1 h-4 w-4" /> List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="mr-1 h-4 w-4" /> Map
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
          <Filter className="mr-1 h-4 w-4" />
          Filters
          {Object.values(filters).some((v) =>
            Array.isArray(v) ? v.length > 0 : v !== null
          ) && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              Active
            </Badge>
          )}
        </Button>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <PropertyList
          properties={filteredProperties}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
        />
      ) : (
        <PropertyMap
          properties={filteredProperties}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {/* Filters panel */}
      <AudienceFiltersPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        properties={properties}
        filters={filters}
        onFiltersChange={setFilters}
        matchCount={filteredProperties.length}
        onApplyAndSelectAll={handleApplyAndSelectAll}
        onReset={handleResetFilters}
      />

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to letter
        </Button>
        <Button
          onClick={onContinue}
          disabled={selectedIds.size === 0}
          className="bg-[#006AFF] hover:bg-[#0058D4] text-white px-8"
          size="lg"
        >
          Send {selectedIds.size} Letters
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
