'use client'

import { useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'
import type { LetterContent } from './LetterPreview'

interface LetterPreviewWithMapProps {
  agent: MblAgent
  property: MblProperty | null
  allProperties?: MblProperty[]
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  editedContent?: Partial<LetterContent>
  className?: string
}

/** Calculate centroid and zoom from property locations */
function computeMapView(properties: MblProperty[]): { centerLat: number; centerLng: number; zoom: number; radiusKm: number } {
  const withCoords = properties.filter((p) => p.latitude && p.longitude)
  if (withCoords.length === 0) return { centerLat: 42.36, centerLng: -71.06, zoom: 10, radiusKm: 5 }

  const lats = withCoords.map((p) => p.latitude!)
  const lngs = withCoords.map((p) => p.longitude!)

  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length

  const distances = withCoords.map((p) => haversineKm(centerLat, centerLng, p.latitude!, p.longitude!))
  const maxDist = Math.max(...distances, 1) * 1.3

  let zoom = 12
  if (maxDist > 100) zoom = 7
  else if (maxDist > 50) zoom = 8
  else if (maxDist > 25) zoom = 9
  else if (maxDist > 12) zoom = 10
  else if (maxDist > 6) zoom = 11
  else if (maxDist > 3) zoom = 12
  else zoom = 13

  return { centerLat, centerLng, zoom, radiusKm: maxDist }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Convert lat/lng to tile coordinates */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; pixelX: number; pixelY: number } {
  const n = Math.pow(2, zoom)
  const xTile = ((lng + 180) / 360) * n
  const yTile = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n
  return {
    x: Math.floor(xTile),
    y: Math.floor(yTile),
    pixelX: (xTile % 1) * 256,
    pixelY: (yTile % 1) * 256,
  }
}

/** Generate a 3x3 grid of tile URLs centered on a location */
function getStaticMapTiles(lat: number, lng: number, zoom: number): Array<{ url: string; offsetX: number; offsetY: number }> {
  const center = latLngToTile(lat, lng, zoom)
  const tiles: Array<{ url: string; offsetX: number; offsetY: number }> = []
  const servers = ['a', 'b', 'c']

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = center.x + dx
      const ty = center.y + dy
      const server = servers[(tx + ty) % 3]
      tiles.push({
        url: `https://${server}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`,
        offsetX: dx * 256 - center.pixelX + 256 * 1.5, // center the grid
        offsetY: dy * 256 - center.pixelY + 256 * 0.75,
      })
    }
  }
  return tiles
}

/** SVG circle overlay for the search area */
function CircleOverlay({ containerWidth, containerHeight, radiusKm, zoom }: {
  containerWidth: number; containerHeight: number; radiusKm: number; zoom: number
}) {
  // Approximate pixels per km at this zoom level
  const metersPerPixel = 156543.03392 * Math.cos(0) / Math.pow(2, zoom)
  const pixelsPerKm = 1000 / metersPerPixel
  const radiusPx = Math.min(radiusKm * pixelsPerKm, containerWidth * 0.4, containerHeight * 0.4)

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      <ellipse
        cx={containerWidth / 2}
        cy={containerHeight / 2}
        rx={Math.max(radiusPx, 30)}
        ry={Math.max(radiusPx, 30)}
        stroke="#1a2744"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        strokeOpacity="0.5"
        fill="#1a2744"
        fillOpacity="0.05"
      />
    </svg>
  )
}

export function LetterPreviewWithMap({
  agent,
  property,
  allProperties,
  buyerName,
  editedContent,
  className,
}: LetterPreviewWithMapProps) {
  const personalized = property?.personalized_content as Record<string, string> | null

  const address = property
    ? `${property.address_line1}, ${property.city}`
    : '123 Main St, Your City'

  const body = editedContent?.body ?? personalized?.body ?? ''
  const ps = editedContent?.ps ?? personalized?.ps ?? ''

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
  const mapView = computeMapView(allProperties ?? (property ? [property] : []))
  const tiles = getStaticMapTiles(mapView.centerLat, mapView.centerLng, mapView.zoom)

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
        data-letter-preview
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", background: 'linear-gradient(168deg, #fdfcfa 0%, #f8f6f2 100%)' }}
        ref={cardRef}>
        <CardContent className="px-0 pb-0 pt-0 h-full" ref={contentRef}>

          {/* Header — logo left, static map right half */}
          <div style={{ height: '25%', minHeight: '160px', display: 'flex' }}>
            {/* Left: logo + agent info */}
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 20px 16px 52px' }}>
              {agent.logo_url ? (
                <img src={agent.logo_url} alt={agent.name}
                  style={{ height: '36px', maxWidth: '160px', objectFit: 'contain', marginBottom: '10px' }} />
              ) : (
                <div style={{
                  fontSize: '12px',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontWeight: 600,
                  color: '#1a2744',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.15em',
                  marginBottom: '10px',
                }}>
                  {agent.brokerage || agent.name}
                </div>
              )}
              <div style={{ fontSize: '9px', fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#888', lineHeight: '1.6' }}>
                {agent.name && <div style={{ fontWeight: 600, color: '#555', fontSize: '10px' }}>{agent.name}</div>}
                {agent.phone && <div>{agent.phone}</div>}
                {agent.email && <div>{agent.email}</div>}
              </div>
            </div>

            {/* Right: static tile map */}
            <div style={{ width: '50%', position: 'relative', overflow: 'hidden' }}>
              {/* Tile grid */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                {tiles.map((tile, i) => (
                  <img
                    key={i}
                    src={tile.url}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      position: 'absolute',
                      left: `${tile.offsetX}px`,
                      top: `${tile.offsetY}px`,
                      width: '256px',
                      height: '256px',
                      imageRendering: 'auto',
                    }}
                  />
                ))}
              </div>

              {/* Circle overlay */}
              <CircleOverlay
                containerWidth={400}
                containerHeight={200}
                radiusKm={mapView.radiusKm}
                zoom={mapView.zoom}
              />

              {/* Fade left edge into paper */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: '20%',
                background: 'linear-gradient(to right, rgba(253,252,250,1) 0%, transparent 100%)',
                pointerEvents: 'none',
              }} />
              {/* Fade bottom edge */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(253,252,250,1) 100%)',
                pointerEvents: 'none',
              }} />
              {/* Label */}
              <div style={{
                position: 'absolute', bottom: '16%', right: '8px',
                fontSize: '6.5px', fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontWeight: 600, color: '#1a2744', textTransform: 'uppercase' as const,
                letterSpacing: '0.06em', backgroundColor: 'rgba(255,255,255,0.85)',
                padding: '2px 5px', borderRadius: '2px', pointerEvents: 'none',
              }}>
                Area of interest
              </div>
            </div>
          </div>

          {/* Letter content — below header */}
          <div style={{ padding: '16px 52px 24px 52px' }}>
            <div style={{ fontSize: '13px', lineHeight: '1.35', color: '#333', letterSpacing: '0.01em' }}>
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

            {/* Signature */}
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
