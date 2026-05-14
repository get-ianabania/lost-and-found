// ============================================================
// File: frontend/src/app/(dashboard)/dashboard/page.tsx
// The home page after login — shows statistics and recent items.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PackageSearch, PackagePlus, CheckCircle, Clock, Plus, ArrowRight } from 'lucide-react'
import { itemsApi, claimsApi, Item, Claim } from '@/lib/api'
import { useCurrentUser } from '@/store/authStore'
import { format } from 'date-fns'

// ── Status Badge Component ──────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    lost:     'bg-red-100 text-red-700',
    found:    'bg-green-100 text-green-700',
    claimed:  'bg-yellow-100 text-yellow-700',
    resolved: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-600',
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ── Stat Card Component ─────────────────────────────────
function StatCard({
  title, value, icon: Icon, color, href
}: {
  title: string
  value: number | string
  icon: any
  color: string
  href?: string
}) {
  const card = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )

  if (href) return <Link href={href}>{card}</Link>
  return card
}

export default function DashboardPage() {
  const user = useCurrentUser()
  const [myItems, setMyItems] = useState<Item[]>([])
  const [myClaims, setMyClaims] = useState<Claim[]>([])
  const [recentItems, setRecentItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [myItemsRes, myClaimsRes, recentRes] = await Promise.all([
          itemsApi.getMine(),
          claimsApi.getMine(),
          itemsApi.getAll({ limit: 5, status: 'found' }),
        ])
        setMyItems(myItemsRes.data.data || [])
        setMyClaims(myClaimsRes.data.data || [])
        setRecentItems(recentRes.data.data || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const lostCount    = myItems.filter(i => i.status === 'lost').length
  const foundCount   = myItems.filter(i => i.status === 'found').length
  const pendingClaims = myClaims.filter(c => c.status === 'pending').length
  const approvedClaims = myClaims.filter(c => c.status === 'approved').length

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-blue-100 mt-1">
          Here&apos;s what&apos;s happening with your lost and found reports.
        </p>
        <Link
          href="/items/report"
          className="mt-4 inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report an Item
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Lost Items"
          value={lostCount}
          icon={PackageSearch}
          color="bg-red-100 text-red-600"
          href="/my-items?status=lost"
        />
        <StatCard
          title="Items I Found"
          value={foundCount}
          icon={PackagePlus}
          color="bg-green-100 text-green-600"
          href="/my-items?status=found"
        />
        <StatCard
          title="Pending Claims"
          value={pendingClaims}
          icon={Clock}
          color="bg-yellow-100 text-yellow-600"
          href="/my-claims?status=pending"
        />
        <StatCard
          title="Approved Claims"
          value={approvedClaims}
          icon={CheckCircle}
          color="bg-blue-100 text-blue-600"
          href="/my-claims?status=approved"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Found Items */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Recently Found Items</h3>
            <Link href="/items?status=found" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : recentItems.length === 0 ? (
              <div className="p-6 text-center">
                <PackageSearch className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No found items yet</p>
              </div>
            ) : (
              recentItems.map((item) => (
                <Link
                  key={item.item_id}
                  href={`/items/${item.item_id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Photo thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                    {item.photos?.[0] ? (
                      <img
                        src={`http://localhost:8080${item.photos[0].file_path}`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PackageSearch className="w-6 h-6 text-gray-300 m-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 truncate">{item.location}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={item.status} />
                    <span className="text-xs text-gray-400">
                      {format(new Date(item.date_reported), 'MMM d')}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* My Claims Status */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">My Claims</h3>
            <Link href="/my-claims" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : myClaims.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No claims submitted yet</p>
                <Link href="/items?status=found" className="text-blue-600 text-sm hover:underline mt-1 block">
                  Browse found items →
                </Link>
              </div>
            ) : (
              myClaims.slice(0, 5).map((claim) => (
                <div key={claim.claim_id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {claim.item?.name || `Item #${claim.item_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Claimed {format(new Date(claim.claim_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Report Lost', href: '/items/report?type=lost',  emoji: '🔍', bg: 'bg-red-50',    text: 'text-red-700'    },
          { label: 'Report Found', href: '/items/report?type=found', emoji: '📦', bg: 'bg-green-50',  text: 'text-green-700'  },
          { label: 'Browse Items', href: '/items',                   emoji: '🗂️', bg: 'bg-blue-50',   text: 'text-blue-700'   },
          { label: 'View Map',     href: '/map',                     emoji: '🗺️', bg: 'bg-purple-50', text: 'text-purple-700' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`${action.bg} ${action.text} rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity text-center`}
          >
            <span className="text-2xl">{action.emoji}</span>
            <span className="text-sm font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
