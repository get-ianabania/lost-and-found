// ============================================================
// File: frontend/src/app/(dashboard)/admin/audit/page.tsx
// Shows a chronological log of every important action
// performed in the system for accountability and tracing.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import { Shield, Search, Loader2, RefreshCw } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditLog {
  log_id:      number
  user_id:     number | null
  action:      string
  entity_type: string
  entity_id:   number | null
  ip_address:  string
  timestamp:   string
  user?: { name: string; email: string; role: string }
}

// ── Map action strings to icons and colors ───────────────
function getActionConfig(action: string) {
  const map: Record<string, { emoji: string; color: string }> = {
    USER_REGISTERED:        { emoji: '👤', color: 'bg-blue-100 text-blue-700'   },
    USER_LOGIN:             { emoji: '🔑', color: 'bg-green-100 text-green-700' },
    ITEM_REPORTED:          { emoji: '📦', color: 'bg-purple-100 text-purple-700' },
    ITEM_STATUS_UPDATED:    { emoji: '🔄', color: 'bg-yellow-100 text-yellow-700' },
    ITEM_DELETED:           { emoji: '🗑️', color: 'bg-red-100 text-red-700'     },
    ITEM_ARCHIVED:          { emoji: '📁', color: 'bg-gray-100 text-gray-600'   },
    PHOTOS_UPLOADED:        { emoji: '📷', color: 'bg-indigo-100 text-indigo-700' },
    CLAIM_SUBMITTED:        { emoji: '📋', color: 'bg-orange-100 text-orange-700' },
    QUIZ_ATTEMPTED:         { emoji: '❓', color: 'bg-cyan-100 text-cyan-700'   },
    ADMIN_DECISION_APPROVED:{ emoji: '✅', color: 'bg-green-100 text-green-700' },
    ADMIN_DECISION_REJECTED:{ emoji: '❌', color: 'bg-red-100 text-red-700'     },
    USER_ROLE_UPDATED:      { emoji: '🛡️', color: 'bg-violet-100 text-violet-700' },
    USER_ACTIVATED:         { emoji: '▶️', color: 'bg-green-100 text-green-700' },
    USER_DEACTIVATED:       { emoji: '⏸️', color: 'bg-gray-100 text-gray-600'   },
    MESSAGE_SENT:           { emoji: '💬', color: 'bg-sky-100 text-sky-700'     },
    MAP_COORDINATES_SET:    { emoji: '📍', color: 'bg-teal-100 text-teal-700'   },
  }
  return map[action] || { emoji: '📝', color: 'bg-gray-100 text-gray-600' }
}

// ── Format action string to readable label ───────────────
function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
}

export default function AuditTrailPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]       = useState('')
  const [total, setTotal]         = useState(0)

  const fetchLogs = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await adminApi.getAuditTrail()
      setLogs((res.data as any).data || [])
      setTotal((res.data as any).total || 0)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = search
    ? logs.filter(log =>
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
        log.ip_address?.includes(search)
      )
    : logs

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} total log entries — every important action is recorded here.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by action, user, entity type, or IP..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition bg-white"
        />
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No audit logs yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Actions performed in the system will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((log) => {
              const config = getActionConfig(log.action)
              return (
                <div key={log.log_id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  {/* Action icon */}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5', config.color)}>
                    {config.emoji}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatAction(log.action)}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                          {log.user && (
                            <span>
                              by <strong className="text-gray-700">{log.user.name}</strong>
                              <span className="text-gray-400"> ({log.user.role})</span>
                            </span>
                          )}
                          {log.entity_type && log.entity_id && (
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                              {log.entity_type} #{log.entity_id}
                            </span>
                          )}
                          {log.ip_address && (
                            <span className="text-gray-400 font-mono">{log.ip_address}</span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                        {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>

                  {/* Log ID badge */}
                  <span className="text-xs text-gray-300 font-mono flex-shrink-0 mt-1">
                    #{log.log_id}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Load more hint */}
      {filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          Showing {filtered.length} of {total} log entries. Contact your DBA to export full logs.
        </p>
      )}
    </div>
  )
}
