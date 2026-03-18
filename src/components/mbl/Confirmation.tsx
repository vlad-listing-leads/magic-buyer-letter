'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ConfirmationProps {
  sentCount: number
  campaignId: string
}

const TIMELINE_EVENTS = [
  {
    event: 'Lob receives the request',
    webhook: 'letter.created',
    timing: 'Now',
  },
  {
    event: 'PDF rendered for print',
    webhook: 'letter.rendered_pdf',
    timing: '~2 min',
  },
  {
    event: 'Picked up by USPS',
    webhook: 'letter.in_transit',
    timing: '~1 business day',
  },
  {
    event: 'Confirmed delivered',
    webhook: 'letter.delivered',
    timing: '3–5 business days',
  },
]

export function Confirmation({ sentCount, campaignId }: ConfirmationProps) {
  // Expected delivery range
  const start = new Date()
  start.setDate(start.getDate() + 5)
  const end = new Date()
  end.setDate(end.getDate() + 7)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="space-y-8 animate-fade-in max-w-lg mx-auto py-8">
      {/* Success header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">
          {sentCount} letter{sentCount !== 1 ? 's' : ''} queued with Lob
        </h2>
        <p className="text-muted-foreground">
          Expected delivery: {fmt(start)}–{fmt(end)}
        </p>
        <p className="text-sm text-amber-500">
          You can cancel any letter within 4 hours from your dashboard.
        </p>
      </div>

      {/* Tracking Timeline */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-4">Tracking Timeline</h3>
          <div className="space-y-0">
            {TIMELINE_EVENTS.map((item, i) => (
              <div key={i} className="flex gap-4 relative">
                {/* Connector line */}
                {i < TIMELINE_EVENTS.length - 1 && (
                  <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
                )}

                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 mt-1.5">
                  <div
                    className={`w-[15px] h-[15px] rounded-full border-2 ${
                      i === 0
                        ? 'bg-green-500 border-green-500'
                        : 'bg-background border-border'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <p className="text-sm font-medium">{item.event}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <code className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {item.webhook}
                    </code>
                    <span className="text-xs text-muted-foreground">{item.timing}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-11 px-8 bg-[#006AFF] text-white hover:bg-[#0058D4] transition-colors"
        >
          Back to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
