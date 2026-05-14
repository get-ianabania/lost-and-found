'use client'

// ============================================================
// File: frontend/src/app/(dashboard)/items/report/page.tsx
// Report a lost or found item.
// NEW: Interactive PLSP campus map to drop a pin on location.
// The location dropdown is still there — map pin is optional.
// ============================================================

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, Loader2, MapPin, Map } from 'lucide-react'
import toast from 'react-hot-toast'
import { itemsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

// Dynamic import for Leaflet (no SSR)
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
    </div>
  ),
})

const CATEGORIES = [
  'Electronics', 'Clothing', 'Accessories', 'Books/Documents',
  'Bags', 'Keys', 'Sports Equipment', 'Stationery', 'Wallet/Purse',
  'ID/Cards', 'Umbrella', 'Others',
]

const LOCATIONS = [
  'Main Building', 'Library', 'Gymnasium', 'Cafeteria', 'Parking Area',
  'Admin Office', 'Science Laboratory', 'Computer Laboratory',
  'Quadrangle', 'Entrance Gate', 'Chapel', 'Other',
]

const reportSchema = z.object({
  name:            z.string().min(2, 'Item name must be at least 2 characters'),
  description:     z.string().min(10, 'Please provide more details (at least 10 characters)'),
  category:        z.string().min(1, 'Please select a category'),
  status:          z.enum(['lost', 'found']),
  location:        z.string().min(1, 'Please select a location'),
  date_lost_found: z.string().optional(),
})

type ReportFormData = z.infer<typeof reportSchema>

export default function ReportItemPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const defaultType  = (searchParams.get('type') as 'lost' | 'found') || 'lost'

  const [photos, setPhotos]         = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Map pin state
  const [showMap, setShowMap]       = useState(false)
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: { status: defaultType },
  })

  const selectedStatus = watch('status')

  // ── Photo dropzone ──────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (photos.length + acceptedFiles.length > 5) {
      toast.error('Maximum 5 photos allowed')
      return
    }
    const newPreviews = acceptedFiles.map(f => URL.createObjectURL(f))
    setPhotos(prev => [...prev, ...acceptedFiles])
    setPreviewUrls(prev => [...prev, ...newPreviews])
  }, [photos])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
  })

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Handle pin drop on map ──────────────────────────────
  const handlePinDrop = (lat: number, lng: number) => {
    setDroppedPin({ lat, lng })
    toast.success('📍 Location pinned on map!')
  }

  const clearPin = () => {
    setDroppedPin(null)
    toast('Pin removed', { icon: '🗑️' })
  }

  // ── Form submit ─────────────────────────────────────────
  const onSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true)
    try {
      // Include map coordinates if a pin was dropped
      const itemData = {
        ...data,
        latitude:  droppedPin?.lat,
        longitude: droppedPin?.lng,
      }

      const itemRes = await itemsApi.create(itemData)
      const itemId  = itemRes.data.item_id

      // Upload photos if any
      if (photos.length > 0) {
        const formData = new FormData()
        photos.forEach(p => formData.append('photos', p))
        await itemsApi.uploadPhotos(itemId, formData)
      }

      toast.success(`${data.status === 'lost' ? 'Lost' : 'Found'} item report submitted!`)
      router.push('/my-items')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report an Item</h1>
        <p className="text-gray-500 mt-1">Fill in the details to report a lost or found item.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Lost / Found Toggle ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Item Type *</label>
          <div className="flex gap-3">
            {(['lost', 'found'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setValue('status', type)}
                className={cn(
                  'flex-1 py-3 rounded-xl font-semibold text-sm transition-all',
                  selectedStatus === type
                    ? type === 'lost'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-green-600 text-white shadow-lg shadow-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {type === 'lost' ? '🔍 I Lost Something' : '📦 I Found Something'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Item Details ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Item Details</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name *</label>
            <input
              {...register('name')}
              placeholder="e.g., Black leather wallet, iPhone 13"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
            <select
              {...register('category')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white transition"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe the item — color, brand, markings, contents..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm resize-none transition"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
        </div>

        {/* ── Location & Date ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Where & When</h3>

          {/* Location dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Location *
            </label>
            <select
              {...register('location')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white transition"
            >
              <option value="">Select a location</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date {selectedStatus === 'lost' ? 'Lost' : 'Found'}
            </label>
            <input
              {...register('date_lost_found')}
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition"
            />
          </div>

          {/* ── Campus Map Pin Drop ───────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Pin on Campus Map
                <span className="ml-1.5 text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                  showMap
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Map className="w-3.5 h-3.5" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {/* Pin status indicator */}
            {droppedPin ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Location pinned on campus map ✓
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearPin}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : showMap ? (
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-2">
                👆 Click anywhere on the map to drop a pin at the exact location
              </p>
            ) : null}

            {/* The map */}
            {showMap && (
              <div className="h-72 rounded-xl overflow-hidden border-2 border-blue-200">
                <LeafletMap
                  items={[]}
                  pinDropMode={true}
                  droppedPin={droppedPin}
                  onPinDrop={handlePinDrop}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Photo Upload ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Photos
            <span className="text-gray-400 font-normal text-sm ml-1">(up to 5, optional)</span>
          </h3>

          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {isDragActive ? 'Drop photos here...' : 'Drag & drop photos, or click to select'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 10MB each</p>
          </div>

          {previewUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Submit ──────────────────────────────────── */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Submitting Report...</>
          ) : (
            `Submit ${selectedStatus === 'lost' ? 'Lost' : 'Found'} Item Report`
          )}
        </button>

      </form>
    </div>
  )
}
