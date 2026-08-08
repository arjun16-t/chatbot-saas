import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, ShieldOff, ShieldCheck, ToggleLeft, ToggleRight,
  Copy, Check, Trash2,
} from 'lucide-react'

import { useAuth } from '../../AuthContext.jsx'
import ConfirmActionModal from './ConfirmActionModal.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const WIDGET_SCRIPT_URL = `${API_BASE}/static/widget.js`

const ACTION_CONFIG = {
  'widget-off': {
    title: 'Disable Widget?',
    message: "Visitors will no longer be able to open the chat widget on your site until it's re-enabled.",
    confirmLabel: 'Disable Widget',
    requireRetype: false,
  },
  'widget-on': {
    title: 'Enable Widget?',
    message: 'This turns the chat widget back on for visitors to your site.',
    confirmLabel: 'Enable Widget',
    requireRetype: false,
  },
  rotate: {
    title: 'Rotate API Key?',
    message: "Generating a new key immediately invalidates the current one. Any live widget using the old key will stop working until the embed snippet is updated.",
    confirmLabel: 'Rotate Key',
    requireRetype: true,
  },
  revoke: {
    title: 'Revoke Project Access?',
    message: "This immediately disables this project's API key. The widget will stop authenticating until access is restored.",
    confirmLabel: 'Revoke Access',
    requireRetype: true,
  },
  reactivate: {
    title: 'Reactivate Project?',
    message: "This restores API access for this project's key.",
    confirmLabel: 'Reactivate',
    requireRetype: false,
  },
  delete: {
    title: 'Delete This Project?',
    message: "This permanently deletes the project, all its documents, and every embedding indexed for it. Any live widget will stop working immediately. This cannot be undone.",
    confirmLabel: 'Delete Project',
    requireRetype: true,
  },
}

function SettingsTab({ project, onProjectUpdated }) {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [pendingAction, setPendingAction] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [keyCopied, setKeyCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  function closeModal() {
    setPendingAction(null)
    setError('')
  }

  function openAction(type) {
    setError('')
    setPendingAction(type)
  }

  async function handleConfirm() {
    if (!pendingAction) return
    setIsSubmitting(true)
    setError('')

    try {
      let res

      if (pendingAction === 'rotate') {
        res = await fetch(`${API_BASE}/api/projects/${project.id}/rotate/`, {
          method: 'POST',
          headers: authHeaders(),
        })
      } else if (pendingAction === 'revoke') {
        res = await fetch(`${API_BASE}/api/projects/${project.id}/revoke/`, {
          method: 'PATCH',
          headers: authHeaders(),
        })
      } else if (pendingAction === 'reactivate') {
        res = await fetch(`${API_BASE}/api/projects/${project.id}/details/`, {
          method: 'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ is_active: true }),
        })
      } else if (pendingAction === 'widget-off' || pendingAction === 'widget-on') {
        res = await fetch(`${API_BASE}/api/projects/${project.id}/details/`, {
          method: 'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ widget_enabled: pendingAction === 'widget-on' }),
        })
      } else if (pendingAction === 'delete') {
        res = await fetch(`${API_BASE}/api/projects/${project.id}/`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Action failed. Please try again.')
        setPendingAction(null)
        setIsSubmitting(false)
        return
      }

      if (pendingAction === 'rotate') {
        setNewApiKey(data.data.api_key)
      }

      if (pendingAction === 'delete') {
        await onProjectUpdated()
        navigate('/dashboard')
        return
      }

      await onProjectUpdated()
      setPendingAction(null)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopyKey() {
    try {
      await navigator.clipboard.writeText(newApiKey)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  async function handleCopySnippet() {
    const snippet = `<script src="${WIDGET_SCRIPT_URL}" data-api-key="${newApiKey}"></script>`
    try {
      await navigator.clipboard.writeText(snippet)
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const activeConfig = pendingAction ? ACTION_CONFIG[pendingAction] : null

  return (
    <div className="mp-settings">
      {newApiKey && (
        <div className="mp-key-reveal">
          <div className="mp-key-reveal-text">
            <strong>New API key generated</strong>
            <p>Copy your key or the ready-to-embed snippet now — for security, the key won't be shown again.</p>
          </div>

          <div className="mp-key-reveal-items">
            <button type="button" className="mp-id-chip mono" onClick={handleCopyKey} title="Copy API key">
              <span>{newApiKey}</span>
              {keyCopied ? <Check size={13} /> : <Copy size={13} />}
            </button>

            <button type="button" className="mp-snippet-box" onClick={handleCopySnippet} title="Copy embed snippet">
              <code>{`<script src="${WIDGET_SCRIPT_URL}" data-api-key="${newApiKey}"></script>`}</code>
              {snippetCopied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewApiKey('')}>
            Done
          </button>
        </div>
      )}

      <div className="mp-action-row">
        <div className="mp-action-icon">
          {project.widget_enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </div>
        <div className="mp-action-text">
          <h4>Chat Widget</h4>
          <p>
            {project.widget_enabled
              ? 'The widget is live on your site. Disabling it hides the chat bubble until re-enabled.'
              : 'The widget is currently disabled and hidden from visitors on your site.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => openAction(project.widget_enabled ? 'widget-off' : 'widget-on')}
        >
          {project.widget_enabled ? 'Disable Widget' : 'Enable Widget'}
        </button>
      </div>

      <div className="mp-action-row">
        <div className="mp-action-icon"><RefreshCw size={18} /></div>
        <div className="mp-action-text">
          <h4>Rotate API Key</h4>
          <p>Generate a new API key and invalidate the current one.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAction('rotate')}>
          Rotate Key
        </button>
      </div>

      <div className="mp-action-row">
        <div className="mp-action-icon">
          {project.is_active ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
        </div>
        <div className="mp-action-text">
          <h4>Project Access</h4>
          <p>
            {project.is_active
              ? "Revoking immediately disables this project's API key across every request."
              : "Access is currently revoked. Reactivate to restore this project's API key."}
          </p>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${project.is_active ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => openAction(project.is_active ? 'revoke' : 'reactivate')}
        >
          {project.is_active ? 'Revoke Access' : 'Reactivate'}
        </button>
      </div>

      <div className="mp-action-row mp-action-row-danger">
        <div className="mp-action-icon mp-action-icon-danger"><Trash2 size={18} /></div>
        <div className="mp-action-text">
          <h4>Delete Project</h4>
          <p>Permanently delete this project, its documents, and its indexed data. This cannot be undone.</p>
        </div>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => openAction('delete')}>
          Delete Project
        </button>
      </div>

      {error && !pendingAction && <p className="form-error mp-settings-error">{error}</p>}

      <ConfirmActionModal
        isOpen={!!pendingAction}
        title={activeConfig?.title}
        message={activeConfig?.message}
        confirmLabel={activeConfig?.confirmLabel}
        requireRetype={activeConfig?.requireRetype}
        retypeValue={project.name}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={closeModal}
      />
    </div>
  )
}

export default SettingsTab