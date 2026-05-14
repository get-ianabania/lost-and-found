// ============================================================
// File: frontend/src/app/(dashboard)/my-claims/page.tsx
// Shows a student's submitted claims and their statuses.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileCheck, PackageSearch, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { claimsApi, Claim } from '@/lib/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; icon: any; bg: string; text: string; border: string }> = {
  pending:  { label: 'Pending Review', icon: Clock,        bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  approved: { label: 'Approved! 🎉',   icon: CheckCircle,  bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200'  },
  rejected: { label: 'Rejected',       icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200'    },
}

function ClaimCard({ claim }: { claim: Claim }) {
  const s = statusConfig[claim.status] || statusConfig.pending
  const Icon = s.icon
  const photoUrl = claim.item?.photos?.[0]?.file_path
    ? `http://localhost:8080${claim.item.photos[0].file_path}`
    : null

  return (
    <div className={cn('bg-white rounded-2xl border overflow-hidden', s.border)}>
      <div className="flex gap-4 p-4">
        {/* Photo */}
        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
          {photoUrl
            ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><PackageSearch className="w-7 h-7 text-gray-300" /></div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {claim.item?.name || `Item #${claim.item_id}`}
            </h3>
            <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0', s.bg, s.text)}>
              <Icon className="w-3 h-3" />{s.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span>{claim.item?.category}</span>
            <span>·</span>
            <span>{claim.item?.location}</span>
            <span>·</span>
            <span>Claimed {format(new Date(claim.claim_date), 'MMM d, yyyy')}</span>
          </div>

          {claim.note && (
            <p className="text-xs text-gray-500 mt-1.5 italic">"{claim.note}"</p>
          )}
        </div>
      </div>

      {/* Status message */}
      <div className={cn('px-4 py-3 border-t text-xs', s.bg, s.border)}>
        {claim.status === 'pending' && (
          <p className={s.text}>⏳ Your claim is under review. An admin will respond soon.</p>
        )}
        {claim.status === 'approved' && (
          <p className={s.text}>✅ Your claim is approved! Please visit the Lost & Found office to retrieve your item.</p>
        )}
        {claim.status === 'rejected' && (
          <p className={s.text}>❌ Your claim was not approved. Contact the admin for more information.</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-50 flex justify-between items-center">
        <span className="text-xs text-gray-400">Claim #{claim.claim_id}</span>
        <Link href={`/items/${claim.item_id}`}
          className="text-xs text-blue-600 hover:underline font-medium">
          View Item →
        </Link>
      </div>
    </div>
  )
}

export default function MyClaimsPage() {
  const [claims, setClaims]   = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await claimsApi.getMine()
        setClaims(res.data.data || [])
      } catch {
        setClaims([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filter ? claims.filter(c => c.status === filter) : claims
  const counts = {
    all:      claims.length,
    pending:  claims.filter(c => c.status === 'pending').length,
    approved: claims.filter(c => c.status === 'approved').length,
    rejected: claims.filter(c => c.status === 'rejected').length,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Claims</h1>
        <p className="text-gray-500 text-sm mt-1">Track the status of items you&apos;ve claimed.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '',         label: `All (${counts.all})`           },
          { value: 'pending',  label: `⏳ Pending (${counts.pending})`  },
          { value: 'approved', label: `✅ Approved (${counts.approved})` },
          { value: 'rejected', label: `❌ Rejected (${counts.rejected})` },
        ].map((tab) => (
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

      {/* Claims list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No claims yet</p>
          <p className="text-gray-400 text-sm mt-1">Find a lost item that belongs to you and submit a claim.</p>
          <Link href="/items?status=found"
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            Browse Found Items
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((claim) => <ClaimCard key={claim.claim_id} claim={claim} />)}
        </div>
      )}
    </div>
  )
}
