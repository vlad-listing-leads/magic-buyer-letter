'use client'

import { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Map } from '@/components/ui/map'
import { cn } from '@/lib/utils'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'
import type { LetterContent } from './LetterPreview'

interface LetterPreviewWithMapProps {
  agent: MblAgent
  property: MblProperty | null
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  editedContent?: Partial<LetterContent>
  className?: string
}

export function LetterPreviewWithMap({
  agent,
  property,
  buyerName,
  editedContent,
  className,
}: LetterPreviewWithMapProps) {
  const personalized = property?.personalized_content as Record<string, string> | null

  const address = property
    ? `${property.address_line1}, ${property.city}`
    : '123 Main St, Your City'
  const phone = agent.phone || '(555) 123-4567'

  const body = editedContent?.body ?? personalized?.body ?? ''
  const ps = editedContent?.ps ?? personalized?.ps ?? ''

  const [mapReady, setMapReady] = useState(false)
  useEffect(() => {
    // Delay map mount to let the card render with proper dimensions first
    const timer = setTimeout(() => setMapReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

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
        const newScale = Math.max(0.65, cardH / contentH)
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

  const paragraphs = body.split('\n').filter(Boolean)

  const lat = property?.latitude ?? 42.36
  const lng = property?.longitude ?? -71.06

  return (
    <div className={cn('space-y-3', className)}>
      {property && (
        <div className="text-xs">
          <span className="text-muted-foreground">
            Preview for <span className="font-medium text-foreground">{address}</span>
          </span>
        </div>
      )}

      <Card className="overflow-hidden [aspect-ratio:8.5/11] rounded-lg shadow-lg"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", background: 'linear-gradient(168deg, #fdfcfa 0%, #f8f6f2 100%)' }}
        ref={cardRef}>
        <CardContent className="px-0 pb-0 pt-0 h-full" ref={contentRef}>

          {/* Large map header — 25% of page */}
          <div style={{ height: '25%', minHeight: '160px', position: 'relative', overflow: 'hidden' }}>
            {mapReady && (
              <Map
                center={[lng, lat]}
                zoom={13}
                theme="light"
                className="w-full h-full"
                interactive={false}
              />
            )}
            {/* Logo overlay top-left */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '12px',
              zIndex: 1,
            }}>
              {agent.logo_url ? (
                <img src={agent.logo_url} alt={agent.name}
                  style={{ height: '28px', maxWidth: '120px', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} />
              ) : (
                <div style={{
                  fontSize: '10px',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontWeight: 600,
                  color: '#1a2744',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.15em',
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  padding: '3px 8px',
                  borderRadius: '3px',
                }}>
                  {agent.brokerage || agent.name}
                </div>
              )}
            </div>
            {/* White fade at bottom */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '20%',
              background: 'linear-gradient(to bottom, transparent 0%, rgba(253,252,250,1) 100%)',
              pointerEvents: 'none',
            }} />
            {/* Hand-drawn circle overlay */}
            <svg
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                pointerEvents: 'none',
              }}
              viewBox="0 0 140 140"
              fill="none"
            >
              <ellipse
                cx="70"
                cy="70"
                rx="58"
                ry="55"
                stroke="#1a2744"
                strokeWidth="2"
                strokeLinecap="round"
                fill="rgba(26,39,68,0.06)"
                style={{
                  strokeDasharray: '4 3',
                  filter: 'url(#rough)',
                }}
              />
              <defs>
                <filter id="rough">
                  <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="3" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                </filter>
              </defs>
            </svg>
          </div>

          {/* Letter content — below map */}
          <div style={{ padding: '16px 36px 24px 36px' }}>
            {/* Logo + agent info */}
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '0.5px solid #e2ded8', marginBottom: '14px' }}>
              <div className="flex-shrink-0">
                {agent.logo_url ? (
                  <img src={agent.logo_url} alt={agent.name} className="h-8 max-w-[140px] object-contain" />
                ) : (
                  <div style={{
                    fontSize: '11px',
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 400,
                    color: '#555',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.2em',
                  }}>
                    {agent.brokerage || agent.name}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '10px', color: '#888', fontFamily: "'Helvetica Neue', Arial, sans-serif", textAlign: 'right' as const }}>
                {agent.phone && <div>{agent.phone}</div>}
                {agent.email && <div>{agent.email}</div>}
              </div>
            </div>

            {/* Letter body */}
            <div style={{ fontSize: '13px', lineHeight: '1.25', color: '#333', letterSpacing: '0.01em' }}>
              {paragraphs.map((para, i) => {
                const isBullet = /^[•\-\*]\s/.test(para.trim())
                if (isBullet) {
                  const bulletText = para.replace(/^[•\-\*]\s*/, '')
                  return (
                    <p key={i} style={{ paddingLeft: '16px', marginBottom: '4px', fontSize: '12px', lineHeight: '1.25', color: '#444', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0', color: '#1a2744', fontWeight: 'bold' }}>•</span>
                      {bulletText}
                    </p>
                  )
                }

                const highlightPara = (text: string) => {
                  let html = text
                  if (property) {
                    html = html.replace(
                      new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                      `<span style="background:linear-gradient(180deg, transparent 60%, rgba(26,39,68,0.08) 60%);font-weight:600">${address}</span>`
                    )
                  }
                  html = html.replace(
                    /\$[\d,]+(?:\.\d{2})?/g,
                    (match) => `<span style="background:linear-gradient(180deg, transparent 60%, rgba(26,39,68,0.08) 60%);font-weight:600">${match}</span>`
                  )
                  return html
                }

                return (
                  <p key={i} style={{ marginBottom: '10px' }}
                    dangerouslySetInnerHTML={{ __html: highlightPara(para) }} />
                )
              })}
            </div>

            {/* Compact signature */}
            <div className="select-none" style={{ marginTop: '20px' }}>
              <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                With warm regards,
              </p>
              <div className="flex items-start gap-3">
                {agent.headshot_url ? (
                  <img src={agent.headshot_url} alt={agent.name}
                    className="flex-shrink-0"
                    style={{ width: '44px', height: '44px', borderRadius: '5px', objectFit: 'cover', border: '1px solid #e0ddd8' }} />
                ) : (
                  <div className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '44px', height: '44px', borderRadius: '5px',
                      background: 'linear-gradient(135deg, #1a2744 0%, #2d3f5e 100%)',
                    }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#e8dfd0', letterSpacing: '0.05em', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>{initials}</span>
                  </div>
                )}
                <div style={{ lineHeight: '1.4', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                  <p style={{ fontWeight: 600, fontSize: '13px', color: '#1a2744' }}>{agent.name}</p>
                  {agent.brokerage && <p style={{ fontSize: '10.5px', color: '#777' }}>{agent.brokerage}</p>}
                  {agent.license_number && (
                    <p style={{ fontSize: '9px', color: '#aaa', letterSpacing: '0.03em' }}>License #{agent.license_number}</p>
                  )}
                </div>
              </div>
            </div>

            {ps && (
              <div className="select-none" style={{ marginTop: '16px', paddingLeft: '12px', borderLeft: '2px solid #c5bfb5' }}>
                <p style={{ fontSize: '11px', lineHeight: '1.5', color: '#777', fontStyle: 'italic' }}>
                  <span style={{ fontStyle: 'normal', fontWeight: 700, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#999' }}>P.S.</span>
                  &ensp;{ps}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
