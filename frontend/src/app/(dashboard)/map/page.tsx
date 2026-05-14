'use client'

// ============================================================
// File: frontend/src/app/(dashboard)/map/page.tsx
// Campus Map page using the actual PLSP school map image.
// Shows all items pinned on the real campus layout.
// ============================================================

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Loader2, X, Package } from 'lucide-react'
import { mapApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { MapItem } from '@/components/map/LeafletMap'

// Dynamic import — Leaflet only runs in the browser
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Loading campus map...</p>
      </div>
    </div>
  ),
})

const STATUS_FILTERS = [
  { value: '',      label: 'All Items', color: 'bg-gray-700'   },
  { value: 'lost',  label: '🔴 Lost',   color: 'bg-red-500'    },
  { value: 'found', label: '🟢 Found',  color: 'bg-green-500'  },
]

export default function MapPage() {
  const [mapItems, setMapItems]   = useState<MapItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('')
  const [selected, setSelected]   = useState<MapItem | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await mapApi.getItems()
        setMapItems((res.data as any).data || [])
      } catch {
        setMapItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filter ? mapItems.filter(i => i.status === filter) : mapItems

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            PLSP Campus — {filtered.length} item{filtered.length !== 1 ? 's' : ''} pinned
          </p>
        </div>

        {/* Filter buttons */}
        <div className="sm:ml-auto flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                filter === f.value
                  ? `${f.color} text-white`
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map + Detail Panel */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Map Container */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative bg-gray-100">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <LeafletMap
              items={filtered}
              onSelectItem={setSelected}
              selectedItem={selected}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-lg px-3 py-2.5 text-xs space-y-1.5">
            <p className="font-bold text-gray-700 mb-1">Legend</p>
            {[
              { color: 'bg-red-500',    label: 'Lost item'  },
              { color: 'bg-green-500',  label: 'Found item' },
              { color: 'bg-blue-500',   label: 'Claimed'    },
              { color: 'bg-purple-500', label: 'Resolved'   },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                {label}
              </div>
            ))}
          </div>

          {/* Hint overlay */}
          {!loading && filtered.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-6 text-center max-w-xs">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium text-sm">No items pinned yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Items reported with a map location will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selected Item Detail Panel */}
        {selected && (
          <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
            {/* Photo */}
            <div className="h-40 bg-gray-100 relative overflow-hidden flex-shrink-0">
              {selected.photo_url ? (
                <img
                  src={`http://localhost:8080${selected.photo_url}`}
                  alt={selected.item_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-300" />
                </div>
              )}
              {/* Close button */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
              {/* Status badge */}
              <span className={cn(
                'absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-xs font-semibold capitalize',
                selected.status === 'lost'     ? 'bg-red-500 text-white'    :
                selected.status === 'found'    ? 'bg-green-500 text-white'  :
                selected.status === 'claimed'  ? 'bg-blue-500 text-white'   :
                selected.status === 'resolved' ? 'bg-purple-500 text-white' :
                'bg-gray-500 text-white'
              )}>
                {selected.status}
              </span>
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <h3 className="font-bold text-gray-900">{selected.item_name}</h3>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0 text-xs">Category</span>
                  <span className="text-gray-700 font-medium text-xs">{selected.category}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0 text-xs">Location</span>
                  <span className="text-gray-700 font-medium text-xs">{selected.location}</span>
                </div>
                {selected.label && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0 text-xs">Pin label</span>
                    <span className="text-gray-700 font-medium text-xs">{selected.label}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0 text-xs">Map pin</span>
                  <span className="text-gray-600 font-mono text-xs">
                    ({Math.round(selected.longitude)}, {Math.round(selected.latitude)})
                  </span>
                </div>
              </div>

              <Link
                href={`/items/${selected.item_id}`}
                className="mt-auto w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
              >
                View Full Details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
