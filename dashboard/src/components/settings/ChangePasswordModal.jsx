import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * POST /api/auth/change-password/. On success, the backend blacklists
 * every OTHER outstanding refresh token for this client (not this
 * session's) -- this modal just surfaces that in the success message,
 * it doesn't need to do anything extra locally. The current session
 * stays logged in exactly as before.
 */
export default function ChangePasswordModal({ isOpen, onClose }) {
  const { accessToken } = useAuth()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswords(false)
      setError('')
      setSuccessMessage('')
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit() {
    if (!oldPassword || !newPassword) {
      setError('Fill in both your current and new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.data.message || 'Could not update your password.')
        return
      }
      setSuccessMessage(data.data.message || 'Password updated successfully.')
    } catch (err) {
      setError('Could not reach the server. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card as-key-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close" disabled={isSaving}>
          <X size={18} />
        </button>

        {successMessage ? (
          <>
            <div className="as-success-icon"><CheckCircle2 size={22} /></div>
            <h3 className="modal-title">Password Updated</h3>
            <p className="modal-message">{successMessage}</p>
            <div className="modal-actions as-key-modal-actions-right">
              <button type="button" className="config-btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="modal-title">Reset Password</h3>
            <p className="modal-message">
              Changing your password will log you out on every other device and browser tab.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="cp-old">Current Password</label>
              <div className="as-input-row">
                <input
                  id="cp-old"
                  type={showPasswords ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cp-new">New Password</label>
              <div className="as-input-row">
                <input
                  id="cp-new"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cp-confirm">Confirm New Password</label>
              <div className="as-input-row">
                <input
                  id="cp-confirm"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSaving}
                />
                <button
                  type="button"
                  className="as-eye-btn"
                  onClick={() => setShowPasswords((v) => !v)}
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="as-error"><AlertCircle size={14} /> {error}</p>}

            <div className="modal-actions as-key-modal-actions-right">
              <button type="button" className="config-btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="config-btn-primary" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}