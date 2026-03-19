'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, CreditCard, Loader2, Mail, MapPin, Truck, Clock,
  User, FileText, CheckCircle,
} from 'lucide-react'
import { useApiFetch } from '@/hooks/useApiFetch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MblCampaign, MblProperty, TemplateStyle } from '@/types'
import { LETTER_TEMPLATES } from '@/lib/templates'

const PRICE_PER_LETTER_CENTS = 112

interface ReviewAndSendProps {
  campaign: MblCampaign
  properties: MblProperty[]
  selectedCount: number
  templateStyle: TemplateStyle
  onBack: () => void
}

export function ReviewAndSend({
  campaign,
  properties,
  selectedCount,
  templateStyle,
  onBack,
}: ReviewAndSendProps) {
  const apiFetch = useApiFetch()
  const [isLoading, setIsLoading] = useState(false)

  const totalCents = selectedCount * PRICE_PER_LETTER_CENTS
  const totalDollars = (totalCents / 100).toFixed(2)
  const pricePerLetter = (PRICE_PER_LETTER_CENTS / 100).toFixed(2)
  const templateName =
    LETTER_TEMPLATES.find((t) => t.id === templateStyle)?.name ?? templateStyle
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

  const priceRange =
    campaign.criteria_price_min || campaign.criteria_price_max
      ? `${campaign.criteria_price_min ? `$${campaign.criteria_price_min.toLocaleString()}` : '?'} – ${campaign.criteria_price_max ? `$${campaign.criteria_price_max.toLocaleString()}` : '?'}`
      : 'Any price'

  const totalSearched = properties.length
  const undeliverable = properties.filter((p) => p.address_deliverable === false).length

  const sampleProp = properties.find((p) => p.personalized_content)
  const sampleOpening = sampleProp?.personalized_content?.opening

  const deliveryStart = new Date()
  deliveryStart.setDate(deliveryStart.getDate() + 5)
  const deliveryEnd = new Date()
  deliveryEnd.setDate(deliveryEnd.getDate() + 7)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const handleConfirmAndSend = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/mbl/campaigns/${campaign.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter_count: selectedCount }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      window.location.href = json.data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create checkout')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Send {selectedCount} letter{selectedCount !== 1 ? 's' : ''}
        </h1>
        <p className="text-muted-foreground">
          For {campaign.buyer_name} in {area}
        </p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Buyer</p>
              <p className="text-sm font-medium">{campaign.buyer_name}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="text-sm font-medium">{area}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="text-sm font-medium">{templateName}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Recipients</p>
              <p className="text-sm font-medium">{selectedCount} of {totalSearched}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 flex justify-between items-center">
              <span className="text-sm">Expected delivery</span>
              <span className="text-sm font-medium">{fmt(deliveryStart)}–{fmt(deliveryEnd)}</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <div className="flex-1 flex justify-between items-center">
              <span className="text-sm">Cancellation window</span>
              <span className="text-sm font-medium">4 hours</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <div className="flex-1 flex justify-between items-center">
              <span className="text-sm">Addresses verified</span>
              <span className="text-sm font-medium">
                {totalSearched - undeliverable} of {totalSearched}
              </span>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
            <span>USPS First Class</span>
            <span>Standard #10 envelope</span>
            <span>8.5×11 color print</span>
          </div>
        </CardContent>
      </Card>

      {/* Letter preview snippet */}
      {sampleOpening && (
        <Card className="bg-[#faf8f5]/5 border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Sample opening line</p>
            <p className="text-sm italic text-foreground/80 leading-relaxed">
              &ldquo;{sampleOpening}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cost + CTA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-muted-foreground">
            {selectedCount} × ${pricePerLetter}
          </span>
          <span className="text-2xl font-bold font-mono">${totalDollars}</span>
        </div>

        <Button
          onClick={handleConfirmAndSend}
          disabled={isLoading}
          className={cn(
            'w-full h-12 text-base font-semibold transition-all',
            !isLoading && 'bg-[#006AFF] text-white hover:bg-[#0058D4] shadow-lg shadow-[#006AFF]/25'
          )}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" /> Confirm &amp; Send — ${totalDollars}
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground/60 text-center">
          Lob prints + USPS delivers · Cancel within 4 hours from your dashboard
        </p>
      </div>

      {/* Back */}
      <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to audience
      </Button>
    </div>
  )
}
