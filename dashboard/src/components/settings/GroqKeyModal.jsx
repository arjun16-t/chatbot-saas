import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function GroqKeyModal({
  isOpen,
  hasExistingKey,
  isSaving,
  saveError,
  onSave,
  onCancel,
  onRequestRemove,
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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card as-key-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onCancel} aria-label="Close" disabled={isSaving}>
          <X size={18} />
        </button>

        <h3 className="modal-title">{hasExistingKey ? 'Update Groq API Key' : 'Add Groq API Key'}</h3>
        <p className="modal-message">
          {hasExistingKey
            ? 'This replaces your current key. It takes effect on your next chat request.'
            : "Required before your chatbots can respond to any messages."}
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="groq-key-modal-input">Groq API Key</label>
          <div className="as-input-row">
            <input
              id="groq-key-modal-input"
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
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="as-link"
            >
              Get one from Groq Console
            </a>
          </p>
        </div>

        {saveError && <p className="as-error"><AlertCircle size={14} /> {saveError}</p>}

        <div className="modal-actions as-key-modal-actions">
          {hasExistingKey && (
            <button type="button" className="as-btn-danger-text" onClick={onRequestRemove} disabled={isSaving}>
              Remove Key
            </button>
          )}
          <div className="as-key-modal-actions-right">
            <button type="button" className="config-btn-secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="button" className="config-btn-primary" onClick={() => onSave(value)} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}