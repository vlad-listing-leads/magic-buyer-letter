'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type MapLibreGL from 'maplibre-gl'
import { Card, CardContent } from '@/components/ui/card'
import { Map } from '@/components/ui/map'
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

/** Calculate centroid, zoom, and circle radius from property locations */
function computeMapView(properties: MblProperty[]): {
  center: [number, number]
  zoom: number
  radiusKm: number
  circleGeoJSON: GeoJSON.Feature<GeoJSON.Polygon>
} {
  const withCoords = properties.filter((p) => p.latitude && p.longitude)
  if (withCoords.length === 0) {
    const defaultCircle = makeCircleGeoJSON(-71.06, 42.36, 5)
    return { center: [-71.06, 42.36], zoom: 9, radiusKm: 5, circleGeoJSON: defaultCircle }
  }

  const lats = withCoords.map((p) => p.latitude!)
  const lngs = withCoords.map((p) => p.longitude!)

  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length

  // Calculate radius to encompass all properties (+ 20% padding)
  const distances = withCoords.map((p) => haversineKm(centerLat, centerLng, p.latitude!, p.longitude!))
  const maxDist = Math.max(...distances, 1) * 1.3 // 30% padding

  // Zoom based on radius
  let zoom = 12
  if (maxDist > 100) zoom = 7
  else if (maxDist > 50) zoom = 8
  else if (maxDist > 25) zoom = 9
  else if (maxDist > 12) zoom = 10
  else if (maxDist > 6) zoom = 11
  else if (maxDist > 3) zoom = 12
  else zoom = 13

  const circleGeoJSON = makeCircleGeoJSON(centerLng, centerLat, maxDist)
  return { center: [centerLng, centerLat], zoom, radiusKm: maxDist, circleGeoJSON }
}

/** Haversine distance in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Create a GeoJSON circle polygon */
function makeCircleGeoJSON(lng: number, lat: number, radiusKm: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dx = radiusKm * Math.cos(angle)
    const dy = radiusKm * Math.sin(angle)
    const dLat = dy / 111.32
    const dLng = dx / (111.32 * Math.cos(lat * Math.PI / 180))
    coords.push([lng + dLng, lat + dLat])
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  }
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

  const mapView = computeMapView(allProperties ?? (property ? [property] : []))
  const mapRef = useRef<MapLibreGL.Map>(null)

  const addCircleLayer = useCallback((map: MapLibreGL.Map) => {
    if (map.getSource('search-area')) return
    map.addSource('search-area', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [mapView.circleGeoJSON],
      },
    })
    map.addLayer({
      id: 'search-area-fill',
      type: 'fill',
      source: 'search-area',
      paint: { 'fill-color': '#1a2744', 'fill-opacity': 0.06 },
    })
    map.addLayer({
      id: 'search-area-line',
      type: 'line',
      source: 'search-area',
      paint: { 'line-color': '#1a2744', 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.5 },
    })
  }, [mapView.circleGeoJSON])

  // Add circle layer once map loads
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) {
      addCircleLayer(map)
    } else {
      map.on('load', () => addCircleLayer(map))
    }
  }, [mapReady, addCircleLayer])

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
                ref={mapRef}
                center={mapView.center}
                zoom={mapView.zoom}
                theme="light"
                className="w-full h-full"
                interactive={false}
                styles={{
                  light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
                }}
              />
            )}
            {/* Logo overlay top-left */}
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '18px',
              zIndex: 1,
            }}>
              {agent.logo_url ? (
                <img src={agent.logo_url} alt={agent.name}
                  style={{ height: '32px', maxWidth: '140px', objectFit: 'contain' }} />
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
            {/* "Buyers looking" label */}
            <div style={{
              position: 'absolute',
              bottom: '22%',
              right: '12px',
              fontSize: '7px',
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 600,
              color: '#1a2744',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: '2px 6px',
              borderRadius: '2px',
              lineHeight: '1.3',
              pointerEvents: 'none',
            }}>
              Area of interest
            </div>
          </div>

          {/* Letter content — below map */}
          <div style={{ padding: '16px 44px 24px 44px' }}>
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
                  {agent.phone && <p style={{ fontSize: '10.5px', color: '#777' }}>{agent.phone}</p>}
                  {agent.email && <p style={{ fontSize: '10.5px', color: '#777' }}>{agent.email}</p>}
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
