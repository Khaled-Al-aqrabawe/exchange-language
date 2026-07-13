import axios from 'axios'

// VITE_API_URL is baked in at build time (e.g. https://api.example.com).
// Falls back to the local Django dev server when unset.
const API_ROOT = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const API_BASE = `${API_ROOT}/api`
export const WS_BASE = API_ROOT.replace(/^http/, 'ws')

const client = axios.create({ baseURL: API_BASE })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue = []

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const hasRefreshToken = localStorage.getItem('refresh_token')

    if (error.response?.status === 401 && !originalRequest._retry && hasRefreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post(`${API_BASE}/auth/login/refresh/`, { refresh })
        localStorage.setItem('access_token', data.access)
        refreshQueue.forEach((p) => p.resolve(data.access))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return client(originalRequest)
      } catch (refreshError) {
        refreshQueue.forEach((p) => p.reject(refreshError))
        refreshQueue = []
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export function wsUrl(path) {
  const token = localStorage.getItem('access_token')
  return `${WS_BASE}${path}?token=${token || ''}`
}

export default client
