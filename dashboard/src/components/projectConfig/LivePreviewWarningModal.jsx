// components/projectConfig/LivePreviewWarningModal.jsx
import { AlertTriangle, X } from 'lucide-react';

export default function LivePreviewWarningModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-icon">
          <AlertTriangle size={22} />
        </div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="config-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="config-btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}