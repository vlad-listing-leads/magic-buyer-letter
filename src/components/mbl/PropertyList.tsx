'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, ArrowUpDown, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MblProperty, PropertyStatus, OwnerType } from '@/types'

interface PropertyListProps {
  properties: MblProperty[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

type SortKey = 'estimated_value' | 'bedrooms' | 'sqft' | 'equity_percent' | 'years_owned'

const STATUS_COLORS: Record<PropertyStatus, string> = {
  found: 'bg-gray-500',
  skip_traced: 'bg-blue-500',
  verified: 'bg-green-500',
  generated: 'bg-purple-500',
  sent: 'bg-amber-500',
  delivered: 'bg-green-600',
  returned: 'bg-red-500',
  send_failed: 'bg-red-600',
  cancelled: 'bg-gray-400',
}

const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  owner: 'Owner-Occupied',
  absentee: 'Absentee',
  investor: 'Investor',
  corporate: 'Corporate',
  unknown: 'Unknown',
}

export function PropertyList({
  properties,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: PropertyListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('estimated_value')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')
  const [filterOwnerType, setFilterOwnerType] = useState<OwnerType | 'all'>('all')

  const filtered = useMemo(() => {
    let result = [...properties]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.address_line1.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        `${p.owner_first_name} ${p.owner_last_name}`.toLowerCase().includes(q)
      )
    }

    if (filterOwnerType !== 'all') {
      result = result.filter(p => p.owner_type === filterOwnerType)
    }

    result.sort((a, b) => {
      const aVal = (a[sortKey] as number | null) ?? 0
      const bVal = (b[sortKey] as number | null) ?? 0
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })

    return result
  }, [properties, search, filterOwnerType, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Properties ({filtered.length})
            {selectedIds.size > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {selectedIds.size} selected
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={allSelected ? onDeselectAll : onSelectAll}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterOwnerType}
            onChange={e => setFilterOwnerType(e.target.value as OwnerType | 'all')}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="all">All Types</option>
            <option value="owner">Owner-Occupied</option>
            <option value="absentee">Absentee</option>
            <option value="investor">Investor</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={allSelected ? onDeselectAll : onSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">Owner / Address</th>
                <th className="p-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('estimated_value')}>
                  <span className="flex items-center gap-1">Value <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('bedrooms')}>
                  <span className="flex items-center gap-1">Beds <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('sqft')}>
                  <span className="flex items-center gap-1">Sqft <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('equity_percent')}>
                  <span className="flex items-center gap-1">Equity <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('years_owned')}>
                  <span className="flex items-center gap-1">Yrs Owned <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(prop => (
                <tr
                  key={prop.id}
                  className={cn(
                    'border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer',
                    selectedIds.has(prop.id) && 'bg-[#006AFF]/5'
                  )}
                  onClick={() => onToggleSelect(prop.id)}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(prop.id)}
                      onChange={() => onToggleSelect(prop.id)}
                      className="rounded"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">
                      {prop.owner_first_name} {prop.owner_last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {prop.address_line1}, {prop.city}, {prop.state}
                    </div>
                  </td>
                  <td className="p-3 font-mono">
                    {prop.estimated_value ? `$${prop.estimated_value.toLocaleString()}` : '—'}
                  </td>
                  <td className="p-3">{prop.bedrooms ?? '—'}</td>
                  <td className="p-3 font-mono">{prop.sqft?.toLocaleString() ?? '—'}</td>
                  <td className="p-3 font-mono">{prop.equity_percent ? `${prop.equity_percent}%` : '—'}</td>
                  <td className="p-3 font-mono">{prop.years_owned ?? '—'}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs">
                      {OWNER_TYPE_LABELS[prop.owner_type]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[prop.status])} />
                      <span className="text-xs capitalize">{prop.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No properties match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
