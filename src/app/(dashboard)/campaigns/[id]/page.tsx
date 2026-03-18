'use client'

import { use, useState } from 'react'
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
import { DeliveryPipeline } from '@/components/mbl/DeliveryPipeline'
import {
  Send, CheckCircle, Truck, Undo2, DollarSign,
  ArrowLeft, Download, Trash2, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import type { MblCampaign, MblProperty, DeliveryStatus } from '@/types'

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-gray-500',
  in_transit: 'bg-blue-500',
  in_local_area: 'bg-blue-400',
  processed_for_delivery: 'bg-blue-300',
  delivered: 'bg-green-500',
  returned: 'bg-red-500',
  re_routed: 'bg-amber-500',
  cancelled: 'bg-gray-400',
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, isLoading, error } = useQuery<{ campaign: MblCampaign; properties: MblProperty[] }>({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
  })

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
  const sentCount = campaign.properties_sent
  const deliveredCount = campaign.properties_delivered
  const returnedCount = campaign.properties_returned
  const inTransitCount = sentCount - deliveredCount - returnedCount
  const totalCost = (campaign.total_cost_cents / 100).toFixed(2)
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`
  const priceRange =
    campaign.criteria_price_min || campaign.criteria_price_max
      ? `$${campaign.criteria_price_min ? Math.round(campaign.criteria_price_min / 1000) : '?'}K–$${campaign.criteria_price_max ? Math.round(campaign.criteria_price_max / 1000) : '?'}K`
      : ''

  const canDelete = campaign.status !== 'sent' && campaign.status !== 'sending' && campaign.status !== 'delivered'

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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 stagger-children">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCount}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredCount}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(0, inTransitCount)}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Returned</CardTitle>
            <Undo2 className={cn('h-4 w-4', returnedCount > 0 ? 'text-destructive' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', returnedCount > 0 && 'text-destructive')}>
              {returnedCount}
            </div>
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

      {/* Delivery Pipeline Visual */}
      {sentCount > 0 && (
        <DeliveryPipeline
          printed={sentCount}
          inTransit={Math.max(0, inTransitCount)}
          delivered={deliveredCount}
          returned={returnedCount}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="recipients">
        <TabsList>
          <TabsTrigger value="recipients">Recipients ({properties.length})</TabsTrigger>
          <TabsTrigger value="tracking">Delivery Tracking</TabsTrigger>
          <TabsTrigger value="lob">Lob Details</TabsTrigger>
        </TabsList>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
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
                          {prop.estimated_value ? `$${(prop.estimated_value / 1000).toFixed(0)}K` : '—'}
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
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-2 w-2 rounded-full', DELIVERY_STATUS_COLORS[prop.delivery_status])} />
                            <span className="text-xs capitalize">{prop.delivery_status.replace('_', ' ')}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {properties.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No recipients
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tracking Tab */}
        <TabsContent value="tracking">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Lob ID</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Expected Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties
                      .filter((p) => p.lob_letter_id)
                      .map((prop) => (
                        <tr key={prop.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                          <td className="p-3 font-medium">
                            {prop.owner_first_name} {prop.owner_last_name}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {prop.address_line1}, {prop.city}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('h-2 w-2 rounded-full', DELIVERY_STATUS_COLORS[prop.delivery_status])} />
                              <span className="text-xs capitalize">{prop.delivery_status.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">
                              {prop.lob_letter_id}
                            </code>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {prop.expected_delivery ? formatDate(prop.expected_delivery) : '—'}
                          </td>
                        </tr>
                      ))}
                    {properties.filter((p) => p.lob_letter_id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No letters sent yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lob Details Tab */}
        <TabsContent value="lob">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-y-3 text-sm max-w-md">
                <span className="text-muted-foreground">Mail type</span>
                <span>USPS First Class</span>
                <span className="text-muted-foreground">Color</span>
                <span>true</span>
                <span className="text-muted-foreground">Double-sided</span>
                <span>false</span>
                <span className="text-muted-foreground">Address placement</span>
                <span>top_first_page</span>
                <span className="text-muted-foreground">Envelope</span>
                <span>Standard #10</span>
                <span className="text-muted-foreground">Cancel window</span>
                <span>4 hours</span>
                <span className="text-muted-foreground">Template</span>
                <span className="capitalize">{campaign.template_style}</span>
                <span className="text-muted-foreground">Total letters</span>
                <span>{sentCount}</span>
              </div>

              {/* Webhook history from delivery events */}
              {properties.some((p) => p.delivery_events.length > 0) && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Recent Webhook Events</h4>
                  <div className="space-y-1">
                    {properties
                      .flatMap((p) =>
                        p.delivery_events.map((e) => ({
                          ...e,
                          lob_id: p.lob_letter_id,
                        }))
                      )
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((event, i) => (
                        <div key={i} className="text-xs text-muted-foreground font-mono">
                          {event.type} · {event.lob_id} · {formatDate(event.date)}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
