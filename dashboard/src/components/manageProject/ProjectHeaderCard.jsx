import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

function initialsFor(text) {
  return (text || '?').trim().charAt(0).toUpperCase()
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProjectHeaderCard({ project }) {
  const [copied, setCopied] = useState(false)

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(project.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="mp-header-card">
      <div className="mp-header-main">
        <div className="mp-avatar">{initialsFor(project.name)}</div>

        <div className="mp-identity">
          <div className="mp-identity-title">
            <h2>{project.name}</h2>
            <span className={`badge ${project.is_active ? 'badge-success' : 'badge-error'}`}>
              {project.is_active ? 'Active' : 'Revoked'}
            </span>
          </div>

          <div className="mp-identity-meta">
            <div className="mp-meta-item">
              <span className="mp-meta-label">Project ID</span>
              <button type="button" className="mp-id-chip mono" onClick={handleCopyId} title="Copy project ID">
                <span>{project.id}</span>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <div className="mp-meta-item">
              <span className="mp-meta-label">Created on</span>
              <span className="mp-meta-value">{formatDate(project.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mp-status-panel">
        <div className="mp-status-row">
          <span className="mp-status-label">API Status</span>
          <span className={`badge ${project.is_active ? 'badge-success' : 'badge-error'}`}>
            <span className="badge-dot" />
            {project.is_active ? 'Operational' : 'Disabled'}
          </span>
        </div>
        <div className="mp-status-row">
          <span className="mp-status-label">Widget Status</span>
          <span className={`badge ${project.widget_enabled ? 'badge-success' : 'badge-error'}`}>
            <span className="badge-dot" />
            {project.widget_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProjectHeaderCard