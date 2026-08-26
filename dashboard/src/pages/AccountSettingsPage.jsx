import { useState, useEffect } from 'react'
import { Lock, KeyRound, Info } from 'lucide-react'
import { useAuth } from '../AuthContext.jsx'
import ConfirmActionModal from '../components/manageProject/ConfirmActionModal.jsx'
import GroqKeyModal from '../components/settings/GroqKeyModal.jsx'
import ChangePasswordModal from '../components/settings/ChangePasswordModal.jsx'
import '../styles/manageProject.css'
import '../styles/accountSettings.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function AccountSettingsPage() {
  const { accessToken, client, refreshProfile } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    const [f = '', l = ''] = (client?.display_name || '').split('_')
    setFirstName(f)
    setLastName(l)
  }, [client])

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  async function handleSaveProfile() {
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    if (!trimmedFirst || !trimmedLast) {
      setProfileError('First and last name are both required.')
      return
    }

    setIsSavingProfile(true)
    setProfileError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/me/`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ display_name: `${trimmedFirst}_${trimmedLast}` }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProfileError(data.message || 'Could not update your profile.')
        return
      }
      // Re-sync from the server rather than trusting local state --
      // same reasoning as everywhere else in this app that calls a
      // refresh/refetch after a successful write.
      await refreshProfile()
    } catch (err) {
      setProfileError('Could not reach the server. Try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ---- Groq key state ----
  const [isLoading, setIsLoading] = useState(true)
  const [keyStatus, setKeyStatus] = useState(null) // { is_set, set_at }
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/groq-config/`, { headers: authHeaders() })
        const data = await res.json()
        if (res.ok) setKeyStatus(data.data)
      } catch (err) {
        // Status block just won't render below -- the modal still
        // works standalone if opened manually.
      } finally {
        setIsLoading(false)
      }
    }
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveKey(rawValue) {
    const trimmed = rawValue.trim()
    if (!trimmed) {
      setSaveError('Enter a key before saving.')
      return
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
        return
      }
      setKeyStatus(data.data)
      setShowKeyModal(false)
    } catch (err) {
      setSaveError('Could not reach the server. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleRequestRemove() {
    setShowKeyModal(false)
    setShowRemoveModal(true)
  }

  async function handleRemoveKey() {
    setIsRemoving(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/groq-config/`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) setKeyStatus({ is_set: false, set_at: null })
    } catch (err) {
      // Stale status is safer than a false "removed" claim; a page
      // refresh will reconcile it either way.
    } finally {
      setIsRemoving(false)
      setShowRemoveModal(false)
    }
  }

  return (
    <div className="mp-page as-page">
      <div className="as-page-header">
        <h1>Account Settings</h1>
        <p>Manage your account information and preferences.</p>
      </div>

      {/* Profile Information -- same card shell as Project Details,
          but always in edit mode (no pencil toggle) since there's
          no read-only state worth showing for a two-field form. */}
      <div className="mp-details-card">
        <div className="mp-details-header">
          <div>
            <h3>Profile Information</h3>
            <p className="as-card-subtitle">Update your name and email address.</p>
          </div>
        </div>

        <div className="as-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="as-first-name">First Name</label>
            <input id="as-first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="as-last-name">Last Name</label>
            <input id="as-last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="form-group as-email-row">
            <label className="form-label" htmlFor="as-email">Email Address</label>
            <input id="as-email" type="email" value={client?.email || ''} disabled />
            <p className="as-field-hint">Email address cannot be changed.</p>
            {profileError && <p className="as-error">{profileError}</p>}
          </div>
          <button type="button" className="btn btn-primary as-save-btn" onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password + Groq key -- same .mp-action-row used by
          SettingsTab's Widget Toggle / Rotate Key / Revoke rows. */}
      <div className="mp-action-row">
        <div className="mp-action-icon"><Lock size={18} /></div>
        <div className="mp-action-text">
          <h4>Password</h4>
          <p>Reset your password to keep your account secure.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(true)}>
          Reset Password
        </button>
      </div>

      <div className="mp-action-row">
        <div className="mp-action-icon"><KeyRound size={18} /></div>
        <div className="mp-action-text">
          <h4>Groq API Key</h4>
          <p>Manage your Groq API key used for chat completions.</p>
        </div>

        {!isLoading && (
          <div className="as-key-status">
            <span className="mp-meta-label">
              API Key Status
              <span className="as-tooltip">
                <Info size={12} className="as-info-icon" tabIndex={0} />
                <span className="as-tooltip-bubble">
                  Used on every chat request across all of your projects. Your chatbots won't respond without one.
                </span>
              </span>
            </span>
            <span className={`badge ${keyStatus?.is_set ? 'badge-success' : 'badge-error'}`}>
              <span className="badge-dot" />
              {keyStatus?.is_set ? 'Active' : 'Not Configured'}
            </span>
          </div>
        )}

        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSaveError(''); setShowKeyModal(true) }}>
          {keyStatus?.is_set ? 'Update API Key' : 'Add API Key'}
        </button>
      </div>

      <GroqKeyModal
        isOpen={showKeyModal}
        hasExistingKey={!!keyStatus?.is_set}
        isSaving={isSaving}
        saveError={saveError}
        onSave={handleSaveKey}
        onCancel={() => setShowKeyModal(false)}
        onRequestRemove={handleRequestRemove}
      />

      <ConfirmActionModal
        isOpen={showRemoveModal}
        title="Remove Groq API Key"
        message="Removing your key will immediately stop every one of your chatbots from responding until a new key is added. This can't be undone from here."
        confirmLabel="Remove Key"
        cancelLabel="Keep Key"
        requireRetype
        retypeValue="REMOVE"
        isSubmitting={isRemoving}
        onConfirm={handleRemoveKey}
        onCancel={() => setShowRemoveModal(false)}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  )
}