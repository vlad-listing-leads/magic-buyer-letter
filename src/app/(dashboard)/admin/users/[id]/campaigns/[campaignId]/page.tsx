'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LetterPreview } from '@/components/mbl/LetterPreview'
import { ArrowLeft, Send, DollarSign, Loader2, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { MblCampaign, MblProperty, MblAgent } from '@/types'

export default function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>
}) {
  const { id, campaignId } = use(params)
  const apiFetch = useApiFetch()

  const { data, isLoading } = useQuery<{ campaign: MblCampaign; properties: MblProperty[] }>({
    queryKey: ['admin-campaign', campaignId],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/users/${id}/campaigns/${campaignId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (!data) {
    return <div className="text-center py-12 text-destructive">Campaign not found</div>
  }

  const { campaign, properties } = data
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/admin/users/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.buyer_name} · {area}</h1>
          <Badge variant="secondary" className="capitalize">{campaign.status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {campaign.template_style && `${campaign.template_style} · `}{formatDate(campaign.created_at)}
        </p>
        <Badge variant="outline" className="text-xs mt-1">Read-only admin view</Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Properties</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.properties_sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(campaign.total_cost_cents / 100).toFixed(2)}</div>
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Details</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((prop) => (
                      <tr key={prop.id} className="border-b border-border/50">
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
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs capitalize">{prop.owner_type}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs capitalize">{prop.status.replace('_', ' ')}</Badge>
                        </td>
                      </tr>
                    ))}
                    {properties.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">No properties</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="letter">
          {(() => {
            const agent = (campaign as unknown as Record<string, unknown>).mbl_agents as MblAgent | null
            const sampleProp = properties.find(p => p.personalized_content) ?? properties[0] ?? null
            if (!agent) return <Card><CardContent className="py-12 text-center text-muted-foreground">No agent profile</CardContent></Card>
            return (
              <div className="max-w-2xl mx-auto">
                <LetterPreview
                  agent={agent}
                  property={sampleProp}
                  buyerName={campaign.buyer_name}
                  bullets={{ b1: campaign.bullet_1, b2: campaign.bullet_2, b3: campaign.bullet_3 }}
                  templateStyle={campaign.template_style ?? 'warm'}
                />
              </div>
            )
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
