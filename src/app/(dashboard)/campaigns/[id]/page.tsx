'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
import { LetterPreviewWithMap } from '@/components/mbl/LetterPreviewWithMap'
import { PropertyList } from '@/components/mbl/PropertyList'

import {
  Send, CheckCircle, DollarSign,
  ArrowLeft, Download, Trash2, Loader2, CreditCard,
  Search, MapPin, Mail, FileText, MessageSquare, Phone, Camera, Plus, X,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { sileo } from 'sileo'
import Link from 'next/link'
import { ChannelTabs } from '@/components/mbl/ChannelTabs'
import { ChannelContent } from '@/components/mbl/ChannelContent'
import { ChannelSidebar } from '@/components/mbl/ChannelSidebar'
import type { ChannelTab } from '@/components/mbl/ChannelTabs'
import type { MblCampaign, MblProperty, MblAgent, MblCampaignChannel, ChannelType } from '@/types'

const PRE_SEND_STATUSES = ['searching', 'skip_tracing', 'verifying', 'generating', 'ready']

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  const [activeChannel, setActiveChannel] = useState<ChannelTab>('letter')
  const [letterSubTab, setLetterSubTab] = useState<'properties' | 'letter'>('properties')
  const [propertyView, setPropertyView] = useState<'mail_list' | 'other'>('mail_list')

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

  const { data: channels = [] } = useQuery<MblCampaignChannel[]>({
    queryKey: ['campaign-channels', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${id}/channels`)
      const json = await res.json()
      return json.data ?? []
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

  const persistSelection = useCallback(async (propertyId: string, selected: boolean) => {
    await apiFetch(`/api/mbl/campaigns/${id}/properties/select`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, selected }),
    })
  }, [apiFetch, id])

  const addToMailList = useCallback((propertyId: string) => {
    setSelectedIds(prev => {
      if (!prev) return prev
      const next = new Set(prev)
      next.add(propertyId)
      return next
    })
    persistSelection(propertyId, true)
  }, [persistSelection])

  const removeFromMailList = useCallback((propertyId: string) => {
    setSelectedIds(prev => {
      if (!prev) return prev
      const next = new Set(prev)
      next.delete(propertyId)
      return next
    })
    persistSelection(propertyId, false)
  }, [persistSelection])

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
      sileo.success({ title: 'Campaign deleted' })
      router.push('/')
    } catch (err) {
      sileo.error({ title: err instanceof Error ? err.message : 'Failed to delete' })
      setIsDeleting(false)
    }
  }

  const handleExport = () => {
    window.open(`/api/mbl/campaigns/${id}/export`, '_blank')
  }

  const handleLetterDownload = (variant: 'map' | 'no-map') => {
    window.open(`/api/mbl/campaigns/${id}/export?include=letter&variant=${variant}`, '_blank')
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

  // Get letter content — campaign-level template (new) or fall back to first property's content (old campaigns)
  const letterContent = campaign.letter_templates
    ? Object.values(campaign.letter_templates)[0] ?? null
    : null
  const fallbackProperty = !letterContent
    ? properties.find(p => p.personalized_content) ?? null
    : null


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
          {campaign.status !== 'cancelled' && campaign.status !== 'delivered' && (
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-sm font-medium hover:bg-accent transition-colors">
                <CheckCircle className="h-4 w-4" />
                Complete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete this buyer campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Did you find a seller for {campaign.buyer_name}? Completing this campaign will mark it as done.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Not yet</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await apiFetch(`/api/mbl/campaigns/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'delivered' }),
                      })
                      window.location.reload()
                    }}
                    className="bg-[#006AFF] hover:bg-[#0058D4] text-white"
                  >
                    Yes, found a seller!
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
        <div className="flex gap-6">
          {/* Sidebar Nav */}
          <nav className="w-48 shrink-0 space-y-1">
            {([
              { id: 'letter' as const, label: 'Letter', icon: Mail },
              { id: 'email' as const, label: 'Email', icon: FileText },
              { id: 'text' as const, label: 'Text', icon: MessageSquare },
              { id: 'call_script' as const, label: 'Call Script', icon: Phone },
              { id: 'social_post' as const, label: 'Social Post', icon: Camera, comingSoon: true },
            ]).map((item) => {
              const Icon = item.icon
              const isActive = activeChannel === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => !item.comingSoon && setActiveChannel(item.id)}
                  disabled={item.comingSoon}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    item.comingSoon && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  {item.comingSoon && (
                    <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">Soon</Badge>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Letter — stat cards + properties + letter preview */}
            {activeChannel === 'letter' && (
              <div className="space-y-6">
                {/* Sub-tabs: Properties | Letter */}
                <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
                  <button
                    onClick={() => setLetterSubTab('properties')}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      letterSubTab === 'properties'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Properties ({properties.length})
                  </button>
                  <button
                    onClick={() => setLetterSubTab('letter')}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      letterSubTab === 'letter'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Letter
                  </button>
                </div>

                {/* Properties tab — single card: tabs header + table body */}
                {letterSubTab === 'properties' && (
                  <Card>
                    {/* Card header: tabs + inline stats */}
                    <div className="flex items-center gap-5 border-b border-border px-4">
                      <button
                        onClick={() => setPropertyView('mail_list')}
                        className={cn(
                          'px-2 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                          propertyView === 'mail_list'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        Mail List ({currentSelectedCount})
                      </button>
                      <button
                        onClick={() => setPropertyView('other')}
                        className={cn(
                          'px-2 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                          propertyView === 'other'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        Verified Properties ({properties.length - currentSelectedCount})
                      </button>

                      <div className="ml-auto flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Search className="h-3 w-3" />
                          <span>Found <span className="font-semibold text-foreground">{properties.length}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3 text-emerald-500" />
                          <span>Verified <span className="font-semibold text-foreground">{generatedCount}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-[#006AFF]" />
                          <span>Selected <span className="font-semibold text-foreground">{currentSelectedCount}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Card body: table content */}
                    <CardContent className="p-0">
                      {/* Mail List */}
                      {propertyView === 'mail_list' && (
                        selectedIds && currentSelectedCount > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                                  <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                                  <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
                                  <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                                  <th className="p-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {properties.filter(p => selectedIds.has(p.id)).map((prop) => (
                                  <tr key={prop.id} className="border-b border-border/50 last:border-b-0 hover:bg-accent/50 transition-colors">
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
                                      {prop.sqft ? ` · ${prop.sqft.toLocaleString()} sqft` : ''}
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="secondary" className="text-xs capitalize">
                                        {prop.owner_type}
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeFromMailList(prop.id)}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-muted-foreground">
                            No properties in mail list. Add from the &quot;Verified Properties&quot; tab.
                          </div>
                        )
                      )}

                      {/* Verified Properties */}
                      {propertyView === 'other' && (
                        (() => {
                          const otherProps = selectedIds ? properties.filter(p => !selectedIds.has(p.id)) : properties
                          return otherProps.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                                    <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                                    <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
                                    <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                                    <th className="p-3 w-28"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {otherProps.map((prop) => (
                                    <tr key={prop.id} className="border-b border-border/50 last:border-b-0 hover:bg-accent/50 transition-colors">
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
                                        {prop.sqft ? ` · ${prop.sqft.toLocaleString()} sqft` : ''}
                                      </td>
                                      <td className="p-3">
                                        <Badge variant="secondary" className="text-xs capitalize">
                                          {prop.owner_type}
                                        </Badge>
                                      </td>
                                      <td className="p-3">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs h-7"
                                          onClick={() => addToMailList(prop.id)}
                                        >
                                          <Plus className="mr-1 h-3 w-3" />
                                          Add
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-12 text-center text-muted-foreground">
                              All properties are in the mail list.
                            </div>
                          )
                        })()
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Letter — both designs side by side */}
                {letterSubTab === 'letter' && (
                  agent ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Map</p>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleLetterDownload('map')}>
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                        </div>
                        <LetterPreviewWithMap
                          agent={agent}
                          letterContent={letterContent}
                          property={fallbackProperty}
                          allProperties={properties}
                          buyerName={campaign.buyer_name}
                          bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
                          templateStyle={campaign.template_style}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Without Map</p>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleLetterDownload('no-map')}>
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                        </div>
                        <LetterPreview
                          agent={agent}
                          letterContent={letterContent}
                          property={fallbackProperty}
                          buyerName={campaign.buyer_name}
                          bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
                          templateStyle={campaign.template_style}
                        />
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        Loading agent profile...
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            )}

            {/* Email */}
            {activeChannel === 'email' && (
              <ChannelContent
                campaignId={id}
                channel="email"
                channelData={channels.find((c) => c.channel === 'email')}
              />
            )}

            {/* Text */}
            {activeChannel === 'text' && (
              <ChannelContent
                campaignId={id}
                channel="text"
                channelData={channels.find((c) => c.channel === 'text')}
              />
            )}

            {/* Call Script */}
            {activeChannel === 'call_script' && (
              <ChannelContent
                campaignId={id}
                channel="call_script"
                channelData={channels.find((c) => c.channel === 'call_script')}
              />
            )}

            {/* Social Post */}
            {activeChannel === 'social_post' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-semibold">Social Post</p>
                <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* === POST-SEND VIEW: Magic 5 === */
        <>
          {/* Magic 5 Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Your Magic 5 for {campaign.buyer_name}</h2>
            <p className="text-sm text-muted-foreground">5 touchpoints, one buyer story. Copy any channel and go.</p>
          </div>

          {/* Channel Tabs */}
          <ChannelTabs
            activeTab={activeChannel}
            onTabChange={setActiveChannel}
            letterSent={campaign.status === 'sent' || campaign.status === 'delivered'}
            channels={channels}
          />

          {/* Content + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Main Content */}
            <div>
              {/* Letter tab — existing recipients view */}
              {activeChannel === 'letter' && (
                <>
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

              {/* Email / Text / Call Script tabs */}
              {(activeChannel === 'email' || activeChannel === 'text' || activeChannel === 'call_script') && (
                <ChannelContent
                  campaignId={id}
                  channel={activeChannel as ChannelType}
                  channelData={channels.find((c) => c.channel === activeChannel)}
                />
              )}

              {/* Social post — coming soon */}
              {activeChannel === 'social_post' && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-semibold">Social Post</p>
                  <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <ChannelSidebar
                campaign={campaign}
                channels={channels}
                letterSent={campaign.status === 'sent' || campaign.status === 'delivered'}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
