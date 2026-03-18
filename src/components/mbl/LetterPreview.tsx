'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'
import { LETTER_TEMPLATES } from '@/lib/templates'

interface LetterPreviewProps {
  agent: MblAgent
  property: MblProperty | null
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  onTemplateChange?: (style: TemplateStyle) => void
  className?: string
}

export function LetterPreview({
  agent,
  property,
  buyerName,
  bullets,
  templateStyle,
  onTemplateChange,
  className,
}: LetterPreviewProps) {
  const personalized = property?.personalized_content
  const ownerName = property
    ? `${property.owner_first_name ?? 'Homeowner'} ${property.owner_last_name ?? ''}`
    : 'Homeowner'
  const address = property
    ? `${property.address_line1}, ${property.city}`
    : '123 Main St, Your City'
  const neighborhood = property?.neighborhood || 'the area'

  const b1 = personalized?.bullet_1 || bullets.b1 || 'Pre-approved and ready to buy'
  const b2 = personalized?.bullet_2 || bullets.b2 || 'Flexible on closing timeline'
  const b3 = personalized?.bullet_3 || bullets.b3 || 'Love the neighborhood'

  const initials = agent.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Template Selector */}
      {onTemplateChange && (
        <div className="flex gap-2">
          {LETTER_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => onTemplateChange(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                templateStyle === t.id
                  ? 'bg-[#006AFF] text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Letter Card */}
      <Card className="bg-[#faf8f5] text-stone-900 overflow-hidden">
        <CardContent className="p-8 space-y-4">
          {/* Hills illustration */}
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 500 80" xmlns="http://www.w3.org/2000/svg" className="w-48 h-12">
              <rect width="500" height="80" fill="#87CEEB" rx="6"/>
              <ellipse cx="75" cy="80" rx="120" ry="35" fill="#5B8C3E"/>
              <ellipse cx="250" cy="80" rx="140" ry="45" fill="#4A7A2E"/>
              <ellipse cx="425" cy="80" rx="120" ry="30" fill="#6B9E4A"/>
              <circle cx="100" cy="42" r="12" fill="#3A6A1E"/>
              <rect x="99" y="42" width="2" height="14" fill="#5A4030"/>
              <circle cx="375" cy="48" r="10" fill="#3A6A1E"/>
              <rect x="374" y="48" width="2" height="12" fill="#5A4030"/>
            </svg>
          </div>

          {/* Opening */}
          <p className="text-sm leading-relaxed">
            {personalized?.opening || (
              <>Your home at <strong>{address}</strong> is one of the only properties that my clients, {buyerName || 'my buyers'}, would seriously consider buying in {neighborhood}.</>
            )}
          </p>

          <p className="text-sm leading-relaxed">
            We&apos;ve looked at everything currently on the market. Nothing has been the right fit.
          </p>

          <p className="text-sm leading-relaxed">
            I promised them I&apos;d do everything in my power to help them find a new home. That&apos;s why I&apos;m writing to you.
          </p>

          {/* Bullets */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Here&apos;s what&apos;s important to know about {buyerName || 'my buyers'}:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{b1}</li>
              {b2 && <li>{b2}</li>}
              {b3 && <li>{b3}</li>}
            </ul>
          </div>

          <p className="text-sm leading-relaxed">
            I want to be upfront: there are no guarantees here.
          </p>

          <p className="text-sm leading-relaxed">
            But if the right offer could change your plans, a short conversation is probably worth your time.
          </p>

          <p className="text-sm leading-relaxed">
            My personal cell is <strong>{agent.phone || '(555) 123-4567'}</strong>.
          </p>

          <p className="text-sm leading-relaxed">
            {personalized?.closing || 'I look forward to hearing from you,'}
          </p>

          {/* Signature block */}
          <div className="flex items-center gap-3 p-3 bg-stone-200/60 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-stone-800 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 text-xs leading-relaxed">
              <div className="font-bold">{agent.name || 'Agent Name'}</div>
              <div className="text-stone-600">{agent.brokerage}</div>
              <div className="text-stone-600">{agent.phone}</div>
              {agent.website && <div className="text-stone-500 text-[10px]">{agent.website}</div>}
            </div>
          </div>

          {/* P.S. */}
          <p className="text-xs text-stone-600 mt-4">
            <strong>p.s.</strong> If you&apos;d also like to know what your home is realistically worth in today&apos;s market, I&apos;m happy to put together a complimentary home value report — no cost, no obligation. Just text or call me at {agent.phone || '(555) 123-4567'}.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
