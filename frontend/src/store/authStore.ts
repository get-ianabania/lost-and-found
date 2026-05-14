// ============================================================
// File: frontend/src/store/authStore.ts
// Zustand store for authentication state.
//
// Zustand is a lightweight state manager for React.
// This store persists the user and token across page refreshes.
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  // persist saves state to localStorage automatically
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        // Also store token in localStorage for Axios interceptor
        localStorage.setItem('auth_token', token)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: (updatedFields) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        }))
      },
    }),
    {
      name: 'plsp-auth', // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// ──────────────────────────────────────────────────────────
// Helper hook: check if user has a specific role
// Usage: const isAdmin = useIsAdmin()
// ──────────────────────────────────────────────────────────
export const useIsAdmin = () => {
  const role = useAuthStore((state) => state.user?.role)
  return role === 'admin' || role === 'staff'
}

export const useCurrentUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
