// ============================================================
// File: frontend/src/app/(dashboard)/layout.tsx
// Wraps all dashboard pages with:
// 1. Authentication guard (redirect to login if not logged in)
// 2. The DashboardLayout (sidebar + topbar)
// ============================================================

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAuthenticated } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useIsAuthenticated()
  const router = useRouter()

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // While checking auth, show nothing (avoids flicker)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
