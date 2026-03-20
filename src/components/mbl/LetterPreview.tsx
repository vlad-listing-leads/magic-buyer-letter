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
      <Card className="overflow-hidden [aspect-ratio:8.5/11] rounded-lg shadow-lg"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", background: 'linear-gradient(168deg, #fdfcfa 0%, #f8f6f2 100%)' }}
        ref={cardRef}>
        <CardContent className="px-0 pb-0 pt-0 h-full" ref={contentRef}>
          {/* Inset stationery border */}
          <div className="h-full" style={{ margin: '18px', border: '0.5px solid #e2ded8', padding: '0 36px 32px 36px' }}>

            {/* Letterhead with accent line */}
            <div className="flex flex-col items-center pt-8 pb-1">
              {agent.logo_url ? (
                <img src={agent.logo_url} alt={agent.name} className="h-11 max-w-[180px] object-contain" />
              ) : (
                <div className="flex items-center text-[13px] tracking-[0.2em] uppercase"
                  style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 400, color: '#555' }}>
                  {agent.brokerage || agent.name}
                </div>
              )}
            </div>
            {/* Ornamental divider — three dots */}
            <div className="flex items-center justify-center gap-1.5 py-4 mb-4">
              <div style={{ width: '20px', height: '0.5px', backgroundColor: '#c5bfb5' }} />
              <div style={{ width: '4px', height: '4px', backgroundColor: '#c5bfb5', borderRadius: '50%' }} />
              <div style={{ width: '20px', height: '0.5px', backgroundColor: '#c5bfb5' }} />
            </div>

            {/* Letter body with drop cap */}
            <div style={{ fontSize: '14px', lineHeight: '1.75', color: '#333', letterSpacing: '0.01em' }}>
              {paragraphs.map((para, i) => {
                const isBullet = /^[•\-\*]\s/.test(para.trim())
                if (isBullet) {
                  return (
                    <p key={i} style={{ paddingLeft: '20px', marginBottom: '6px', fontSize: '13.5px', lineHeight: '1.65', color: '#444' }}>
                      {para}
                    </p>
                  )
                }

                if (showListingHighlight && i === 0 && property) {
                  return (
                    <p key={i} style={{ marginBottom: '14px' }} dangerouslySetInnerHTML={{
                      __html: para.replace(
                        new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        `<mark style="background:#fef3c7;padding:1px 3px;border-radius:3px">${address}</mark>`
                      )
                    }} />
                  )
                }

                {/* Drop cap on first paragraph */}
                if (i === 0 && para.length > 1) {
                  const firstChar = para[0]
                  const rest = para.slice(1)
                  return (
                    <p key={i} style={{ marginBottom: '14px' }}>
                      <span style={{
                        float: 'left',
                        fontSize: '52px',
                        lineHeight: '0.8',
                        fontWeight: 'bold',
                        color: '#1a2744',
                        marginRight: '6px',
                        marginTop: '4px',
                        fontFamily: "Georgia, 'Times New Roman', serif",
                      }}>{firstChar}</span>
                      {rest}
                    </p>
                  )
                }

                return <p key={i} style={{ marginBottom: '14px' }}>{para}</p>
              })}
            </div>

            {/* Signature block */}
            <div className="select-none" style={{ marginTop: '28px' }}>
              {/* "Warm regards" in italic serif */}
              <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#555', marginBottom: '16px' }}>
                With warm regards,
              </p>
              <div className="flex items-start gap-4">
                {agent.headshot_url ? (
                  <img src={agent.headshot_url} alt={agent.name}
                    className="flex-shrink-0"
                    style={{ width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e0ddd8', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} />
                ) : (
                  <div className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '52px', height: '52px', borderRadius: '6px',
                      background: 'linear-gradient(135deg, #1a2744 0%, #2d3f5e 100%)',
                      fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    }}>
                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#e8dfd0', letterSpacing: '0.05em' }}>{initials}</span>
                  </div>
                )}
                <div style={{ lineHeight: '1.5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: '#1a2744' }}>
                    {agent.name}
                  </p>
                  {agent.brokerage && <p style={{ fontSize: '11.5px', color: '#777', marginTop: '1px' }}>{agent.brokerage}</p>}
                  <p style={{ fontSize: '11.5px', color: '#777' }}>{phone}</p>
                  {agent.email && <p style={{ fontSize: '11.5px', color: '#777' }}>{agent.email}</p>}
                  {agent.license_number && (
                    <p style={{ fontSize: '9.5px', color: '#aaa', marginTop: '2px', letterSpacing: '0.03em' }}>License #{agent.license_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* P.S. — editorial pull-quote style with left border */}
            {ps && (
              <div className="select-none" style={{
                marginTop: '24px',
                paddingLeft: '14px',
                borderLeft: '2px solid #c5bfb5',
              }}>
                <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#777', fontStyle: 'italic' }}>
                  <span style={{ fontStyle: 'normal', fontWeight: 700, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#999' }}>P.S.</span>
                  &ensp;{ps}
                </p>
              </div>
            )}

          </div>{/* end inset border */}
        </CardContent>
      </Card>
    </div>
  )
}
