import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import ProjectWizardModal from '../components/projectWizard/ProjectWizardModal.jsx'
import GroqOnboardingModal from '../components/onboarding/GroqOnboardingModal.jsx'
import ConfirmActionModal from '../components/manageProject/ConfirmActionModal.jsx'
import { useGroqKeyStatus } from '../hooks/useGroqKeyStatus.js'

function HomeView() {
  const { projects, isLoadingProjects, fetchProjects } = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()

  const [isWizardOpen, setIsWizardOpen] = useState(false)

  const { keyStatus, isLoading: isKeyStatusLoading, isSaving, saveError, saveKey } = useGroqKeyStatus()
  const [showGroqOnboarding, setShowGroqOnboarding] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  // Holds the just-created project while the onboarding prompt is
  // open -- navigation to it is deferred until the prompt resolves,
  // since navigating away immediately would unmount this component
  // (and the modal along with it) before it ever renders.
  const [pendingProject, setPendingProject] = useState(null)

  useEffect(() => {
    if (location.state?.justRegistered || location.state?.openWizard) {
      setIsWizardOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  async function handleWizardCreated(project) {
    setIsWizardOpen(false)
    await fetchProjects()

    // First-time-only prompt: only fires if no Groq key has ever been
    // set. Once is_set is true, this never shows again on any future
    // project creation.
    if (!isKeyStatusLoading && keyStatus && !keyStatus.is_set) {
      setPendingProject(project)
      setShowGroqOnboarding(true)
      return
    }

    navigate(`/dashboard/projects/${project.id}`)
  }

  async function handleSaveGroqKey(value) {
    const success = await saveKey(value)
    if (success) {
      setShowGroqOnboarding(false)
      if (pendingProject) navigate(`/dashboard/projects/${pendingProject.id}`)
    }
  }

  function handleSkipOnboarding() {
    setShowGroqOnboarding(false)
    setShowSkipConfirm(true)
  }

  function handleGoBackFromSkip() {
    setShowSkipConfirm(false)
    setShowGroqOnboarding(true)
  }

  function handleConfirmSkip() {
    setShowSkipConfirm(false)
    if (pendingProject) navigate(`/dashboard/projects/${pendingProject.id}`)
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

      <GroqOnboardingModal
        isOpen={showGroqOnboarding}
        isSaving={isSaving}
        saveError={saveError}
        onSave={handleSaveGroqKey}
        onSkip={handleSkipOnboarding}
      />

      <ConfirmActionModal
        isOpen={showSkipConfirm}
        title="Skip Groq Key Setup?"
        message="Without a Groq API key, your chatbot won't be able to respond to any messages. You can add one later from Account Settings."
        confirmLabel="Skip Anyway"
        cancelLabel="Go Back"
        onConfirm={handleConfirmSkip}
        onCancel={handleGoBackFromSkip}
      />
    </section>
  )
}

export default HomeView