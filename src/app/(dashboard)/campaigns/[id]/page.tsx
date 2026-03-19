'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LetterPreview } from '@/components/mbl/LetterPreview'
import { PropertyList } from '@/components/mbl/PropertyList'

import {
  Send, CheckCircle, DollarSign,
  ArrowLeft, Download, Trash2, Loader2, CreditCard,
  Search, MapPin,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import type { MblCampaign, MblProperty, MblAgent } from '@/types'

const PRE_SEND_STATUSES = ['searching', 'skip_tracing', 'verifying', 'generating', 'ready']

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)

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

  // Initialize selection from properties
  if (data?.properties && selectedIds === null) {
    setSelectedIds(new Set(data.properties.filter(p => p.selected).map(p => p.id)))
  }

  const toggleSelect = useCallback((propertyId: string) => {
    setSelectedIds(prev => {
      if (!prev) return prev
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

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/mbl/campaigns/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Campaign deleted')
      router.push('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setIsDeleting(false)
    }
  }

  const handleExport = () => {
    window.open(`/api/mbl/campaigns/${id}/export`, '_blank')
  }

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
        <Link href="/" className="text-sm text-muted-foreground underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const { campaign, properties } = data
  const isPreSend = PRE_SEND_STATUSES.includes(campaign.status)
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`
  const priceRange =
    campaign.criteria_price_min || campaign.criteria_price_max
      ? `${campaign.criteria_price_min ? `$${campaign.criteria_price_min.toLocaleString()}` : '?'} – ${campaign.criteria_price_max ? `$${campaign.criteria_price_max.toLocaleString()}` : '?'}`
      : ''
  const canDelete = campaign.status !== 'sent' && campaign.status !== 'sending' && campaign.status !== 'delivered'

  // Post-send metrics
  const sentCount = campaign.properties_sent
  const totalCost = (campaign.total_cost_cents / 100).toFixed(2)

  // Pre-send metrics
  const generatedCount = properties.filter(p => p.status === 'generated' || p.status === 'verified').length
  const currentSelectedCount = selectedIds?.size ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {campaign.buyer_name} · {area}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {campaign.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {priceRange && `${priceRange} · `}
            {campaign.template_style} · {formatDate(campaign.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPreSend && campaign.status === 'ready' && currentSelectedCount > 0 && (
            <Link href={`/new?step=preview&campaign_id=${id}`}>
              <Button className="bg-[#006AFF] hover:bg-[#0058D4] text-white">
                <CreditCard className="mr-1.5 h-4 w-4" />
                Continue Campaign
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 h-8 text-sm font-medium text-destructive hover:bg-accent hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this campaign and all associated properties. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* === PRE-SEND VIEW === */}
      {isPreSend ? (
        <>
          {/* Pre-send stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Properties Found</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{properties.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
                <MapPin className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generatedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
                <CheckCircle className="h-4 w-4 text-[#006AFF]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentSelectedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Est. Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(currentSelectedCount * 1.12).toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs: Properties + Letter Preview */}
          <Tabs defaultValue="properties">
            <TabsList>
              <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
              <TabsTrigger value="letter">Letter Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="properties">
              {properties.length > 0 && selectedIds ? (
                <PropertyList
                  properties={properties}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No properties found for this campaign
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="letter">
              {agent ? (
                <div className="max-w-2xl mx-auto">
                  <LetterPreview
                    agent={agent}
                    property={properties.find(p => p.personalized_content) ?? properties[0] ?? null}
                    buyerName={campaign.buyer_name}
                    bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
                    templateStyle={campaign.template_style}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Loading agent profile...
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        /* === POST-SEND VIEW === */
        <>
          {/* Post-send stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCost}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipients ({properties.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((prop) => (
                      <tr key={prop.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="p-3 font-medium">
                          {prop.owner_first_name} {prop.owner_last_name}
                        </td>
                        <td className="p-3">
                          <div>{prop.address_line1}</div>
                          <div className="text-xs text-muted-foreground">{prop.city}, {prop.state} {prop.zip}</div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {prop.estimated_value ? `$${prop.estimated_value.toLocaleString()}` : '—'}
                          {' · '}
                          {prop.bedrooms ?? '?'}bd/{prop.bathrooms ?? '?'}ba
                          {' · '}
                          {prop.sqft?.toLocaleString() ?? '?'} sqft
                          {prop.equity_percent ? ` · ${prop.equity_percent}% equity` : ''}
                          {prop.years_owned ? ` · ${prop.years_owned}yr` : ''}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {prop.owner_type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {properties.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No recipients
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
