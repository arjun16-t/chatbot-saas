import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import ProjectWizardModal from '../components/projectWizard/ProjectWizardModal.jsx'

function HomeView() {
  const { projects, isLoadingProjects, fetchProjects } = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()

  const [isWizardOpen, setIsWizardOpen] = useState(false)

  useEffect(() => {
    if (location.state?.justRegistered) {
      setIsWizardOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  async function handleWizardCreated(project) {
    setIsWizardOpen(false)
    await fetchProjects()
    navigate(`/dashboard/projects/${project.id}`)
  }

  return (
    <section className="ledger-section bento-box">
      <div className="section-header">
        <h3>Your Projects</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsWizardOpen(true)}>
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

      {isWizardOpen && (
        <ProjectWizardModal
          onClose={() => setIsWizardOpen(false)}
          onCreated={handleWizardCreated}
        />
      )}
    </section>
  )
}

export default HomeView