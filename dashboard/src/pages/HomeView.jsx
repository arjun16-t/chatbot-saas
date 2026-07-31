import { useOutletContext, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function HomeView() {
  const { projects, isLoadingProjects, fetchProjects } = useOutletContext()
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  async function handleCreateProject() {
    const name = window.prompt('Project name?')
    if (!name) return
    const domain = window.prompt('Project domain (e.g. example.com)?')
    if (!domain) return
    try {
      const res = await fetch(`${API_BASE}/api/projects/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchProjects()
        navigate(`/dashboard/projects/${data.data.id}`)
      }
    } catch (err) {
      console.error('Project creation failed', err)
    }
  }

  return (
    <section className="ledger-section bento-box">
      <div className="section-header">
        <h3>Your Projects</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateProject}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoadingProjects && <p>Loading projects...</p>}
      {!isLoadingProjects && projects.length === 0 && <p>No projects yet — create your first one to get started.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        {projects.map((p) => (
          <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/projects/${p.id}`)}>
            <h3>{p.name}</h3>
            <p className="form-hint">{p.domain}</p>
            <p style={{ marginTop: 'var(--space-3)' }}>
              <span className="mono">{p.document_count} document{p.document_count === 1 ? '' : 's'}</span>
            </p>
            <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop: 'var(--space-3)' }}>
              <span className={`badge-dot ${p.is_active ? 'badge-success' : 'badge-neutral'}`}></span>
              {p.is_active ? 'Active' : 'Revoked'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HomeView