'use client'

// ============================================================
// File: frontend/src/components/map/LeafletMap.tsx
// Uses the actual PLSP campus map image as the map background.
// Leaflet CRS.Simple is used for image-based maps (no tiles).
// ============================================================

import { useEffect } from 'react'
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// ── Fix Leaflet default marker icons in Next.js ──────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Image dimensions of campus-map.png ───────────────────
// The image is 1320x880. We map it to Leaflet's coordinate space.
const IMG_WIDTH  = 1320
const IMG_HEIGHT = 880

// Leaflet bounds for the image overlay
// [bottom-left, top-right] in [lat, lng] = [y, x]
const BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [IMG_HEIGHT, IMG_WIDTH],
]

// Center of the map
const CENTER: L.LatLngExpression = [IMG_HEIGHT / 2, IMG_WIDTH / 2]

// ── Custom colored marker icons ───────────────────────────
function createColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 26px; height: 26px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize:    [26, 26],
    iconAnchor:  [13, 26],
    popupAnchor: [0, -28],
  })
}

const markerIcons: Record<string, L.DivIcon> = {
  lost:     createColoredIcon('#ef4444'),
  found:    createColoredIcon('#22c55e'),
  claimed:  createColoredIcon('#3b82f6'),
  resolved: createColoredIcon('#8b5cf6'),
  archived: createColoredIcon('#9ca3af'),
}

// ── Click handler for pin-drop mode ──────────────────────
function ClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

// ── Fit map to image bounds on load ──────────────────────
function FitImage() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(BOUNDS)
  }, [map])
  return null
}

// ── Types ─────────────────────────────────────────────────
export interface MapItem {
  map_id:    number
  item_id:   number
  item_name: string
  category:  string
  status:    string
  location:  string
  latitude:  number
  longitude: number
  label:     string
  photo_url: string
}

interface LeafletMapProps {
  items:          MapItem[]
  onSelectItem?:  (item: MapItem) => void
  selectedItem?:  MapItem | null
  // Pin-drop mode (used in Report Item form)
  pinDropMode?:   boolean
  droppedPin?:    { lat: number; lng: number } | null
  onPinDrop?:     (lat: number, lng: number) => void
}

export default function LeafletMap({
  items,
  onSelectItem,
  selectedItem,
  pinDropMode  = false,
  droppedPin,
  onPinDrop,
}: LeafletMapProps) {
  return (
    <MapContainer
      crs={L.CRS.Simple}       // ← Simple CRS for image maps (no real-world coords)
      center={CENTER}
      zoom={-1}
      minZoom={-2}
      maxZoom={2}
      style={{ width: '100%', height: '100%' }}
      className="z-0 rounded-xl"
    >
      {/* The PLSP campus map image as the background */}
      <ImageOverlay url="/campus-map.png" bounds={BOUNDS} />

      {/* Fit image to screen on load */}
      <FitImage />

      {/* Click handler for pin-drop mode */}
      {pinDropMode && onPinDrop && (
        <ClickHandler onMapClick={onPinDrop} />
      )}

      {/* Render existing item pins */}
      {items.map((item) => (
        <Marker
          key={item.map_id}
          position={[item.latitude, item.longitude]}
          icon={markerIcons[item.status] || markerIcons.lost}
          eventHandlers={{
            click: () => onSelectItem && onSelectItem(item),
          }}
        >
          <Popup>
            <div className="min-w-[160px]">
              {item.photo_url && (
                <img
                  src={`http://localhost:8080${item.photo_url}`}
                  alt={item.item_name}
                  className="w-full h-20 object-cover rounded-lg mb-2"
                />
              )}
              <p className="font-bold text-gray-900 text-sm">{item.item_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.category} · {item.location}
              </p>
              <span
                className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-semibold capitalize
                  ${item.status === 'lost'  ? 'bg-red-100 text-red-700'   :
                    item.status === 'found' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'}`}
              >
                {item.status}
              </span>
              <br />
              <a
                href={`/items/${item.item_id}`}
                className="inline-block mt-2 text-xs text-blue-600 hover:underline font-medium"
              >
                View details →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Dropped pin in pin-drop mode */}
      {pinDropMode && droppedPin && (
        <Marker
          position={[droppedPin.lat, droppedPin.lng]}
          icon={createColoredIcon('#f59e0b')}
        >
          <Popup>
            <p className="text-sm font-medium text-gray-800">📍 Selected Location</p>
            <p className="text-xs text-gray-500 mt-0.5">
              x: {Math.round(droppedPin.lng)}, y: {Math.round(droppedPin.lat)}
            </p>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
