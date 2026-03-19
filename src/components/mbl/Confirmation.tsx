'use client'

import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ConfirmationProps {
  sentCount: number
  campaignId: string
}

export function Confirmation({ sentCount }: ConfirmationProps) {
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
