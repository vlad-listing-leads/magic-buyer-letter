'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ArrowRight, Mail, Printer, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ConfirmationProps {
  sentCount: number
  campaignId: string
}

const TIMELINE_EVENTS = [
  {
    event: 'Queued with Lob',
    detail: 'letter.created',
    timing: 'Now',
    icon: Mail,
    done: true,
  },
  {
    event: 'Rendered for print',
    detail: 'letter.rendered_pdf',
    timing: '~2 min',
    icon: Printer,
    done: false,
  },
  {
    event: 'Picked up by USPS',
    detail: 'letter.in_transit',
    timing: '~1 day',
    icon: Truck,
    done: false,
  },
  {
    event: 'Delivered',
    detail: 'letter.delivered',
    timing: '3–5 days',
    icon: CheckCircle,
    done: false,
  },
]

export function Confirmation({ sentCount, campaignId }: ConfirmationProps) {
  const start = new Date()
  start.setDate(start.getDate() + 5)
  const end = new Date()
  end.setDate(end.getDate() + 7)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Success animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {sentCount} letter{sentCount !== 1 ? 's' : ''} on the way
          </h1>
          <p className="text-muted-foreground">
            Expected delivery {fmt(start)}–{fmt(end)}
          </p>
        </div>

        {/* Timeline */}
        <Card>
          <CardContent className="pt-5 pb-4">
            {TIMELINE_EVENTS.map((item, i) => (
              <div key={i} className="flex gap-3 relative">
                {/* Connector */}
                {i < TIMELINE_EVENTS.length - 1 && (
                  <div className={cn(
                    'absolute left-[11px] top-7 bottom-0 w-px',
                    item.done ? 'bg-emerald-500/30' : 'bg-border'
                  )} />
                )}

                {/* Icon */}
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  <div className={cn(
                    'w-[23px] h-[23px] rounded-full flex items-center justify-center',
                    item.done
                      ? 'bg-emerald-500/15'
                      : 'bg-muted'
                  )}>
                    <item.icon className={cn(
                      'h-3 w-3',
                      item.done ? 'text-emerald-500' : 'text-muted-foreground'
                    )} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-5 flex items-start justify-between">
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      item.done ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {item.event}
                    </p>
                    <code className="text-[10px] text-muted-foreground/60">{item.detail}</code>
                  </div>
                  <span className={cn(
                    'text-xs font-mono',
                    item.done ? 'text-emerald-500' : 'text-muted-foreground'
                  )}>
                    {item.timing}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cancel reminder */}
        <p className="text-center text-xs text-amber-500/80">
          You can cancel any letter within 4 hours from your dashboard.
        </p>

        {/* CTA */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-8 bg-[#006AFF] text-white hover:bg-[#0058D4] shadow-lg shadow-[#006AFF]/25 transition-all"
          >
            View Campaigns
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
