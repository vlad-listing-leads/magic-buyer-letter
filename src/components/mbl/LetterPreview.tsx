'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Pencil } from 'lucide-react'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'
import { LETTER_TEMPLATES } from '@/lib/templates'

/** Editable content sections of the letter */
export interface LetterContent {
  opening: string
  body_1: string
  body_2: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  body_3: string
  body_4: string
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

function EditableText({
  value,
  onChange,
  editable,
  className,
  multiline = false,
}: {
  value: string
  onChange: (value: string) => void
  editable?: boolean
  className?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.select()
      // Auto-resize
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [editing])

  const handleSave = () => {
    setEditing(false)
    if (draft.trim() !== value) {
      onChange(draft.trim())
    }
  }

  if (!editable) {
    return <span className={className}>{value}</span>
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          // Auto-resize
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline) {
            e.preventDefault()
            handleSave()
          }
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        className={cn(
          'w-full bg-white/80 border border-[#006AFF]/30 rounded px-1.5 py-0.5 text-sm leading-relaxed resize-none outline-none focus:ring-1 focus:ring-[#006AFF]/50',
          className
        )}
        rows={1}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-pointer rounded px-1 -mx-1 py-0.5 transition-all',
        'border border-dashed border-stone-300 hover:border-[#006AFF]/50 hover:bg-[#006AFF]/5',
        className
      )}
    >
      {value}
    </span>
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

  // Resolved values: edited > personalized > default
  const opening = editedContent?.opening
    ?? personalized?.opening
    ?? `Your home at ${address} is one of the only properties that my clients, ${buyerName || 'my buyers'}, would seriously consider buying in ${neighborhood}.`

  const body1 = editedContent?.body_1
    ?? "We've looked at everything currently on the market. Nothing has been the right fit."

  const body2 = editedContent?.body_2
    ?? "I promised them I'd do everything in my power to help them find a new home. That's why I'm writing to you."

  const b1 = editedContent?.bullet_1 ?? personalized?.bullet_1 ?? bullets.b1 ?? 'Pre-approved and ready to buy'
  const b2 = editedContent?.bullet_2 ?? personalized?.bullet_2 ?? bullets.b2 ?? 'Flexible on closing timeline'
  const b3 = editedContent?.bullet_3 ?? personalized?.bullet_3 ?? bullets.b3 ?? 'Love the neighborhood'

  const body3 = editedContent?.body_3
    ?? 'I want to be upfront: there are no guarantees here.'

  const body4 = editedContent?.body_4
    ?? "But if the right offer could change your plans, a short conversation is probably worth your time."

  const closing = editedContent?.closing
    ?? personalized?.closing
    ?? 'I look forward to hearing from you,'

  const ps = editedContent?.ps
    ?? `If you'd also like to know what your home is realistically worth in today's market, I'm happy to put together a complimentary home value report — no cost, no obligation. Just text or call me at ${agent.phone || '(555) 123-4567'}.`

  const handleChange = (field: keyof LetterContent, value: string) => {
    onContentChange?.({ ...editedContent, [field]: value })
  }

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
            <EditableText
              value={opening}
              onChange={(v) => handleChange('opening', v)}
              editable={editable}
              multiline
            />
          </p>

          <p className="text-sm leading-relaxed">
            <EditableText
              value={body1}
              onChange={(v) => handleChange('body_1', v)}
              editable={editable}
              multiline
            />
          </p>

          <p className="text-sm leading-relaxed">
            <EditableText
              value={body2}
              onChange={(v) => handleChange('body_2', v)}
              editable={editable}
              multiline
            />
          </p>

          {/* Bullets */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Here&apos;s what&apos;s important to know about {buyerName || 'my buyers'}:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>
                <EditableText
                  value={b1}
                  onChange={(v) => handleChange('bullet_1', v)}
                  editable={editable}
                />
              </li>
              {b2 && (
                <li>
                  <EditableText
                    value={b2}
                    onChange={(v) => handleChange('bullet_2', v)}
                    editable={editable}
                  />
                </li>
              )}
              {b3 && (
                <li>
                  <EditableText
                    value={b3}
                    onChange={(v) => handleChange('bullet_3', v)}
                    editable={editable}
                  />
                </li>
              )}
            </ul>
          </div>

          <p className="text-sm leading-relaxed">
            <EditableText
              value={body3}
              onChange={(v) => handleChange('body_3', v)}
              editable={editable}
              multiline
            />
          </p>

          <p className="text-sm leading-relaxed">
            <EditableText
              value={body4}
              onChange={(v) => handleChange('body_4', v)}
              editable={editable}
              multiline
            />
          </p>

          <p className="text-sm leading-relaxed">
            My personal cell is <strong>{agent.phone || '(555) 123-4567'}</strong>.
          </p>

          <p className="text-sm leading-relaxed">
            <EditableText
              value={closing}
              onChange={(v) => handleChange('closing', v)}
              editable={editable}
            />
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
            <strong>p.s.</strong>{' '}
            <EditableText
              value={ps}
              onChange={(v) => handleChange('ps', v)}
              editable={editable}
              multiline
            />
          </p>

          {editable && (
            <div className="flex items-center justify-center gap-1.5 pt-3 text-xs text-stone-400">
              <Pencil className="h-3 w-3" />
              <span>Click any dashed section to edit</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
