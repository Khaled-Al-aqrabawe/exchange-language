import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-16 text-center text-slate-500 text-sm">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
