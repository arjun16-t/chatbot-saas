import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react'

/**
 * First-run Groq key prompt, shown once after a client's first
 * project is created (never shown again once a key exists).
 * Structurally a trimmed-down GroqKeyModal -- no "existing key" /
 * "remove key" states, since there's nothing to update or remove yet.
 */
export default function GroqOnboardingModal({
  isOpen,
  isSaving,
  saveError,
  onSave,
  onSkip,
}) {
  const [value, setValue] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      setShowKey(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div className="modal-card as-key-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onSkip} aria-label="Close" disabled={isSaving}>
          <X size={18} />
        </button>

        <h3 className="modal-title">Add Your Groq API Key</h3>
        <p className="modal-message">
          Your chatbot is live, but it won't respond to any messages until a Groq API key is added.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="groq-onboarding-input">Groq API Key</label>
          <div className="as-input-row">
            <input
              id="groq-onboarding-input"
              type={showKey ? 'text' : 'password'}
              placeholder="gsk_..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              name="groq_api_key_field_no_autofill"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              spellCheck={false}
              disabled={isSaving}
            />
            <button
              type="button"
              className="as-eye-btn"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="as-field-hint">
            Starts with gsk_, 56 characters.{' '}
            
            <a href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="as-link"
            >
              Get one from Groq Console
            </a>
          </p>
        </div>

        {saveError && <p className="as-error"><AlertCircle size={14} /> {saveError}</p>}

        <div className="modal-actions">
          <button type="button" className="config-btn-secondary" onClick={onSkip} disabled={isSaving}>
            Skip for now
          </button>
          <button type="button" className="config-btn-primary" onClick={() => onSave(value)} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  )
}