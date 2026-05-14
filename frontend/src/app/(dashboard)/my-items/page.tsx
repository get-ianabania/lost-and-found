// ============================================================
// File: frontend/src/app/(dashboard)/my-items/page.tsx
// Shows all items the logged-in user has reported (lost or found).
// Allows them to update status or delete their reports.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Plus, PackageSearch, MapPin, Calendar,
  Pencil, Trash2, Loader2, ChevronDown, X
} from 'lucide-react'
import { itemsApi, Item } from '@/lib/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['lost', 'found', 'claimed', 'resolved', 'archived']

const statusConfig: Record<string, { bg: string; text: string }> = {
  lost:     { bg: 'bg-red-100',    text: 'text-red-700'    },
  found:    { bg: 'bg-green-100',  text: 'text-green-700'  },
  claimed:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved: { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  archived: { bg: 'bg-gray-100',   text: 'text-gray-500'   },
}

// ── Status Update Dropdown ──────────────────────────────
function StatusDropdown({
  item,
  onUpdated,
}: {
  item: Item
  onUpdated: () => void
}) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const cfg = statusConfig[item.status] || statusConfig.lost

  const update = async (status: string) => {
    if (status === item.status) { setOpen(false); return }
    setLoading(true)
    try {
      await itemsApi.updateStatus(item.item_id, status)
      toast.success(`Status updated to "${status}"`)
      onUpdated()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors',
          cfg.bg, cfg.text
        )}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : item.status}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[130px]">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => update(s)}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs font-medium capitalize hover:bg-gray-50 transition-colors',
                  s === item.status ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Delete Confirm Modal ────────────────────────────────
function DeleteModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: Item
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Delete Report</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <strong>"{item.name}"</strong>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Item Row Card ───────────────────────────────────────
function ItemCard({
  item,
  onRefresh,
}: {
  item: Item
  onRefresh: () => void
}) {
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const photoUrl = item.photos?.[0]?.file_path
    ? `http://localhost:8080${item.photos[0].file_path}`
    : null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await itemsApi.delete(item.item_id)
      toast.success('Report deleted')
      setDeleteTarget(null)
      onRefresh()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden flex gap-4 p-4">
        {/* Photo */}
        <Link href={`/items/${item.item_id}`} className="flex-shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PackageSearch className="w-7 h-7 text-gray-300" />
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/items/${item.item_id}`}>
              <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
                {item.name}
              </h3>
            </Link>
            <StatusDropdown item={item} onUpdated={onRefresh} />
          </div>

          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {item.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(item.date_reported), 'MMM d, yyyy')}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
              {item.category}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link
            href={`/items/${item.item_id}`}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setDeleteTarget(item)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function MyItemsPage() {
  const searchParams    = useSearchParams()
  const defaultStatus   = searchParams.get('status') || ''

  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState(defaultStatus)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await itemsApi.getMine()
      setItems(res.data.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const filtered = filter ? items.filter(i => i.status === filter) : items

  const counts = {
    all:      items.length,
    lost:     items.filter(i => i.status === 'lost').length,
    found:    items.filter(i => i.status === 'found').length,
    claimed:  items.filter(i => i.status === 'claimed').length,
    resolved: items.filter(i => i.status === 'resolved').length,
  }

  const tabs = [
    { value: '',         label: `All (${counts.all})`           },
    { value: 'lost',     label: `🔍 Lost (${counts.lost})`       },
    { value: 'found',    label: `📦 Found (${counts.found})`     },
    { value: 'claimed',  label: `⏳ Claimed (${counts.claimed})` },
    { value: 'resolved', label: `✅ Resolved (${counts.resolved})` },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Items you have reported as lost or found.</p>
        </div>
        <Link
          href="/items/report"
          className="sm:ml-auto inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Report Item
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <PackageSearch className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No reports yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter ? `No "${filter}" items found.` : 'Start by reporting a lost or found item.'}
          </p>
          <Link
            href="/items/report"
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Report an Item
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ItemCard key={item.item_id} item={item} onRefresh={fetchItems} />
          ))}
        </div>
      )}
    </div>
  )
}
