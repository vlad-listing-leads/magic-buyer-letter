'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { MblProperty } from '@/types'

interface PropertyMapProps {
  properties: MblProperty[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}

export function PropertyMap({ properties, selectedIds, onToggleSelect }: PropertyMapProps) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: React.ComponentType<Record<string, unknown>>
    TileLayer: React.ComponentType<Record<string, unknown>>
    Marker: React.ComponentType<Record<string, unknown>>
    Popup: React.ComponentType<{ children: React.ReactNode }>
  } | null>(null)

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

      setMapComponents({
        MapContainer: rl.MapContainer as unknown as React.ComponentType<Record<string, unknown>>,
        TileLayer: rl.TileLayer as unknown as React.ComponentType<Record<string, unknown>>,
        Marker: rl.Marker as unknown as React.ComponentType<Record<string, unknown>>,
        Popup: rl.Popup as unknown as React.ComponentType<{ children: React.ReactNode }>,
      })
    })
  }, [])

  const mappableProperties = properties.filter(p => p.latitude && p.longitude)

  if (mappableProperties.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          No properties with coordinates to display
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

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents

  return (
    <Card className="overflow-hidden">
      <div className="h-[500px]">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappableProperties.map(prop => (
            <Marker
              key={prop.id}
              position={[prop.latitude!, prop.longitude!]}
              eventHandlers={{
                click: () => onToggleSelect(prop.id),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{prop.owner_first_name} {prop.owner_last_name}</strong>
                  <br />
                  {prop.address_line1}, {prop.city}
                  <br />
                  {prop.estimated_value && `$${prop.estimated_value.toLocaleString()}`}
                  {prop.bedrooms && ` · ${prop.bedrooms} bed`}
                  {prop.sqft && ` · ${prop.sqft.toLocaleString()} sqft`}
                  <br />
                  <button
                    onClick={() => onToggleSelect(prop.id)}
                    className="mt-1 text-xs text-blue-600 underline"
                  >
                    {selectedIds.has(prop.id) ? 'Deselect' : 'Select'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </Card>
  )
}
