// ============================================================
// File: frontend/src/app/(dashboard)/admin/page.tsx
// Admin home dashboard with summary stats and quick actions.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package, Users, FileCheck, AlertTriangle,
  TrendingUp, Clock, CheckCircle, XCircle, ArrowRight
} from 'lucide-react'
import { adminApi, claimsApi, Claim } from '@/lib/api'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444']

interface Stats {
  total_items: number
  lost_items: number
  found_items: number
  claimed_items: number
  resolved_items: number
  total_users: number
  pending_claims: number
  total_claims: number
}

// ── Stat Card ───────────────────────────────────────────
function AdminStatCard({
  title, value, icon: Icon, color, change, href
}: {
  title: string; value: number | string; icon: any
  color: string; change?: string; href?: string
}) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-500 mt-0.5">{title}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function AdminDashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [catData, setCatData] = useState<{ category: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, claimsRes, catRes] = await Promise.all([
          adminApi.getAnalytics(),
          adminApi.getClaims('pending'),
          fetch('http://localhost:8080/api/v1/analytics/by-category', {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
          }).then(r => r.json()),
        ])
        setStats(statsRes.data)
        setClaims(claimsRes.data.data?.slice(0, 5) || [])
        setCatData(catRes.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusChartData = stats ? [
    { name: 'Lost',     value: stats.lost_items     },
    { name: 'Found',    value: stats.found_items     },
    { name: 'Claimed',  value: stats.claimed_items   },
    { name: 'Resolved', value: stats.resolved_items  },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — System Overview
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard title="Total Items"    value={stats?.total_items    ?? '…'} icon={Package}    color="bg-blue-100 text-blue-600"   href="/admin/items" />
        <AdminStatCard title="Registered Users" value={stats?.total_users  ?? '…'} icon={Users}      color="bg-purple-100 text-purple-600" href="/admin/users" />
        <AdminStatCard title="Pending Claims" value={stats?.pending_claims ?? '…'} icon={Clock}      color="bg-yellow-100 text-yellow-600" href="/admin/claims" />
        <AdminStatCard title="Resolved Cases" value={stats?.resolved_items ?? '…'} icon={CheckCircle} color="bg-green-100 text-green-600" />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard title="Lost Reports"  value={stats?.lost_items    ?? '…'} icon={AlertTriangle} color="bg-red-100 text-red-600"    />
        <AdminStatCard title="Found Reports" value={stats?.found_items   ?? '…'} icon={Package}       color="bg-green-100 text-green-600" />
        <AdminStatCard title="Claimed Items" value={stats?.claimed_items ?? '…'} icon={FileCheck}     color="bg-blue-100 text-blue-600"   />
        <AdminStatCard title="Total Claims"  value={stats?.total_claims  ?? '…'} icon={TrendingUp}    color="bg-indigo-100 text-indigo-600" href="/admin/claims" />
      </div>

      {/* Charts + Pending Claims */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Items by Category</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              {loading ? 'Loading chart...' : 'No data yet'}
            </div>
          )}
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Item Status Distribution</h3>
          {statusChartData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {statusChartData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              {loading ? 'Loading chart...' : 'No data yet'}
            </div>
          )}
        </div>
      </div>

      {/* Pending Claims Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">
            Pending Claims
            {claims.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {claims.length}
              </span>
            )}
          </h3>
          <Link href="/admin/claims" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {claims.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No pending claims — all caught up! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {claims.map((claim) => (
              <div key={claim.claim_id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {claim.item?.name || `Item #${claim.item_id}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Claimed by {claim.claimant?.name || `User #${claim.user_id}`}
                    {' · '}{format(new Date(claim.claim_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Link
                  href={`/admin/claims?highlight=${claim.claim_id}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Review Claims',  href: '/admin/claims',    emoji: '📋', bg: 'bg-yellow-50 hover:bg-yellow-100', text: 'text-yellow-800' },
          { label: 'Manage Users',   href: '/admin/users',     emoji: '👥', bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-800' },
          { label: 'View Analytics', href: '/admin/analytics', emoji: '📊', bg: 'bg-blue-50   hover:bg-blue-100',   text: 'text-blue-800'   },
          { label: 'Audit Trail',    href: '/admin/audit',     emoji: '🛡️', bg: 'bg-gray-50   hover:bg-gray-100',   text: 'text-gray-800'   },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className={`${a.bg} ${a.text} rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors text-center`}>
            <span className="text-2xl">{a.emoji}</span>
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
