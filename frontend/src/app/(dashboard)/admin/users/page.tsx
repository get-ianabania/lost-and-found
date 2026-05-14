// ============================================================
// File: frontend/src/app/(dashboard)/admin/users/page.tsx
// Admin user management: view, search, change roles, deactivate.
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import { Search, UserCheck, UserX, Shield, Loader2, ChevronDown } from 'lucide-react'
import { adminApi, User } from '@/lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const ROLES = ['student', 'staff', 'finder', 'owner', 'admin']

const roleColors: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  staff:   'bg-purple-100 text-purple-700',
  finder:  'bg-green-100 text-green-700',
  owner:   'bg-orange-100 text-orange-700',
  admin:   'bg-red-100 text-red-700',
}

// ── Role Dropdown ───────────────────────────────────────
function RoleDropdown({ user, onUpdate }: { user: User; onUpdate: () => void }) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)

  const changeRole = async (role: string) => {
    if (role === user.role) { setOpen(false); return }
    setLoading(true)
    try {
      await adminApi.updateUserRole(user.user_id, role)
      toast.success(`Role changed to ${role}`)
      onUpdate()
    } catch {
      toast.error('Failed to update role')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors',
          roleColors[user.role] || 'bg-gray-100 text-gray-700'
        )}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : user.role}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[120px]">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => changeRole(r)}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs font-medium capitalize hover:bg-gray-50 transition-colors',
                  r === user.role ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<User[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers()
      setUsers(res.data.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleStatus = async (user: User) => {
    setToggling(user.user_id)
    try {
      // Note: adminApi.updateUserRole is used; add toggleStatus to adminApi if needed
      // For now call it directly
      await fetch(`http://localhost:8080/api/v1/admin/users/${user.user_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
      fetchUsers()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setToggling(null)
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.student_id?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or student ID..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['User', 'ID', 'Department', 'Role', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-semibold text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm whitespace-nowrap">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {user.student_id || '—'}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                      {user.department || '—'}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleDropdown user={user} onUpdate={fetchUsers} />
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(user)}
                        disabled={toggling === user.user_id}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          user.is_active
                            ? 'bg-red-50 hover:bg-red-100 text-red-600'
                            : 'bg-green-50 hover:bg-green-100 text-green-600'
                        )}
                      >
                        {toggling === user.user_id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : user.is_active
                            ? <><UserX className="w-3.5 h-3.5" />Deactivate</>
                            : <><UserCheck className="w-3.5 h-3.5" />Activate</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
