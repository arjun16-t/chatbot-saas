import { useState } from 'react'
import { Pencil, X, Check, FileText, FileWarning, Loader2 } from 'lucide-react'

import { useAuth } from '../../AuthContext.jsx'
import { STATUS_META } from '../../utils/documentMeta.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function OverviewTab({ project, documents, onProjectUpdated }) {
  const { accessToken } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ name: project.name, domain: project.domain })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEditing() {
    setForm({ name: project.name, domain: project.domain })
    setError('')
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.id}/details/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: form.name, domain: form.domain }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not update project details.')
        return
      }
      await onProjectUpdated()
      setIsEditing(false)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const statusCounts = documents.reduce(
    (acc, d) => {
      const group = (STATUS_META[d.status] || {}).group || 'processing'
      acc[group] = (acc[group] || 0) + 1
      return acc
    },
    { trained: 0, processing: 0, failed: 0 }
  )

  return (
    <div className="mp-overview">
      <div className="mp-details-card">
        <div className="mp-details-header">
          <h3>Project Details</h3>
          {!isEditing && (
            <button type="button" className="mp-icon-btn" onClick={startEditing} title="Edit project details">
              <Pencil size={14} />
            </button>
          )}
        </div>

        {isEditing ? (
          <form className="mp-details-form" onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="mp-project-name">Project Name</label>
              <input
                id="mp-project-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mp-project-domain">Domain</label>
              <input
                id="mp-project-domain"
                type="text"
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="mp-details-form-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEditing} disabled={saving}>
                <X size={14} /> Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? <Loader2 size={14} className="mp-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="mp-details-grid">
            <div className="mp-details-item">
              <span className="mp-meta-label">Project Name</span>
              <span className="mp-meta-value">{project.name}</span>
            </div>
            <div className="mp-details-item">
              <span className="mp-meta-label">Domain</span>
              <span className="mp-meta-value">{project.domain}</span>
            </div>
            <div className="mp-details-item">
              <span className="mp-meta-label">Project ID</span>
              <span className="mp-meta-value mono">{project.id}</span>
            </div>
            <div className="mp-details-item">
              <span className="mp-meta-label">Created On</span>
              <span className="mp-meta-value">{formatDate(project.created_at)}</span>
            </div>
            <div className="mp-details-item">
              <span className="mp-meta-label">Status</span>
              <span className={`badge ${project.is_active ? 'badge-success' : 'badge-error'}`}>
                {project.is_active ? 'Active' : 'Revoked'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mp-details-card">
        <div className="mp-details-header">
          <h3>Document Overview</h3>
        </div>

        <div className="mp-stats-grid">
          <div className="mp-stat-tile">
            <div className="mp-stat-icon"><FileText size={18} /></div>
            <div>
              <div className="mp-stat-number">{documents.length}</div>
              <div className="mp-stat-label">Total Documents</div>
            </div>
          </div>
          <div className="mp-stat-tile">
            <div className="mp-stat-icon"><FileText size={18} /></div>
            <div>
              <div className="mp-stat-number">{statusCounts.trained}</div>
              <div className="mp-stat-label">Trained</div>
            </div>
          </div>
          <div className="mp-stat-tile">
            <div className="mp-stat-icon"><FileText size={18} /></div>
            <div>
              <div className="mp-stat-number">{statusCounts.processing}</div>
              <div className="mp-stat-label">Processing</div>
            </div>
          </div>
          <div className="mp-stat-tile">
            <div className="mp-stat-icon"><FileWarning size={18} /></div>
            <div>
              <div className="mp-stat-number">{statusCounts.failed}</div>
              <div className="mp-stat-label">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewTab