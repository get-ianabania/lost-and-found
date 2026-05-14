// ============================================================
// File: frontend/src/app/(dashboard)/messages/page.tsx
// In-app messaging between users.
// Left panel: conversation list. Right panel: chat window.
// ============================================================

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, MessageSquare, Loader2, ArrowLeft } from 'lucide-react'
import { messagesApi } from '@/lib/api'
import { useCurrentUser } from '@/store/authStore'
import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Conversation {
  user_id: number
  name: string
  avatar_url: string
  last_message: string
  last_time: string
  unread_count: number
}

interface Message {
  message_id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  timestamp: string
  item_id?: number
}

// ── Format timestamp nicely ─────────────────────────────
function formatTime(ts: string) {
  const date = new Date(ts)
  if (isToday(date))     return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

// ── Avatar ──────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={cn('rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 flex-shrink-0', sizes[size])}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

// ── Conversation List Item ──────────────────────────────
function ConvItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
        isActive && 'bg-blue-50 hover:bg-blue-50'
      )}
    >
      <Avatar name={conv.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-sm truncate', conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800')}>
            {conv.name}
          </p>
          <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.last_time)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn('text-xs truncate', conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
            {conv.last_message}
          </p>
          {conv.unread_count > 0 && (
            <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Chat Bubble ─────────────────────────────────────────
function ChatBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={cn('flex gap-2 max-w-[80%]', isMine ? 'ml-auto flex-row-reverse' : '')}>
      <div
        className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isMine
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
        )}
      >
        {msg.content}
      </div>
      <span className="text-xs text-gray-400 self-end flex-shrink-0 pb-0.5">
        {format(new Date(msg.timestamp), 'h:mm a')}
      </span>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function MessagesPage() {
  const currentUser = useCurrentUser()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv]       = useState<Conversation | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [newMessage, setNewMessage]       = useState('')
  const [loadingConvs, setLoadingConvs]   = useState(true)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [sending, setSending]             = useState(false)
  const [showChat, setShowChat]           = useState(false) // mobile toggle

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const pollRef      = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await messagesApi.getConversations()
      setConversations((res.data as any).data || [])
    } catch {
      setConversations([])
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (userId: number) => {
    setLoadingMsgs(true)
    try {
      const res = await messagesApi.getConversation(userId)
      setMessages((res.data as any).data || [])
      setTimeout(scrollToBottom, 100)
    } catch {
      setMessages([])
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // Open a conversation
  const openConversation = (conv: Conversation) => {
    setActiveConv(conv)
    setShowChat(true)
    fetchMessages(conv.user_id)
    // Mark as read
    setConversations(prev =>
      prev.map(c => c.user_id === conv.user_id ? { ...c, unread_count: 0 } : c)
    )
    inputRef.current?.focus()
  }

  // Poll for new messages every 5 seconds
  useEffect(() => {
    fetchConversations()
    pollRef.current = setInterval(() => {
      fetchConversations()
      if (activeConv) fetchMessages(activeConv.user_id)
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchConversations, fetchMessages, activeConv])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConv || sending) return

    const content = newMessage.trim()
    setNewMessage('')
    setSending(true)

    // Optimistic update — show message immediately
    const optimistic: Message = {
      message_id: Date.now(),
      sender_id:  currentUser!.user_id,
      receiver_id: activeConv.user_id,
      content,
      is_read:    false,
      timestamp:  new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(scrollToBottom, 50)

    try {
      await messagesApi.send({ receiver_id: activeConv.user_id, content })
      fetchConversations() // refresh unread counts
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => m.message_id !== optimistic.message_id))
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const date = format(new Date(msg.timestamp), 'MMMM d, yyyy')
    const last = acc[acc.length - 1]
    if (last?.date === date) {
      last.msgs.push(msg)
    } else {
      acc.push({ date, msgs: [msg] })
    }
    return acc
  }, [])

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-gray-100 bg-white">

      {/* ── LEFT: Conversation List ──────────────────── */}
      <div className={cn(
        'w-full sm:w-72 lg:w-80 border-r border-gray-100 flex flex-col flex-shrink-0',
        showChat ? 'hidden sm:flex' : 'flex'
      )}>
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Message someone from an item&apos;s detail page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {conversations.map((conv) => (
                <ConvItem
                  key={conv.user_id}
                  conv={conv}
                  isActive={activeConv?.user_id === conv.user_id}
                  onClick={() => openConversation(conv)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Window ────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        !showChat ? 'hidden sm:flex' : 'flex'
      )}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <button
                onClick={() => setShowChat(false)}
                className="sm:hidden p-1 hover:bg-gray-100 rounded-lg mr-1"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <Avatar name={activeConv.name} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{activeConv.name}</p>
                <p className="text-xs text-green-500">Active</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/30">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-gray-400 text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                groupedMessages.map(({ date, msgs }) => (
                  <div key={date}>
                    {/* Date divider */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium px-2">{date}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="space-y-2">
                      {msgs.map((msg) => (
                        <ChatBubble
                          key={msg.message_id}
                          msg={msg}
                          isMine={msg.sender_id === currentUser?.user_id}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-white"
            >
              <input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </form>
          </>
        ) : (
          /* Empty state — no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-700 text-lg">Your Messages</h3>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Select a conversation from the left to start chatting, or message someone from an item&apos;s detail page.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
