// ============================================================
// File: frontend/src/app/page.tsx
// Root page — redirects to /dashboard if logged in, or /login.
// ============================================================

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAuthenticated, useCurrentUser } from '@/store/authStore'
import { PackageSearch } from 'lucide-react'

export default function RootPage() {
  const router          = useRouter()
  const isAuthenticated = useIsAuthenticated()
  const user            = useCurrentUser()

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect admins to admin panel, students to dashboard
      const target = (user.role === 'admin' || user.role === 'staff') ? '/admin' : '/dashboard'
      router.replace(target)
    } else {
      router.replace('/login')
    }
  }, [isAuthenticated, user, router])

  // Loading screen while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
        <PackageSearch className="w-8 h-8 text-white" />
      </div>
      <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
