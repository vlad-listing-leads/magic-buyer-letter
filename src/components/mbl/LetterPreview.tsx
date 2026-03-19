'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
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

  // Toggle: highlight listing-specific content in the letter
  const [showListingHighlight, setShowListingHighlight] = useState(false)

  // Auto-scale: shrink font/spacing when content overflows
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const card = cardRef.current
    const content = contentRef.current
    if (!card || !content) return

    const check = () => {
      const cardH = card.clientHeight
      const contentH = content.scrollHeight
      if (contentH > cardH && scale > 0.75) {
        setScale(Math.max(0.75, cardH / contentH))
      } else if (contentH <= cardH * 0.95 && scale < 1) {
        setScale(Math.min(1, cardH / contentH))
      }
    }

    check()
    const observer = new ResizeObserver(check)
    observer.observe(content)
    return () => observer.disconnect()
  })

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

      {/* Personalization toggle + address label */}
      {property && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Preview for <span className="font-medium text-foreground">{address}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowListingHighlight(!showListingHighlight)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors text-xs font-medium',
              showListingHighlight
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <div className={cn(
              'w-3 h-3 rounded-sm border transition-colors flex items-center justify-center',
              showListingHighlight ? 'bg-amber-500 border-amber-500' : 'border-muted-foreground'
            )}>
              {showListingHighlight && <span className="text-white text-[8px]">✓</span>}
            </div>
            Show listing details
          </button>
        </div>
      )}

      {/* Letter Card */}
      <Card className={cn(
        'bg-[#faf9f7] text-[#1a1a1a] overflow-hidden [aspect-ratio:8.5/11] rounded-lg',
        editable && 'cursor-text',
      )} style={{ fontFamily: "Arial, Helvetica, sans-serif" }} ref={cardRef}>
        <CardContent className="px-12 pb-10 pt-0" ref={contentRef} style={{ fontSize: `${Math.round(15 * scale)}px`, lineHeight: scale < 1 ? 1.35 : 1.5 }}>
          {/* Letterhead */}
          <div className="flex justify-center pt-10 pb-4">
            {agent.logo_url ? (
              <img src={agent.logo_url} alt={agent.name} className="h-14 max-w-[220px] object-contain" />
            ) : (
              <div className="h-14 flex items-center text-xl font-bold text-[#2d2d2d] tracking-tight">
                {agent.brokerage || agent.name}
              </div>
            )}
          </div>

          {/* Letter body */}
          <div className="space-y-[0.8em]" style={{ fontSize: '15px', lineHeight: '1.5' }}>
            {showListingHighlight && property ? (
              <p dangerouslySetInnerHTML={{
                __html: opening
                  .replace(address, `<mark style="background:#fef3c7;padding:1px 3px;border-radius:3px">${address}</mark>`)
                  .replace(neighborhood, `<mark style="background:#fef3c7;padding:1px 3px;border-radius:3px">${neighborhood}</mark>`)
              }} />
            ) : (
              <EditableField value={opening} field="opening" onUpdate={handleUpdate} editable={editable} tag="p" />
            )}
            <EditableField value={body1} field="body_1" onUpdate={handleUpdate} editable={editable} tag="p" />
            <EditableField value={body2} field="body_2" onUpdate={handleUpdate} editable={editable} tag="p" />

            <div>
              <EditableField value={bulletIntro} field="bullet_intro" onUpdate={handleUpdate} editable={editable} tag="p" className="font-bold mb-[0.3em]" />
              <ul className="list-disc pl-6 space-y-[0.3em]" style={{ lineHeight: '1.35' }}>
                <li><EditableField value={b1} field="bullet_1" onUpdate={handleUpdate} editable={editable} /></li>
                {b2 && <li><EditableField value={b2} field="bullet_2" onUpdate={handleUpdate} editable={editable} /></li>}
                {b3 && <li><EditableField value={b3} field="bullet_3" onUpdate={handleUpdate} editable={editable} /></li>}
              </ul>
            </div>

            <EditableField value={body3} field="body_3" onUpdate={handleUpdate} editable={editable} tag="p" />
            <EditableField value={body4} field="body_4" onUpdate={handleUpdate} editable={editable} tag="p" />
            <EditableField value={phoneLine} field="phone_line" onUpdate={handleUpdate} editable={editable} tag="p" />
            <EditableField value={closing} field="closing" onUpdate={handleUpdate} editable={editable} tag="p" />
          </div>

          {/* Signature block — non-editable */}
          <div className="mt-8 select-none">
            <div className="h-8" />
            <div className="flex items-start gap-3">
              {agent.headshot_url ? (
                <img src={agent.headshot_url} alt={agent.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded bg-[#e5e2dd] flex items-center justify-center text-[15px] font-bold text-[#555] flex-shrink-0">
                  {initials}
                </div>
              )}
              <div style={{ lineHeight: '1.4' }}>
                <p className="font-bold text-[15px]">
                  {agent.name}
                  {agent.license_number && (
                    <span className="font-normal text-[11px] text-[#888] ml-1">({agent.license_number})</span>
                  )}
                </p>
                {agent.brokerage && <p className="text-[13px] text-[#444]">{agent.brokerage}</p>}
                <p className="text-[13px] text-[#444]">{agent.phone || '(555) 123-4567'}</p>
                {agent.email && <p className="text-[13px] text-[#444]">{agent.email}</p>}
              </div>
            </div>
          </div>

          {/* P.S. — always below signature */}
          <div className="mt-6 select-none" style={{ fontSize: '13px', lineHeight: '1.4', color: '#555' }}>
            <p><strong>p.s.</strong> {ps}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
