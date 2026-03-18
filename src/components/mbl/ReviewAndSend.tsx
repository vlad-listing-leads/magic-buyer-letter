'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react'
import { useApiFetch } from '@/hooks/useApiFetch'
import { toast } from 'sonner'
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
      ? `$${campaign.criteria_price_min ? Math.round(campaign.criteria_price_min / 1000) : '?'}K–$${campaign.criteria_price_max ? Math.round(campaign.criteria_price_max / 1000) : '?'}K`
      : 'Any price'

  // Compute breakdown
  const totalSearched = properties.length
  const undeliverable = properties.filter((p) => p.address_deliverable === false).length
  const unverified = properties.filter(
    (p) => p.address_verified === false && p.address_deliverable !== false
  ).length

  // Sample letter opening
  const sampleProp = properties.find((p) => p.personalized_content)
  const sampleOpening = sampleProp?.personalized_content?.opening

  // Expected delivery: ~5-7 business days from now
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

      // Redirect to Stripe Checkout
      window.location.href = json.data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create checkout')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Review &amp; send {selectedCount} letters</h2>
        <p className="text-muted-foreground">
          For {campaign.buyer_name} in {area}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Campaign Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campaign Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Buyer</span>
              <span className="font-medium">{campaign.buyer_name}</span>
              <span className="text-muted-foreground">Area</span>
              <span>{area}</span>
              <span className="text-muted-foreground">Price range</span>
              <span>{priceRange}</span>
              <span className="text-muted-foreground">Template</span>
              <span>{templateName}</span>
              <span className="text-muted-foreground">Recipients</span>
              <span>{selectedCount} homeowners</span>
              <span className="text-muted-foreground">Addresses</span>
              <span>Verified via Lob</span>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recipient Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between">
                <span>{totalSearched}</span>
                <span className="text-muted-foreground font-sans">Properties searched</span>
              </div>
              {undeliverable > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>–{undeliverable}</span>
                  <span className="font-sans">Undeliverable</span>
                </div>
              )}
              {unverified > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>–{unverified}</span>
                  <span className="font-sans">Unverified</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-border pt-1">
                <span>{selectedCount}</span>
                <span className="font-sans">Selected by you</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Specs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivery Specs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Mail type</span>
              <span>USPS First Class</span>
              <span className="text-muted-foreground">Envelope</span>
              <span>Standard #10</span>
              <span className="text-muted-foreground">Paper</span>
              <span>8.5x11, color</span>
              <span className="text-muted-foreground">Address placement</span>
              <span>Top of first page</span>
              <span className="text-muted-foreground">Expected delivery</span>
              <span>
                {fmt(deliveryStart)}–{fmt(deliveryEnd)}
              </span>
              <span className="text-muted-foreground">Cancel window</span>
              <span>4 hours</span>
            </div>
          </CardContent>
        </Card>

        {/* Letter Opening Preview */}
        {sampleOpening && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Letter Opening Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic text-muted-foreground">&ldquo;{sampleOpening}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-2">
                Each letter personalizes the property address via merge variable
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cost Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selectedCount} letters × ${pricePerLetter}
                </span>
                <span className="font-mono">${totalDollars}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="font-mono text-lg">${totalDollars}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          onClick={handleConfirmAndSend}
          disabled={isLoading}
          className="w-full bg-[#006AFF] hover:bg-[#0058D4] text-white h-12 text-base"
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

        <p className="text-xs text-muted-foreground text-center">
          Lob prints + USPS delivers · You can cancel within 4 hours from your dashboard
        </p>

        {/* Back */}
        <div className="flex justify-start">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to audience
          </Button>
        </div>
      </div>
    </div>
  )
}
