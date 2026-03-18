'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { MblCampaign } from '@/types'

export default function CampaignsPage() {
  const apiFetch = useApiFetch()

  const { data: campaigns, isLoading } = useQuery<MblCampaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/campaigns')
      const json = await res.json()
      return json.data ?? []
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            View and manage your letter campaigns
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-[#006AFF] text-white hover:bg-[#0058D4] transition-colors"
        >
          New Letter
        </Link>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map(c => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
              <Card className="card-hover transition-colors hover:border-muted-foreground/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{c.buyer_name}</h3>
                        <Badge variant="secondary" className="capitalize text-xs flex-shrink-0">
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {c.criteria_city}{c.criteria_state ? `, ${c.criteria_state}` : ''}
                        {' · '}
                        {c.total_properties} properties
                        {c.properties_sent > 0 && ` · ${c.properties_sent} sent`}
                        {c.properties_delivered > 0 && ` · ${c.properties_delivered} delivered`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-mono text-sm font-medium">
                        ${(c.total_cost_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {c.template_style}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your letter campaigns will appear here
            </p>
            <Link
              href="/new"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 bg-[#006AFF] text-white hover:bg-[#0058D4] transition-colors"
            >
              Create New Letter
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
