// ============================================================
// File: frontend/src/lib/api.ts
// Axios configuration for calling your Go backend.
//
// This creates a pre-configured Axios instance that:
// 1. Points to your backend URL
// 2. Automatically adds the JWT token to every request
// 3. Handles token expiration (redirects to login)
// ============================================================

import axios from 'axios'

// The base URL of your Go backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

// Create a custom Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// ──────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// Runs before every API call — adds the JWT token
// ──────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (where we store it after login)
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ──────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// Runs after every API response — handles errors globally
// ──────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response, // pass through successful responses
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — log user out
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ──────────────────────────────────────────────────────────
// Typed API functions
// These are the functions your components will call.
// ──────────────────────────────────────────────────────────

// AUTH
export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post<LoginResponse>('/auth/login', data),
  getMe: () => api.get<User>('/users/me'),
}

// ITEMS
export const itemsApi = {
  getAll: (params?: ItemFilters) => api.get<PaginatedItems>('/items', { params }),
  getMine: () => api.get<{ data: Item[] }>('/items/mine'),
  getOne: (id: number) => api.get<Item>(`/items/${id}`),
  create: (data: CreateItemData) => api.post<Item>('/items', data),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/items/${id}/status`, { status, note }),
  uploadPhotos: (id: number, formData: FormData) =>
    api.post(`/items/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/items/${id}`),
  addQuiz: (id: number, questions: QuizQuestion[]) =>
    api.post(`/items/${id}/quiz`, { questions }),
}

// CLAIMS
export const claimsApi = {
  submit: (data: { item_id: number; note: string }) => api.post('/claims', data),
  getMine: () => api.get<{ data: Claim[] }>('/claims/mine'),
  submitQuiz: (claimId: number, answers: QuizAnswer[]) =>
    api.post(`/claims/${claimId}/quiz`, { answers }),
}

// ADMIN
export const adminApi = {
  getUsers: () => api.get<{ data: User[] }>('/admin/users'),
  updateUserRole: (id: number, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  getClaims: (status?: string) =>
    api.get<{ data: Claim[] }>('/admin/claims', { params: { status } }),
  makeDecision: (claimId: number, decision: string, note: string) =>
    api.post(`/admin/claims/${claimId}/decision`, { decision, decision_note: note }),
  getAuditTrail: () => api.get('/admin/audit-trail'),
  getAnalytics: () => api.get('/admin/analytics'),
}

// MESSAGES
export const messagesApi = {
  send: (data: { receiver_id: number; content: string; item_id?: number }) =>
    api.post('/messages', data),
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId: number) => api.get(`/messages/${userId}`),
  markRead: (id: number) => api.patch(`/messages/${id}/read`),
}

// NOTIFICATIONS
export const notificationsApi = {
  getAll: () => api.get<{ data: Notification[] }>('/notifications'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

// ANALYTICS
export const analyticsApi = {
  getHotspots: () => api.get('/analytics/hotspots'),
  getSummary: () => api.get('/analytics/summary'),
  getByCategory: () => api.get('/analytics/by-category'),
}

// MAP
export const mapApi = {
  getItems: () => api.get('/map'),
}

// ──────────────────────────────────────────────────────────
// TypeScript Types
// ──────────────────────────────────────────────────────────

export interface User {
  user_id: number
  name: string
  email: string
  role: 'student' | 'staff' | 'finder' | 'owner' | 'admin'
  student_id: string
  department: string
  phone: string
  avatar_url: string
  is_active: boolean
  created_at: string
}

export interface Item {
  item_id: number
  user_id: number
  name: string
  description: string
  category: string
  status: 'lost' | 'found' | 'claimed' | 'resolved' | 'archived'
  location: string
  date_reported: string
  date_lost_found: string
  is_archived: boolean
  reporter?: User
  photos?: Photo[]
}

export interface Photo {
  photo_id: number
  item_id: number
  file_path: string
  file_name: string
}

export interface Claim {
  claim_id: number
  item_id: number
  user_id: number
  claim_date: string
  status: 'pending' | 'approved' | 'rejected'
  note: string
  item?: Item
  claimant?: User
}

export interface Notification {
  notification_id: number
  user_id: number
  type: 'email' | 'sms' | 'in_app'
  title: string
  message: string
  is_read: boolean
  sent_at: string
}

export interface PaginatedItems {
  data: Item[]
  meta: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export interface ItemFilters {
  search?: string
  status?: string
  category?: string
  location?: string
  page?: number
  limit?: number
}

export interface RegisterData {
  name: string
  email: string
  password: string
  student_id?: string
  department?: string
  phone?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface CreateItemData {
  name: string
  description: string
  category: string
  status: 'lost' | 'found'
  location: string
  date_lost_found?: string
  latitude?: number
  longitude?: number
}

export interface QuizQuestion {
  question: string
  answer: string
}

export interface QuizAnswer {
  quiz_id: number
  answer_given: string
}
