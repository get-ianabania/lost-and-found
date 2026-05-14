// ============================================================
// File: frontend/src/components/layout/DashboardLayout.tsx
// The main layout wrapper for all authenticated pages.
// Contains the sidebar, top navbar, and notification system.
// ============================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  PackageSearch,
  Plus,
  FileCheck,
  MessageSquare,
  Bell,
  Map,
  BarChart3,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore, useIsAdmin, useCurrentUser } from '@/store/authStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ──────────────────────────────────────────────────────────
// Sidebar navigation items
// ──────────────────────────────────────────────────────────
const userNavItems = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard'     },
  { href: '/items',              icon: Search,          label: 'Browse Items'  },
  { href: '/items/report',       icon: Plus,            label: 'Report Item'   },
  { href: '/my-items',           icon: PackageSearch,   label: 'My Reports'    },
  { href: '/my-claims',          icon: FileCheck,       label: 'My Claims'     },
  { href: '/messages',           icon: MessageSquare,   label: 'Messages'      },
  { href: '/map',                icon: Map,             label: 'Campus Map'    },
]

const adminNavItems = [
  { href: '/admin',              icon: ShieldCheck,     label: 'Admin Panel'   },
  { href: '/admin/users',        icon: Users,           label: 'Users'         },
  { href: '/admin/claims',       icon: FileCheck,       label: 'Claims'        },
  { href: '/admin/analytics',    icon: BarChart3,       label: 'Analytics'     },
  { href: '/admin/audit',        icon: ShieldCheck,     label: 'Audit Trail'   },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const user = useCurrentUser()
  const isAdmin = useIsAdmin()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Mobile Overlay ─────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ────────────────────────────────── */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200',
          'flex flex-col transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <PackageSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">PLSP Lost &</p>
            <p className="font-bold text-gray-900 text-sm leading-tight">Found System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Main nav */}
          <div className="space-y-1">
            <p className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Main Menu
            </p>
            {userNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Admin nav */}
          {isAdmin && (
            <div className="mt-6 space-y-1">
              <p className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </p>
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* User profile at bottom */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Page title (auto from breadcrumb) */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
              {getPageTitle(pathname)}
            </h1>
          </div>

          {/* Notification bell */}
          <button
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => router.push('/notifications')}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {/* Unread indicator */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User chip */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-semibold text-xs">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard':        'Dashboard',
    '/items':            'Browse Items',
    '/items/report':     'Report an Item',
    '/my-items':         'My Reports',
    '/my-claims':        'My Claims',
    '/messages':         'Messages',
    '/map':              'Campus Map',
    '/notifications':    'Notifications',
    '/admin':            'Admin Dashboard',
    '/admin/users':      'User Management',
    '/admin/claims':     'Claim Reviews',
    '/admin/analytics':  'Analytics',
    '/admin/audit':      'Audit Trail',
  }
  return map[pathname] || 'PLSP Lost & Found'
}
