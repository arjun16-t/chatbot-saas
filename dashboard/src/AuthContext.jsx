import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [client, setClient] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    async function attemptSilentRefresh() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
          method: 'POST',
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setAccessToken(data.data.access)
        }
        // A 401 here just means "no valid session" — not an error to
        // surface to the user, so we deliberately do nothing on failure.
      } catch (err) {
        // Network failure (backend down, etc.) — also a silent no-op;
        // the user just lands on the login page as if logged out.
      } finally {
        setIsInitializing(false)
      }
    }
    attemptSilentRefresh()
  }, [])

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
      // Even if the network call fails, still clear local state below —
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