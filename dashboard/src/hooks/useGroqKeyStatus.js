import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Shared Groq key status + save logic. Used by the post-wizard
 * onboarding prompt and the dashboard status badge (both need the
 * same is_set/set_at data); AccountSettingsPage keeps its own
 * inline copy for now, untouched.
 */
export function useGroqKeyStatus() {
  const { accessToken } = useAuth()

  const [keyStatus, setKeyStatus] = useState(null) // { is_set, set_at } | null
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  const refetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/groq-config/`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) setKeyStatus(data.data)
    } catch (err) {
      // Status just won't be available -- consumers should handle
      // keyStatus === null gracefully.
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    refetchStatus()
  }, [refetchStatus])

  async function saveKey(rawValue) {
    const trimmed = rawValue.trim()
    if (!trimmed) {
      setSaveError('Enter a key before saving.')
      return false
    }
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/groq-config/`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ groq_api_key: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.message || 'Could not save that key.')
        return false
      }
      setKeyStatus(data.data)
      return true
    } catch (err) {
      setSaveError('Could not reach the server. Try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return { keyStatus, isLoading, isSaving, saveError, refetchStatus, saveKey }
}