'use client'

import { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'

/** Content from Claude — just body + ps */
export interface LetterContent {
  body: string
  ps: string
}

interface LetterPreviewProps {
  agent: MblAgent
  property: MblProperty | null
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  onTemplateChange?: (style: TemplateStyle) => void
  editedContent?: Partial<LetterContent>
  className?: string
}

export function LetterPreview({
  agent,
  property,
  buyerName,
  bullets,
  editedContent,
  className,
}: LetterPreviewProps) {
  const personalized = property?.personalized_content as Record<string, string> | null

  const address = property
    ? `${property.address_line1}, ${property.city}`
    : '123 Main St, Your City'
  const phone = agent.phone || '(555) 123-4567'

  // Body — everything from Claude
  const body = editedContent?.body
    ?? personalized?.body
    ?? `Your home at ${address} caught the attention of my clients, ${buyerName || 'my buyers'}. They are actively searching for a home just like yours and would love the opportunity to make you an offer.\n\nI represent serious, qualified buyers who are ready to move forward. Here's what makes them stand out:\n\n• ${bullets.b1 || 'Qualified and ready to purchase'}\n• ${bullets.b2 || 'Flexible on timeline'}\n• ${bullets.b3 || 'Love the neighborhood'}\n\nIf selling is something you'd consider, even casually, I'd welcome the chance to chat. You can reach me directly at ${phone}.`

  const ps = editedContent?.ps ?? personalized?.ps ?? ''

  // Toggle: highlight listing-specific content
  const [showListingHighlight, setShowListingHighlight] = useState(false)

  // Auto-scale content to fit page
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const content = contentRef.current
    if (!card || !content) return

    const measure = () => {
      content.style.transform = 'none'
      content.style.width = '100%'
      const cardH = card.clientHeight
      const contentH = content.scrollHeight
      if (contentH > cardH) {
        const newScale = Math.max(0.7, cardH / contentH)
        content.style.transform = `scale(${newScale})`
        content.style.transformOrigin = 'top left'
        content.style.width = `${100 / newScale}%`
      }
    }

    requestAnimationFrame(measure)
    const observer = new MutationObserver(() => requestAnimationFrame(measure))
    observer.observe(content, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [body, ps])

  const initials = agent.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Split body into paragraphs
  const paragraphs = body.split('\n').filter(Boolean)

  return (
    <div className={cn('space-y-3', className)}>
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
      <Card className="bg-[#faf9f7] text-[#1a1a1a] overflow-hidden [aspect-ratio:8.5/11] rounded-lg"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }} ref={cardRef}>
        <CardContent className="px-12 pb-10 pt-0" ref={contentRef}>
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

          {/* Letter body — 100% from Claude */}
          <div className="space-y-[0.8em]" style={{ fontSize: '15px', lineHeight: '1.5' }}>
            {paragraphs.map((para, i) => {
              // Check if paragraph is a bullet point (starts with •, -, *)
              const isBullet = /^[•\-\*]\s/.test(para.trim())
              if (isBullet) {
                return (
                  <p key={i} className="pl-4">{para}</p>
                )
              }

              // Highlight address in first paragraph if toggle is on
              if (showListingHighlight && i === 0 && property) {
                return (
                  <p key={i} dangerouslySetInnerHTML={{
                    __html: para.replace(
                      new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                      `<mark style="background:#fef3c7;padding:1px 3px;border-radius:3px">${address}</mark>`
                    )
                  }} />
                )
              }

              return <p key={i}>{para}</p>
            })}
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
                <p className="text-[13px] text-[#444]">{phone}</p>
                {agent.email && <p className="text-[13px] text-[#444]">{agent.email}</p>}
              </div>
            </div>
          </div>

          {/* P.S. — only if Claude generated one */}
          {ps && (
            <div className="mt-6 select-none" style={{ fontSize: '13px', lineHeight: '1.4', color: '#555' }}>
              <p><strong>p.s.</strong> {ps}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
