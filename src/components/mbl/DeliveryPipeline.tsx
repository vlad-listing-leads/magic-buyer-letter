'use client'

import { cn } from '@/lib/utils'
import { Printer, Truck, CheckCircle, Undo2, ArrowRight } from 'lucide-react'

interface DeliveryPipelineProps {
  printed: number
  inTransit: number
  delivered: number
  returned: number
}

const STAGES = [
  { key: 'printed', label: 'Printed', icon: Printer },
  { key: 'inTransit', label: 'In transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  { key: 'returned', label: 'Returned', icon: Undo2 },
] as const

export function DeliveryPipeline({ printed, inTransit, delivered, returned }: DeliveryPipelineProps) {
  const counts: Record<string, number> = { printed, inTransit, delivered, returned }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STAGES.map((stage, i) => {
        const count = counts[stage.key]
        const isActive = count > 0
        const isReturned = stage.key === 'returned'

        return (
          <div key={stage.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                isActive && !isReturned && 'border-[#006AFF]/30 bg-[#006AFF]/5',
                isActive && isReturned && 'border-destructive/30 bg-destructive/5',
                !isActive && 'border-border bg-background opacity-50'
              )}
            >
              <stage.icon
                className={cn(
                  'h-4 w-4',
                  isActive && !isReturned && 'text-[#006AFF]',
                  isActive && isReturned && 'text-destructive',
                  !isActive && 'text-muted-foreground'
                )}
              />
              <div className="text-center">
                <div className={cn(
                  'text-lg font-bold font-mono',
                  isActive && isReturned && 'text-destructive'
                )}>
                  {count}
                </div>
                <div className="text-[10px] text-muted-foreground">{stage.label}</div>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        )
      })}
    </div>
  )
}
