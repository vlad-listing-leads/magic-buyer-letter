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
  letterContent?: { body: string; ps?: string } | null
  /** @deprecated use letterContent instead */
  property?: MblProperty | null
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  onTemplateChange?: (style: TemplateStyle) => void
  editedContent?: Partial<LetterContent>
  className?: string
}

export function LetterPreview({
  agent,
  letterContent,
  property,
  buyerName,
  bullets,
  editedContent,
  className,
}: LetterPreviewProps) {
  const personalized = property?.personalized_content as Record<string, string> | null
  const phone = agent.phone || '(555) 123-4567'

  // Prefer letterContent (campaign-level), fall back to property personalized_content
  const body = editedContent?.body ?? letterContent?.body ?? personalized?.body ?? ''
  const ps = editedContent?.ps ?? letterContent?.ps ?? personalized?.ps ?? ''

  // Dynamic font sizing — adjust to fill US letter between logo and signature
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const content = contentRef.current
    const bodyEl = bodyRef.current
    if (!card || !content || !bodyEl) return

    const fit = () => {
      // Reset to max size first
      bodyEl.style.fontSize = '16px'
      bodyEl.style.lineHeight = '1.5'
      content.style.transform = 'none'
      content.style.width = '100%'

      const cardH = card.clientHeight
      let contentH = content.scrollHeight

      // Step down font size until it fits (16px → 11px range)
      const sizes = [
        { font: 16, line: 1.5, margin: 14 },
        { font: 15, line: 1.45, margin: 13 },
        { font: 14, line: 1.4, margin: 12 },
        { font: 13, line: 1.35, margin: 11 },
        { font: 12.5, line: 1.3, margin: 10 },
        { font: 12, line: 1.3, margin: 9 },
        { font: 11.5, line: 1.25, margin: 8 },
        { font: 11, line: 1.25, margin: 7 },
      ]

      for (const s of sizes) {
        bodyEl.style.fontSize = `${s.font}px`
        bodyEl.style.lineHeight = `${s.line}`
        // Update paragraph margins
        bodyEl.querySelectorAll('p').forEach((p) => {
          (p as HTMLElement).style.marginBottom = `${s.margin}px`
        })
        contentH = content.scrollHeight
        if (contentH <= cardH) return // fits
      }

      // If still too large at min font, use scale as last resort
      if (contentH > cardH) {
        const scale = Math.max(0.75, cardH / contentH)
        content.style.transform = `scale(${scale})`
        content.style.transformOrigin = 'top left'
        content.style.width = `${100 / scale}%`
      }
    }

    requestAnimationFrame(fit)
    const observer = new MutationObserver(() => requestAnimationFrame(fit))
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

      {/* Letter Card — Editorial design */}
      <Card className="overflow-hidden [aspect-ratio:8.5/11] rounded-lg shadow-lg border-0"
        data-letter-preview
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", background: 'linear-gradient(168deg, #fdfcfa 0%, #f8f6f2 100%)' }}
        ref={cardRef}>
        <CardContent className="px-0 pb-0 pt-0 h-full" ref={contentRef}>
          {/* Inset stationery border */}
          <div className="h-full" style={{ margin: '18px', border: '0.5px solid #e2ded8', padding: '0 36px 32px 36px' }}>

            {/* Letterhead — centered logo */}
            <div className="flex items-center justify-center pt-7 pb-2">
              {agent.logo_url ? (
                <img src={agent.logo_url} alt={agent.name} className="h-10 max-w-[160px] object-contain" />
              ) : (
                <div className="text-[12px] tracking-[0.2em] uppercase text-center"
                  style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 400, color: '#555' }}>
                  {agent.brokerage || agent.name}
                </div>
              )}
            </div>
            {/* Ornamental divider */}
            <div className="flex items-center justify-center gap-1.5 py-3 mb-3">
              <div style={{ width: '20px', height: '0.5px', backgroundColor: '#c5bfb5' }} />
              <div style={{ width: '4px', height: '4px', backgroundColor: '#c5bfb5', borderRadius: '50%' }} />
              <div style={{ width: '20px', height: '0.5px', backgroundColor: '#c5bfb5' }} />
            </div>

            {/* Letter body */}
            <div ref={bodyRef} style={{ fontSize: '14px', lineHeight: '1.4', color: '#333', letterSpacing: '0.01em' }}>
              {paragraphs.map((para, i) => {
                const isBullet = /^[•\-\*]\s/.test(para.trim())
                if (isBullet) {
                  const bulletText = para.replace(/^[•\-\*]\s*/, '')
                  return (
                    <p key={i} style={{ paddingLeft: '16px', marginBottom: '5px', fontSize: '13px', lineHeight: '1.25', color: '#444', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0', color: '#1a2744', fontWeight: 'bold' }}>•</span>
                      {bulletText}
                    </p>
                  )
                }

                // Highlight dollar amounts
                const highlightPara = (text: string) => {
                  return text.replace(
                    /\$[\d,]+(?:\.\d{2})?/g,
                    (match) => `<span style="background:linear-gradient(180deg, transparent 60%, rgba(26,39,68,0.08) 60%);font-weight:600">${match}</span>`
                  )
                }

                return (
                  <p key={i} style={{ marginBottom: '12px' }}
                    dangerouslySetInnerHTML={{ __html: highlightPara(para) }} />
                )
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

            {/* Broker disclaimer — microprint */}
            <p className="select-none" style={{ fontSize: '8px', lineHeight: '1.4', color: '#aaa', textAlign: 'center', marginTop: '20px' }}>
              If your property is listed with a Real Estate Broker, please disregard. It is not our intention to solicit the offerings or clients of other Real Estate Brokers.
            </p>

          </div>{/* end inset border */}
        </CardContent>
      </Card>
    </div>
  )
}
