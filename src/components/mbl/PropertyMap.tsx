'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PenTool, X, Check } from 'lucide-react'
import type { MblProperty } from '@/types'

interface PropertyMapProps {
  properties: MblProperty[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectMany?: (ids: string[]) => void
}

type LatLng = [number, number]

/** Ray-casting point-in-polygon check */
function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const [py, px] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [iy, ix] = polygon[i]
    const [jy, jx] = polygon[j]
    if ((iy > py) !== (jy > py) && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix) {
      inside = !inside
    }
  }
  return inside
}

// Store Leaflet module reference for icon creation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let leafletModule: any = null

function createMarkerIcon(isSelected: boolean) {
  if (!leafletModule) return undefined
  const L = leafletModule

  const color = isSelected ? '#006AFF' : '#9CA3AF'
  const opacity = isSelected ? '1' : '0.5'
  const borderColor = isSelected ? '#0058D4' : '#6B7280'

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"
            fill="${color}" stroke="${borderColor}" stroke-width="1" opacity="${opacity}"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="${opacity}"/>
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  })
}

/** Inner component that uses react-leaflet hooks (must be inside MapContainer) */
function MapClickHandler({
  drawMode,
  onMapClick,
}: {
  drawMode: boolean
  onMapClick: (latlng: LatLng) => void
}) {
  const [useMapEvents, setUseMapEvents] = useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((handlers: Record<string, (...args: any[]) => void>) => null) | null
  >(null)

  useEffect(() => {
    import('react-leaflet').then((rl) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUseMapEvents(() => (rl as any).useMapEvents)
    })
  }, [])

  if (!useMapEvents) return null

  return <MapClickHandlerInner drawMode={drawMode} onMapClick={onMapClick} useMapEvents={useMapEvents} />
}

