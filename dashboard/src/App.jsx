import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import DashboardLayout from './pages/DashboardLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import HomeView from './pages/HomeView.jsx'
import ProjectView from './pages/ProjectView.jsx'
import ProjectConfigPage from './pages/ProjectConfigPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage initialView="signin" />} />
      <Route path="/register" element={<AuthPage initialView="signup" />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<HomeView />} />
        <Route path="projects/:projectId" element={<ProjectView />} />
        <Route path="projects/:projectId/config" element={<ProjectConfigPage />} />
      </Route>
    </Routes>
  )
}

export default App