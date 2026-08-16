import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Access tokens live 1hr server-side (JWT config, Sprint 2). Refreshing
// every 45 min leaves a comfortable margin -- long enough to avoid
// hammering the refresh endpoint, short enough that a client mid-task
// (uploading, editing config) never actually hits a dead access token
// during normal use, rather than only recovering reactively after a
// request already failed.
const SILENT_REFRESH_INTERVAL_MS = 45 * 60 * 1000

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [client, setClient] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const intervalRef = useRef(null)

  // Shared by both the mount-time attempt and the recurring interval --
  // same request, same success/failure handling either way.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setAccessToken(data.data.access)
        return true
      }
      // Refresh token missing, expired, or blacklisted (e.g. a
      // password change on another device, or this one after its
      // grace period). Clear state so ProtectedRoute redirects to
      // login instead of the app limping along on a token that will
      // 401 on its next real use.
      setAccessToken(null)
      setClient(null)
      return false
    } catch (err) {
      // Network failure -- deliberately don't clear state here. A
      // transient outage shouldn't log the user out; the next
      // scheduled attempt will retry on its own.
      return false
    }
  }, [])

  useEffect(() => {
    async function attemptInitialRefresh() {
      await refresh()
      setIsInitializing(false)
    }
    attemptInitialRefresh()
  }, [refresh])

  // Proactive re-refresh while a session is active. Restarts on every
  // successful refresh (accessToken changes -> effect re-runs), which
  // is intended: it keeps a continuous ~45min cadence for as long as
  // the session stays alive, rather than a fixed schedule from login.
  useEffect(() => {
    if (!accessToken) return undefined

    intervalRef.current = setInterval(refresh, SILENT_REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [accessToken, refresh])

  function login(token, clientData) {
    setAccessToken(token)
    setClient(clientData)
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch (err) {
      // Even if the network call fails, still clear local state below --
      // the user's intent was to log out, and staying "logged in" in
      // the UI with a possibly-dead token is worse than a failed
      // server-side blacklist call.
    } finally {
      setAccessToken(null)
      setClient(null)
    }
  }

  const value = { accessToken, client, isInitializing, login, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}