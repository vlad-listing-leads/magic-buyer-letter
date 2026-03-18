'use client'

import { useState, useCallback, use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PropertyList } from '@/components/mbl/PropertyList'
import { PropertyMap } from '@/components/mbl/PropertyMap'
import { LetterPreview } from '@/components/mbl/LetterPreview'
import { SendConfirmation } from '@/components/mbl/SendConfirmation'
import {
  Mail, Send, CheckCircle, Undo2, DollarSign, MapIcon, List, Eye, CreditCard,
  Loader2, ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import type { MblCampaign, MblProperty, MblAgent } from '@/types'

type ViewMode = 'list' | 'map' | 'preview' | 'send'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const apiFetch = useApiFetch()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewProperty, setPreviewProperty] = useState<MblProperty | null>(null)

  const { data, isLoading, error } = useQuery<{ campaign: MblCampaign; properties: MblProperty[] }>({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
  })

  const { data: agent } = useQuery<MblAgent | null>({
    queryKey: ['mbl-agent'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/agent')
      const json = await res.json()
      return json.data
    },
  })

  // Initialize selected IDs from properties that are selected in DB
  useState(() => {
    if (data?.properties) {
      setSelectedIds(new Set(data.properties.filter(p => p.selected).map(p => p.id)))
    }
  })

  const toggleSelect = useCallback((propertyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(propertyId)) next.delete(propertyId)
      else next.add(propertyId)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (data?.properties) {
      setSelectedIds(new Set(data.properties.map(p => p.id)))
    }
  }, [data?.properties])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load campaign</p>
        <Link href="/campaigns" className="text-sm text-muted-foreground underline mt-2 inline-block">
          Back to campaigns
        </Link>
      </div>
    )
  }

  const { campaign, properties } = data
  const sentCount = properties.filter(p => p.status === 'sent').length
  const deliveredCount = properties.filter(p => p.status === 'delivered').length
  const returnedCount = properties.filter(p => p.status === 'returned').length
  const totalCost = (campaign.total_cost_cents / 100).toFixed(2)

  const canSend = campaign.status === 'ready' && selectedIds.size > 0

  if (viewMode === 'send' && agent) {
    return (
      <SendConfirmation
        campaign={campaign}
        selectedCount={selectedIds.size}
        onCancel={() => setViewMode('list')}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/campaigns" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {campaign.buyer_name}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {campaign.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {campaign.criteria_city}{campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}
            {' · '}
            {campaign.template_style} tone
          </p>
        </div>

        {canSend && (
          <Button
            onClick={() => setViewMode('send')}
            className="bg-[#006AFF] hover:bg-[#0058D4] text-white"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Send {selectedIds.size} Letters
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 stagger-children">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Properties</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_properties}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCount + deliveredCount}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredCount}</div>
            {returnedCount > 0 && (
              <p className="text-xs text-destructive">{returnedCount} returned</p>
            )}
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
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
        <Button
          variant={viewMode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('preview')}
        >
          <Eye className="mr-1 h-4 w-4" /> Preview
        </Button>
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <PropertyList
          properties={properties}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
        />
      )}

      {viewMode === 'map' && (
        <PropertyMap
          properties={properties}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {viewMode === 'preview' && agent && (
        <div className="max-w-2xl mx-auto">
          {properties.length > 0 && (
            <div className="mb-4">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                onChange={e => {
                  const prop = properties.find(p => p.id === e.target.value)
                  setPreviewProperty(prop ?? null)
                }}
                value={previewProperty?.id ?? ''}
              >
                <option value="">Select a property to preview</option>
                {properties.filter(p => p.status === 'generated' || p.status === 'sent' || p.status === 'delivered').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.owner_first_name} {p.owner_last_name} — {p.address_line1}
                  </option>
                ))}
              </select>
            </div>
          )}
          <LetterPreview
            agent={agent}
            property={previewProperty}
            buyerName={campaign.buyer_name}
            bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
            templateStyle={campaign.template_style}
          />
        </div>
      )}
    </div>
  )
}
