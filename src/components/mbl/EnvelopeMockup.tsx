'use client'

import type { MblAgent, MblProperty } from '@/types'

interface EnvelopeMockupProps {
  agent: MblAgent
  property: MblProperty | null
}

export function EnvelopeMockup({ agent, property }: EnvelopeMockupProps) {
  const toName = property
    ? `${property.owner_first_name ?? 'Homeowner'} ${property.owner_last_name ?? ''}`
    : 'Homeowner'
  const toAddress = property
    ? `${property.address_line1}`
    : '123 Main Street'
  const toCity = property
    ? `${property.city}, ${property.state} ${property.zip}`
    : 'Newton, MA 02458'

  return (
    <div className="relative aspect-[9.5/4.125] w-full bg-white border border-stone-200 rounded-sm shadow-sm overflow-hidden">
      {/* Envelope texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-50 to-white" />

      {/* From address - top left */}
      <div className="absolute top-[10%] left-[5%] text-[0.55rem] leading-tight text-stone-700 font-mono">
        <div className="font-semibold">{agent.name || 'Agent Name'}</div>
        <div>{agent.brokerage || 'Brokerage'}</div>
        <div>{agent.address_line1 || '100 Main St'}</div>
        <div>{agent.city || 'City'}, {agent.state || 'ST'} {agent.zip || '00000'}</div>
      </div>

      {/* Stamp - top right */}
      <div className="absolute top-[8%] right-[5%]">
        <div className="w-10 h-12 border-2 border-stone-300 rounded-sm flex flex-col items-center justify-center bg-stone-50">
          <div className="text-[0.4rem] text-stone-400 uppercase tracking-wide">USPS</div>
          <div className="text-[0.5rem] text-stone-500 font-semibold">First</div>
          <div className="text-[0.5rem] text-stone-500 font-semibold">Class</div>
        </div>
      </div>

      {/* To address - center */}
      <div className="absolute top-[45%] left-[35%] text-xs leading-relaxed text-stone-900 font-mono">
        <div className="font-semibold">{toName}</div>
        <div>{toAddress}</div>
        <div>{toCity}</div>
      </div>

      {/* Barcode - bottom */}
      <div className="absolute bottom-[8%] left-[30%] right-[15%] flex items-end gap-[1px]">
        {Array.from({ length: 52 }).map((_, i) => (
          <div
            key={i}
            className="bg-stone-800"
            style={{
              width: '1.5px',
              height: `${6 + (Math.sin(i * 1.7) * 3 + Math.cos(i * 2.3) * 2)}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
