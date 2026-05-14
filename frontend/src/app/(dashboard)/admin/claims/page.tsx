// ============================================================
// File: frontend/src/app/(dashboard)/admin/claims/page.tsx
// Admin reviews pending claims: approve, reject, or request info.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { adminApi, Claim } from '@/lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'pending',  label: 'Pending',  color: 'text-yellow-600 bg-yellow-50' },
  { value: 'approved', label: 'Approved', color: 'text-green-600  bg-green-50'  },
  { value: 'rejected', label: 'Rejected', color: 'text-red-600    bg-red-50'    },
  { value: '',         label: 'All',      color: 'text-gray-600   bg-gray-50'   },
]

// ── Claim Row ───────────────────────────────────────────
function ClaimRow({ claim, onDecision }: { claim: Claim; onDecision: () => void }) {
  const [expanded, setExpanded]   = useState(false)
  const [note, setNote]           = useState('')
  const [loading, setLoading]     = useState<string | null>(null)

  const decide = async (decision: string) => {
    setLoading(decision)
    try {
      await adminApi.makeDecision(claim.claim_id, decision, note)
      toast.success(`Claim ${decision} successfully`)
      onDecision()
    } catch {
      toast.error('Failed to process decision')
    } finally {
      setLoading(null)
    }
  }

  const statusBadge: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100  text-green-700',
    rejected: 'bg-red-100    text-red-700',
  }

  const photoUrl = claim.item?.photos?.[0]?.file_path
    ? `http://localhost:8080${claim.item.photos[0].file_path}`
    : null

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Item photo */}
        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
          {photoUrl
            ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {claim.item?.name || `Item #${claim.item_id}`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Claimed by <strong>{claim.claimant?.name || `User #${claim.user_id}`}</strong>
            {claim.claimant?.student_id && ` (${claim.claimant.student_id})`}
            {' · '}{format(new Date(claim.claim_date), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Status */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${statusBadge[claim.status]}`}>
          {claim.status}
        </span>

        {/* Expand chevron */}
        {claim.status === 'pending' && (
          expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                   : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && claim.status === 'pending' && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
          {/* Item details */}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Item</p>
              <p className="font-medium text-gray-900">{claim.item?.name}</p>
              <p className="text-gray-600 text-xs mt-0.5">{claim.item?.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Location</p>
              <p className="font-medium text-gray-900">{claim.item?.location}</p>
            </div>
            {claim.note && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Claimant&apos;s Note</p>
                <p className="text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  "{claim.note}"
                </p>
              </div>
            )}
          </div>

          {/* Decision note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Admin Note (optional — shown to claimant)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a reason for your decision..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => decide('approved')}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {loading === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => decide('rejected')}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {loading === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </button>
            <button
              onClick={() => decide('pending_info')}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Request More Info
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function AdminClaimsPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [claims, setClaims]       = useState<Claim[]>([])
  const [loading, setLoading]     = useState(true)

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getClaims(activeTab)
      setClaims(res.data.data || [])
    } catch {
      setClaims([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClaims() }, [activeTab])

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Claim Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">Review and process item claims from students and staff.</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
              activeTab === tab.value ? tab.color : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No {activeTab || ''} claims found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <ClaimRow key={claim.claim_id} claim={claim} onDecision={fetchClaims} />
          ))}
        </div>
      )}
    </div>
  )
}
