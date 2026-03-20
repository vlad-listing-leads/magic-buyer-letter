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

  // Body — everything from Claude, no hardcoded fallback
  const body = editedContent?.body ?? personalized?.body ?? ''

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

      {/* Letter Card — Editorial design */}
      <Card className="bg-white text-[#2a2a2a] overflow-hidden [aspect-ratio:8.5/11] rounded-lg shadow-md"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} ref={cardRef}>
        <CardContent className="px-14 pb-10 pt-0" ref={contentRef}>
          {/* Letterhead */}
          <div className="flex justify-center pt-10 pb-3">
            {agent.logo_url ? (
              <img src={agent.logo_url} alt={agent.name} className="h-12 max-w-[200px] object-contain" />
            ) : (
              <div className="h-12 flex items-center text-lg tracking-[0.15em] uppercase text-[#333]"
                style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 500 }}>
                {agent.brokerage || agent.name}
              </div>
            )}
          </div>
          {/* Thin editorial rule */}
          <div className="mx-auto mb-8" style={{ width: '40px', height: '1px', backgroundColor: '#ccc' }} />

          {/* Letter body */}
          <div className="space-y-[1em]" style={{ fontSize: '14.5px', lineHeight: '1.7', letterSpacing: '0.01em' }}>
            {paragraphs.map((para, i) => {
              const isBullet = /^[•\-\*]\s/.test(para.trim())
              if (isBullet) {
                return (
                  <p key={i} className="pl-6" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    {para}
                  </p>
                )
              }

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

          {/* Signature block */}
          <div className="mt-10 select-none">
            <div className="mb-5" style={{ width: '32px', height: '1px', backgroundColor: '#d0d0d0' }} />
            <div className="flex items-start gap-4">
              {agent.headshot_url ? (
                <img src={agent.headshot_url} alt={agent.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid #e0e0e0' }} />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#f0eeeb', border: '1px solid #e0ddd8', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                  <span className="text-[14px] font-medium text-[#777]">{initials}</span>
                </div>
              )}
              <div style={{ lineHeight: '1.5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                <p className="font-semibold text-[14px] text-[#2a2a2a]">
                  {agent.name}
                  {agent.license_number && (
                    <span className="font-normal text-[10px] text-[#999] ml-1.5">#{agent.license_number}</span>
                  )}
                </p>
                {agent.brokerage && <p className="text-[12px] text-[#666] mt-0.5">{agent.brokerage}</p>}
                <p className="text-[12px] text-[#666]">{phone}</p>
                {agent.email && <p className="text-[12px] text-[#666]">{agent.email}</p>}
              </div>
            </div>
          </div>

          {/* P.S. */}
          {ps && (
            <div className="mt-8 select-none" style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#777', fontStyle: 'italic' }}>
              <p><span style={{ fontStyle: 'normal', fontWeight: 600, letterSpacing: '0.05em', fontSize: '10px', textTransform: 'uppercase' as const }}>P.S.</span>&ensp;{ps}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
