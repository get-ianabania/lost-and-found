// ============================================================
// File: frontend/src/app/(dashboard)/items/[id]/page.tsx
// Shows full item details. Found items show a "Claim" button.
// Handles the claim + quiz verification flow in a modal.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Calendar, User, Tag, MessageSquare, FileCheck, ChevronLeft, Loader2, CheckCircle, X } from 'lucide-react'
import { itemsApi, claimsApi, messagesApi, Item } from '@/lib/api'
import { useCurrentUser } from '@/store/authStore'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// ── Claim Modal ─────────────────────────────────────────
function ClaimModal({
  item,
  onClose,
  onSuccess,
}: {
  item: Item
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep]        = useState<'confirm' | 'quiz' | 'done'>('confirm')
  const [note, setNote]        = useState('')
  const [claimId, setClaimId]  = useState<number | null>(null)
  const [quiz, setQuiz]        = useState<{ quiz_id: number; question: string }[]>([])
  const [answers, setAnswers]  = useState<Record<number, string>>({})
  const [loading, setLoading]  = useState(false)

  const submitClaim = async () => {
    setLoading(true)
    try {
      const res = await claimsApi.submit({ item_id: item.item_id, note })
      setClaimId(res.data.claim.claim_id)
      setQuiz(res.data.quiz || [])
      setStep(res.data.quiz?.length > 0 ? 'quiz' : 'done')
      if (!res.data.quiz?.length) {
        toast.success('Claim submitted! Awaiting admin review.')
        onSuccess()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit claim')
    } finally {
      setLoading(false)
    }
  }

  const submitQuiz = async () => {
    if (!claimId) return
    setLoading(true)
    try {
      const answerList = quiz.map((q) => ({
        quiz_id:      q.quiz_id,
        answer_given: answers[q.quiz_id] || '',
      }))
      const res = await claimsApi.submitQuiz(claimId, answerList)
      setStep('done')
      if (res.data.all_correct) {
        toast.success('All correct! Claim submitted for admin review.')
      } else {
        toast('Some answers were incorrect, but your claim is still submitted.', { icon: 'ℹ️' })
      }
      onSuccess()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit answers')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">
            {step === 'confirm' && 'Claim This Item'}
            {step === 'quiz'    && 'Verification Questions'}
            {step === 'done'    && 'Claim Submitted!'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                You are claiming: <strong>{item.name}</strong>.
                Please provide any additional information to support your claim.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Why is this yours? (optional but helpful)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g., My name is written inside, I had it at the library on Monday..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm resize-none"
                />
              </div>
              <button
                onClick={submitClaim}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : 'Submit Claim'}
              </button>
            </div>
          )}

          {/* Step 2: Quiz */}
          {step === 'quiz' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                ⚠️ Answer these questions to verify ownership. These were set by the finder.
              </p>
              {quiz.map((q, i) => (
                <div key={q.quiz_id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {i + 1}. {q.question}
                  </label>
                  <input
                    value={answers[q.quiz_id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.quiz_id]: e.target.value })}
                    placeholder="Your answer..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  />
                </div>
              ))}
              <button
                onClick={submitQuiz}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : 'Submit Answers'}
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-gray-900">Claim Submitted!</p>
                <p className="text-sm text-gray-500 mt-1">
                  An admin will review your claim. You&apos;ll be notified of the decision.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function ItemDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const currentUser = useCurrentUser()

  const [item, setItem]           = useState<Item | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showClaim, setShowClaim] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await itemsApi.getOne(Number(params.id))
        setItem(res.data)
      } catch {
        toast.error('Item not found')
        router.push('/items')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const sendMessage = async () => {
    if (!item?.reporter) return
    try {
      await messagesApi.send({
        receiver_id: item.user_id,
        item_id:     item.item_id,
        content:     `Hi! I have a question about your item report: "${item.name}"`,
      })
      toast.success('Message sent!')
      router.push('/messages')
    } catch {
      toast.error('Failed to send message')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!item) return null

  const isOwner   = currentUser?.user_id === item.user_id
  const canClaim  = item.status === 'found' && !isOwner

  const statusColors: Record<string, string> = {
    lost:     'bg-red-100 text-red-700',
    found:    'bg-green-100 text-green-700',
    claimed:  'bg-yellow-100 text-yellow-700',
    resolved: 'bg-blue-100 text-blue-700',
  }

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />Back to items
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Photo gallery */}
          {item.photos && item.photos.length > 0 ? (
            <div>
              <div className="h-72 sm:h-96 bg-gray-100 overflow-hidden">
                <img
                  src={`http://localhost:8080${item.photos[activePhoto].file_path}`}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {item.photos.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {item.photos.map((photo, i) => (
                    <button key={photo.photo_id} onClick={() => setActivePhoto(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activePhoto ? 'border-blue-500' : 'border-transparent'}`}>
                      <img src={`http://localhost:8080${photo.file_path}`} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <Tag className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No photos available</p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="p-6 space-y-5">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
                    {item.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5" />Location
                </div>
                <p className="text-sm font-medium text-gray-900">{item.location}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5" />Date Reported
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(item.date_reported), 'MMM d, yyyy')}
                </p>
              </div>
              {item.reporter && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <User className="w-3.5 h-3.5" />Reported by
                  </div>
                  <p className="text-sm font-medium text-gray-900">{item.reporter.name}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {canClaim && (
                <button
                  onClick={() => setShowClaim(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  <FileCheck className="w-5 h-5" />
                  Claim This Item
                </button>
              )}
              {!isOwner && (
                <button
                  onClick={sendMessage}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  Message Reporter
                </button>
              )}
              {isOwner && item.status === 'lost' && (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-center">
                  This is your lost item report. You&apos;ll be notified when someone claims it.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showClaim && item && (
        <ClaimModal
          item={item}
          onClose={() => setShowClaim(false)}
          onSuccess={() => { setShowClaim(false); router.push('/my-claims') }}
        />
      )}
    </>
  )
}
