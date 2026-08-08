// components/manageProject/ConfirmActionModal.jsx
import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  requireRetype = false,
  retypeValue = '',
  isSubmitting = false,
  onConfirm,
  onCancel,
}) {
  const [typedValue, setTypedValue] = useState('')

  useEffect(() => {
    if (isOpen) setTypedValue('')
  }, [isOpen])

  if (!isOpen) return null

  const canConfirm = !requireRetype || typedValue === retypeValue

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onCancel} aria-label="Close" disabled={isSubmitting}>
          <X size={18} />
        </button>
        <div className="modal-icon">
          <AlertTriangle size={22} />
        </div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>

        {requireRetype && (
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-retype-input">
              Type <strong>{retypeValue}</strong> to confirm
            </label>
            <input
              id="confirm-retype-input"
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              autoComplete="off"
              placeholder={retypeValue}
            />
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="config-btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="config-btn-primary"
            onClick={onConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}