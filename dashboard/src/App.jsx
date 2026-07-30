import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AuthPage from './AuthPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage initialView="signin" />} />
      <Route path="/register" element={<AuthPage initialView="signup" />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App