function MapClickHandlerInner({
  drawMode,
  onMapClick,
  useMapEvents,
}: {
  drawMode: boolean
  onMapClick: (latlng: LatLng) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useMapEvents: (handlers: Record<string, (...args: any[]) => void>) => any
}) {
  useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      if (drawMode) {
        onMapClick([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

export function PropertyMap({
  properties,
  selectedIds,
  onToggleSelect,
  onSelectMany,
}: PropertyMapProps) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: React.ComponentType<Record<string, unknown>>
    TileLayer: React.ComponentType<Record<string, unknown>>
    Marker: React.ComponentType<Record<string, unknown>>
    Popup: React.ComponentType<{ children: React.ReactNode }>
    Polygon: React.ComponentType<Record<string, unknown>>
    Polyline: React.ComponentType<Record<string, unknown>>
  } | null>(null)

  const [drawMode, setDrawMode] = useState(false)
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>([])
  const mapKeyRef = useRef(0)

  useEffect(() => {
    // Dynamic import to avoid SSR issues with Leaflet
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
    ]).then(([rl, L]) => {
      // Load Leaflet CSS dynamically
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
        document.head.appendChild(link)
      }
      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      leafletModule = L

      setMapComponents({
        MapContainer: rl.MapContainer as unknown as React.ComponentType<Record<string, unknown>>,
        TileLayer: rl.TileLayer as unknown as React.ComponentType<Record<string, unknown>>,
        Marker: rl.Marker as unknown as React.ComponentType<Record<string, unknown>>,
        Popup: rl.Popup as unknown as React.ComponentType<{ children: React.ReactNode }>,
        Polygon: rl.Polygon as unknown as React.ComponentType<Record<string, unknown>>,
        Polyline: rl.Polyline as unknown as React.ComponentType<Record<string, unknown>>,
      })
    })
  }, [])

  const mappableProperties = properties.filter(p => p.latitude && p.longitude)

  const handleMapClick = useCallback((latlng: LatLng) => {
    setPolygonPoints(prev => [...prev, latlng])
  }, [])

  const handleFinishPolygon = useCallback(() => {
    if (polygonPoints.length < 3 || !onSelectMany) {
      setPolygonPoints([])
      setDrawMode(false)
      return
    }

    const insideIds = mappableProperties
      .filter(p => isPointInPolygon([p.latitude!, p.longitude!], polygonPoints))
      .map(p => p.id)

    if (insideIds.length > 0) {
      onSelectMany(insideIds)
    }

    setPolygonPoints([])
    setDrawMode(false)
  }, [polygonPoints, mappableProperties, onSelectMany])

  const handleCancelDraw = useCallback(() => {
    setPolygonPoints([])
    setDrawMode(false)
  }, [])

  const handleToggleDraw = useCallback(() => {
    if (drawMode) {
      handleCancelDraw()
    } else {
      setDrawMode(true)
      setPolygonPoints([])
    }
  }, [drawMode, handleCancelDraw])

  const handleUndoPoint = useCallback(() => {
    setPolygonPoints(prev => prev.slice(0, -1))
  }, [])

  if (mappableProperties.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">Map unavailable — properties don&apos;t have coordinates</p>
          <p className="text-xs text-muted-foreground mt-1">Switch to List view to see all properties</p>
        </CardContent>
      </Card>
    )
  }

  const center = {
    lat: mappableProperties.reduce((sum, p) => sum + (p.latitude ?? 0), 0) / mappableProperties.length,
    lng: mappableProperties.reduce((sum, p) => sum + (p.longitude ?? 0), 0) / mappableProperties.length,
  }

  if (!MapComponents) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Loading map...
        </CardContent>
      </Card>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } = MapComponents

  return (
    <Card className="overflow-hidden">
      {/* Draw toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        {onSelectMany && (
          <Button
            variant={drawMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleDraw}
            className={drawMode ? 'bg-[#006AFF] hover:bg-[#0058D4] text-white' : ''}
          >
            <PenTool className="mr-1 h-3.5 w-3.5" />
            {drawMode ? 'Drawing...' : 'Draw area'}
          </Button>
        )}

        {drawMode && (
          <>
            <span className="text-xs text-muted-foreground">
              {polygonPoints.length === 0
                ? 'Click on map to start drawing'
                : `${polygonPoints.length} point${polygonPoints.length === 1 ? '' : 's'} placed`}
            </span>

            {polygonPoints.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleUndoPoint}>
                Undo
              </Button>
            )}

            {polygonPoints.length >= 3 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleFinishPolygon}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Select in area
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={handleCancelDraw}>
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
          </>
        )}

        {!drawMode && onSelectMany && (
          <span className="text-xs text-muted-foreground ml-1">
            Click pins to toggle, or draw an area to select multiple
          </span>
        )}
      </div>

      <div className={`h-[500px] ${drawMode ? 'cursor-crosshair' : ''}`}>
        <MapContainer
          key={mapKeyRef.current}
          center={[center.lat, center.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler drawMode={drawMode} onMapClick={handleMapClick} />

          {mappableProperties.map(prop => {
            const isSelected = selectedIds.has(prop.id)
            const icon = createMarkerIcon(isSelected)
            return (
              <Marker
                key={prop.id}
                position={[prop.latitude!, prop.longitude!]}
                icon={icon}
                eventHandlers={drawMode ? {} : {
                  click: () => onToggleSelect(prop.id),
                }}
              >
                {!drawMode && (
                  <Popup>
                    <div className="text-sm">
                      <strong>{prop.owner_first_name} {prop.owner_last_name}</strong>
                      <br />
                      {prop.address_line1}, {prop.city}
                      <br />
                      {prop.estimated_value && `$${prop.estimated_value.toLocaleString()}`}
                      {prop.bedrooms && ` ${prop.bedrooms} bed`}
                      {prop.sqft && ` ${prop.sqft.toLocaleString()} sqft`}
                      <br />
                      <button
                        onClick={() => onToggleSelect(prop.id)}
                        className="mt-1 text-xs text-blue-600 underline"
                      >
                        {isSelected ? 'Deselect' : 'Select'}
                      </button>
                    </div>
                  </Popup>
                )}
              </Marker>
            )
          })}

          {/* Completed polygon (3+ points in draw mode) */}
          {drawMode && polygonPoints.length >= 3 && (
            <Polygon
              positions={polygonPoints}
              pathOptions={{
                color: '#006AFF',
                fillColor: '#006AFF',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '6 4',
              }}
            />
          )}

          {/* In-progress polyline (less than 3 points, or showing edge of polygon) */}
          {drawMode && polygonPoints.length >= 1 && polygonPoints.length < 3 && (
            <Polyline
              positions={polygonPoints}
              pathOptions={{
                color: '#006AFF',
                weight: 2,
                dashArray: '6 4',
              }}
            />
          )}
        </MapContainer>
      </div>
    </Card>
  )
}
