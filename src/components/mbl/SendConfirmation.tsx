'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Mail, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { useApiFetch } from '@/hooks/useApiFetch'
import { toast } from 'sonner'
import type { MblCampaign } from '@/types'

interface SendConfirmationProps {
  campaign: MblCampaign
  selectedCount: number
  onCancel: () => void
}

const PRICE_PER_LETTER_CENTS = 112

export function SendConfirmation({ campaign, selectedCount, onCancel }: SendConfirmationProps) {
  const apiFetch = useApiFetch()
  const [isLoading, setIsLoading] = useState(false)

  const totalCents = selectedCount * PRICE_PER_LETTER_CENTS
  const totalDollars = (totalCents / 100).toFixed(2)

  const handlePayAndSend = async () => {
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
    <div className="space-y-6 max-w-lg mx-auto animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Send Letters</h2>
        <p className="text-muted-foreground">
          Review your order before payment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Letters</span>
            <span className="font-mono font-medium">{selectedCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Price per letter</span>
            <span className="font-mono">$1.12</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span className="font-mono text-lg font-bold">${totalDollars}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Estimated delivery: 5-7 business days</p>
              <p className="text-xs text-muted-foreground">USPS First Class Mail</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">4-hour cancellation window</p>
              <p className="text-xs text-muted-foreground">
                You can cancel individual letters within 4 hours of sending
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Go Back
        </Button>
        <Button
          onClick={handlePayAndSend}
          disabled={isLoading}
          className="flex-1 bg-[#006AFF] hover:bg-[#0058D4] text-white"
          size="lg"
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
          ) : (
            <><CreditCard className="mr-2 h-4 w-4" /> Pay ${totalDollars}</>
          )}
        </Button>
      </div>
    </div>
  )
}
