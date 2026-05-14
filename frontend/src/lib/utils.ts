// ============================================================
// File: frontend/src/lib/utils.ts
// Utility functions used across the frontend.
// ============================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn() merges Tailwind classes intelligently
// Usage: cn('px-4 py-2', isActive && 'bg-blue-500', 'hover:opacity-80')
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Truncate long text
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Get full photo URL from backend
export function getPhotoUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080'}${path}`
}

// Map item status to display config
export function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    lost:     { label: 'Lost',     bg: 'bg-red-100',    text: 'text-red-700'    },
    found:    { label: 'Found',    bg: 'bg-green-100',  text: 'text-green-700'  },
    claimed:  { label: 'Claimed',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
    resolved: { label: 'Resolved', bg: 'bg-blue-100',   text: 'text-blue-700'   },
    archived: { label: 'Archived', bg: 'bg-gray-100',   text: 'text-gray-500'   },
    pending:  { label: 'Pending',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
    approved: { label: 'Approved', bg: 'bg-green-100',  text: 'text-green-700'  },
    rejected: { label: 'Rejected', bg: 'bg-red-100',    text: 'text-red-700'    },
  }
  return configs[status] || configs.lost
}
