// ============================================================
// File: frontend/src/app/(dashboard)/admin/analytics/page.tsx
// Full analytics page with charts:
// - Summary stats
// - Items by category (bar chart)
// - Status breakdown (pie chart)
// - Hotspot locations table
// - 30-day trend line chart
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import { BarChart3, MapPin, TrendingUp, Package, Loader2 } from 'lucide-react'
import { analyticsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts'

const PIE_COLORS   = ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6']
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

interface Summary {
  total_items:    number
  lost_items:     number
  found_items:    number
  claimed_items:  number
  resolved_items: number
  total_users:    number
  pending_claims: number
  total_claims:   number
}

interface Hotspot {
  hotspot_id:   number
  location:     string
  report_count: number
  last_updated: string
}

// ── Section wrapper ─────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Custom tooltip for charts ────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [catData,  setCatData]  = useState<{ category: string; count: number }[]>([])
  const [trendData, setTrendData] = useState<{ day: string; lost: number; found: number }[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const headers = { Authorization: `Bearer ${token}` }
        const base = 'http://localhost:8080/api/v1'

        const [sumRes, hotRes, catRes, trendRes] = await Promise.all([
          fetch(`${base}/analytics/summary`,    { headers }).then(r => r.json()),
          fetch(`${base}/analytics/hotspots`,   { headers }).then(r => r.json()),
          fetch(`${base}/analytics/by-category`,{ headers }).then(r => r.json()),
          fetch(`${base}/analytics/trends`,     { headers }).then(r => r.json()),
        ])

        setSummary(sumRes)
        setHotspots(hotRes.data || [])
        setCatData(catRes.data  || [])
        setTrendData(trendRes.data || [])
      } catch (e) {
        console.error('Analytics load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusPieData = summary ? [
    { name: 'Lost',     value: summary.lost_items     },
    { name: 'Found',    value: summary.found_items     },
    { name: 'Claimed',  value: summary.claimed_items   },
    { name: 'Resolved', value: summary.resolved_items  },
  ].filter(d => d.value > 0) : []

  const resolvedRate = summary && summary.total_items > 0
    ? Math.round((summary.resolved_items / summary.total_items) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">System-wide statistics and insights.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items',    value: summary?.total_items,    icon: Package,   color: 'bg-blue-100 text-blue-600'   },
          { label: 'Total Users',    value: summary?.total_users,    icon: BarChart3, color: 'bg-purple-100 text-purple-600' },
          { label: 'Total Claims',   value: summary?.total_claims,   icon: TrendingUp,color: 'bg-green-100 text-green-600' },
          { label: 'Resolution Rate',value: `${resolvedRate}%`,      icon: TrendingUp,color: 'bg-orange-100 text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <Section title="Items by Category" subtitle="How many items fall under each category">
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catData} margin={{ top: 0, right: 0, left: -20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Items" radius={[4, 4, 0, 0]}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No category data yet
            </div>
          )}
        </Section>

        {/* Status Pie Chart */}
        <Section title="Status Breakdown" subtitle="Current distribution of item statuses">
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No status data yet
            </div>
          )}
        </Section>
      </div>

      {/* 30-day trend */}
      <Section
        title="30-Day Report Trend"
        subtitle="Daily lost vs found reports over the past month"
      >
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLost"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="colorFound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="lost"  name="Lost"  stroke="#ef4444" fill="url(#colorLost)"  strokeWidth={2} />
              <Area type="monotone" dataKey="found" name="Found" stroke="#22c55e" fill="url(#colorFound)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <TrendingUp className="w-8 h-8 text-gray-200" />
            No trend data yet — reports will appear here over time
          </div>
        )}
      </Section>

      {/* Hotspot Table */}
      <Section
        title="Loss Hotspots"
        subtitle="Locations with the most lost/found item reports"
      >
        {hotspots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <MapPin className="w-8 h-8 text-gray-200" />
            No hotspot data yet
          </div>
        ) : (
          <div className="space-y-2">
            {hotspots.map((spot, i) => {
              const maxCount = hotspots[0].report_count || 1
              const pct      = Math.round((spot.report_count / maxCount) * 100)
              return (
                <div key={spot.hotspot_id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{spot.location}</span>
                      <span className="text-xs font-bold text-gray-600">{spot.report_count} reports</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
