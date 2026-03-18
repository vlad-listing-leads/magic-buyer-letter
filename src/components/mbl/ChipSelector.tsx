'use client'

import { cn } from '@/lib/utils'

interface ChipOption {
  value: string
  label: string
}

interface ChipSelectorProps {
  label: string
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
}

export function ChipSelector({ label, options, value, onChange }: ChipSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(value === option.value ? '' : option.value)}
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === option.value
                ? 'border-[#006AFF] bg-[#006AFF]/10 text-[#006AFF]'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
