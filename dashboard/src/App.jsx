import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage initialView="signin" />} />
      <Route path="/register" element={<AuthPage initialView="signup" />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App