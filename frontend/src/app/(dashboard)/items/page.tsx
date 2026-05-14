// ============================================================
// File: frontend/src/app/(dashboard)/items/page.tsx
// Browse all lost and found items with live search + filters.
// ============================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Filter, X, PackageSearch, MapPin, Calendar, Plus } from 'lucide-react'
import { itemsApi, Item } from '@/lib/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  'All', 'Electronics', 'Clothing', 'Accessories', 'Books/Documents',
  'Bags', 'Keys', 'Sports Equipment', 'Stationery', 'Wallet/Purse',
  'ID/Cards', 'Umbrella', 'Others',
]

const STATUSES = [
  { value: '', label: 'All Items' },
  { value: 'lost',     label: '🔍 Lost' },
  { value: 'found',    label: '📦 Found' },
  { value: 'claimed',  label: '⏳ Claimed' },
  { value: 'resolved', label: '✅ Resolved' },
]

// ── Item Card ───────────────────────────────────────────
function ItemCard({ item }: { item: Item }) {
  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    lost:     { label: 'Lost',     bg: 'bg-red-100',    text: 'text-red-700'    },
    found:    { label: 'Found',    bg: 'bg-green-100',  text: 'text-green-700'  },
    claimed:  { label: 'Claimed',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
    resolved: { label: 'Resolved', bg: 'bg-blue-100',   text: 'text-blue-700'   },
    archived: { label: 'Archived', bg: 'bg-gray-100',   text: 'text-gray-600'   },
  }
  const s = statusConfig[item.status] || statusConfig.lost

  const photoUrl = item.photos?.[0]?.file_path
    ? `http://localhost:8080${item.photos[0].file_path}`
    : null

  return (
    <Link href={`/items/${item.item_id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all overflow-hidden group">
        {/* Photo */}
        <div className="h-44 bg-gray-50 overflow-hidden relative">
          {photoUrl ? (
            <img src={photoUrl} alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PackageSearch className="w-12 h-12 text-gray-200" />
            </div>
          )}
          {/* Status badge */}
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold ${s.bg} ${s.text}`}>
            {s.label}
          </span>
          {/* Category */}
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/90 text-gray-600">
            {item.category}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">{item.description}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {item.location}
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(item.date_reported), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Empty State ──────────────────────────────────────────
function EmptyState({ query }: { query: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <PackageSearch className="w-16 h-16 text-gray-200 mb-4" />
      <h3 className="text-lg font-semibold text-gray-400">No items found</h3>
      <p className="text-gray-400 text-sm mt-1">
        {query ? `No results for "${query}"` : 'No items match your filters'}
      </p>
      <Link href="/items/report"
        className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> Report an Item
      </Link>
    </div>
  )
}

export default function ItemsPage() {
  const [items, setItems]           = useState<Item[]>([])
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState('')
  const [category, setCategory]     = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await itemsApi.getAll({
        search:   search || undefined,
        status:   status || undefined,
        category: category === 'All' ? undefined : category || undefined,
        page,
        limit: 12,
      })
      setItems(res.data.data || [])
      setTotalPages(res.data.meta.total_pages)
      setTotal(res.data.meta.total)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [search, status, category, page])

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300) // debounce search
    return () => clearTimeout(timer)
  }, [fetchItems])

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setCategory('')
    setPage(1)
  }

  const hasFilters = search || status || (category && category !== 'All')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Items</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} items found</p>
        </div>
        <Link href="/items/report" className="sm:ml-auto inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Report Item
        </Link>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search items by name or description..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              showFilters || hasFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="pt-2 border-t border-gray-100 space-y-3">
            {/* Status filter */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setStatus(s.value); setPage(1) }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      status === s.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setPage(1) }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      category === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.length === 0
            ? <EmptyState query={search} />
            : items.map((item) => <ItemCard key={item.item_id} item={item} />)
          }
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
