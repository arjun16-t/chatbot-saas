import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

function ProtectedRoute({ children }) {
  const { accessToken, isInitializing } = useAuth()

  if (isInitializing) {
    return <div>Loading...</div>
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute