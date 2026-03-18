'use client'

import { useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'
import { LETTER_TEMPLATES } from '@/lib/templates'

/** Editable content sections of the letter */
export interface LetterContent {
  opening: string
  body_1: string
  body_2: string
  bullet_intro: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  body_3: string
  body_4: string
  phone_line: string
  closing: string
  ps: string
}

interface LetterPreviewProps {
  agent: MblAgent
  property: MblProperty | null
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  onTemplateChange?: (style: TemplateStyle) => void
  editable?: boolean
  editedContent?: Partial<LetterContent>
  onContentChange?: (content: Partial<LetterContent>) => void
  className?: string
}

/** A span/div that is contentEditable when editable=true. Looks like normal text. */
function EditableField({
  value,
  field,
  onUpdate,
  editable,
  tag: Tag = 'span',
  className,
}: {
  value: string
  field: keyof LetterContent
  onUpdate: (field: keyof LetterContent, value: string) => void
  editable?: boolean
  tag?: 'span' | 'p' | 'div'
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)

  const handleBlur = useCallback(() => {
    if (ref.current) {
      const newValue = ref.current.innerText.trim()
      if (newValue !== value) {
        onUpdate(field, newValue)
      }
    }
  }, [value, field, onUpdate])

  if (!editable) {
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={cn(
        className,
        'outline-none rounded-sm px-1 -mx-1 cursor-text transition-colors',
        'hover:bg-stone-200/50',
        'focus:bg-white/80 focus:ring-1 focus:ring-[#006AFF]/40',
      )}
    >
      {value}
    </Tag>
  )
}

export function LetterPreview({
  agent,
  property,
  buyerName,
  bullets,
  templateStyle,
  onTemplateChange,
  editable = false,
  editedContent,
  onContentChange,
  className,
}: LetterPreviewProps) {
  const personalized = property?.personalized_content
  const address = property
    ? `${property.address_line1}, ${property.city}`
    : '123 Main St, Your City'
  const neighborhood = property?.neighborhood || 'the area'

  const phone = agent.phone || '(555) 123-4567'

  const opening = editedContent?.opening
    ?? personalized?.opening
    ?? `Your home at ${address} is one of the only properties that my clients, ${buyerName || 'my buyers'}, would seriously consider buying in ${neighborhood}.`

  const body1 = editedContent?.body_1
    ?? "We've looked at everything currently on the market. Nothing has been the right fit."

  const body2 = editedContent?.body_2
    ?? "I promised them I'd do everything in my power to help them find a new home. That's why I'm writing to you."

  const bulletIntro = editedContent?.bullet_intro
    ?? `Here's what's important to know about ${buyerName || 'my buyers'}:`

  const b1 = editedContent?.bullet_1 ?? personalized?.bullet_1 ?? bullets.b1 ?? 'Pre-approved and ready to buy'
  const b2 = editedContent?.bullet_2 ?? personalized?.bullet_2 ?? bullets.b2 ?? 'Flexible on closing timeline'
  const b3 = editedContent?.bullet_3 ?? personalized?.bullet_3 ?? bullets.b3 ?? 'Love the neighborhood'

  const body3 = editedContent?.body_3
    ?? 'I want to be upfront: there are no guarantees here.'

  const body4 = editedContent?.body_4
    ?? 'But if the right offer could change your plans, a short conversation is probably worth your time.'

  const phoneLine = editedContent?.phone_line
    ?? `My personal cell is ${phone}.`

  const closing = editedContent?.closing
    ?? personalized?.closing
    ?? 'I look forward to hearing from you,'

  const ps = editedContent?.ps
    ?? `If you'd also like to know what your home is realistically worth in today's market, I'm happy to put together a complimentary home value report — no cost, no obligation. Just text or call me at ${phone}.`

  const handleUpdate = useCallback((field: keyof LetterContent, value: string) => {
    onContentChange?.({ ...editedContent, [field]: value })
  }, [editedContent, onContentChange])

  const initials = agent.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Template Selector (only in non-wizard usage) */}
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
      <Card className={cn(
        'bg-[#faf8f5] text-stone-900 overflow-hidden [aspect-ratio:8.5/11]',
        editable && 'cursor-text',
      )}>
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

          <EditableField value={opening} field="opening" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />
          <EditableField value={body1} field="body_1" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />
          <EditableField value={body2} field="body_2" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />

          {/* Bullets */}
          <div>
            <EditableField value={bulletIntro} field="bullet_intro" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm font-semibold mb-2" />
            <ul className="list-disc pl-5 space-y-1 text-sm [line-height:1.2]">
              <li><EditableField value={b1} field="bullet_1" onUpdate={handleUpdate} editable={editable} /></li>
              {b2 && <li><EditableField value={b2} field="bullet_2" onUpdate={handleUpdate} editable={editable} /></li>}
              {b3 && <li><EditableField value={b3} field="bullet_3" onUpdate={handleUpdate} editable={editable} /></li>}
            </ul>
          </div>

          <EditableField value={body3} field="body_3" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />
          <EditableField value={body4} field="body_4" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />
          <EditableField value={phoneLine} field="phone_line" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />
          <EditableField value={closing} field="closing" onUpdate={handleUpdate} editable={editable} tag="p" className="text-sm [line-height:1.4]" />

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
            <strong>p.s.</strong>{' '}
            <EditableField value={ps} field="ps" onUpdate={handleUpdate} editable={editable} />
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
