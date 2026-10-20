import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUser } from '../api.js'

export default function ProtectedRoute({ role, children }) {
  const location = useLocation()
  const user = getUser()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}