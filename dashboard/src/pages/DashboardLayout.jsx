import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Search, LayoutDashboard, FolderOpen, FileText, BarChart2,
  ChevronDown, User, Settings, CreditCard, LogOut,
  Calendar, Bell, Plus, FileWarning, Folder,
} from 'lucide-react'

import { useAuth } from '../AuthContext.jsx'
import AthenaBotLogo from '../assets/AthenaBot.png'
import { STATUS_META } from '../utils/documentMeta.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const POLL_INTERVAL_MS = 3000

function initialsFor(text) {
  return (text || '?').trim().charAt(0).toUpperCase()
}

function DashboardLayout() {
  const { projectId } = useParams()
  const location = useLocation()
  const isConfigView = location.pathname.endsWith('/config')

  const navigate = useNavigate()
  const { accessToken, client, logout } = useAuth()

  const [projects, setProjects] = useState([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [documents, setDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [docError, setDocError] = useState('')

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [quickLinksOpen, setQuickLinksOpen] = useState(true)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const unsavedGuardRef = useRef(null)

  const isHomeView = !projectId
  const activeProject = projects.find((p) => p.id === projectId)

  function registerUnsavedGuard(fn) {
    unsavedGuardRef.current = fn
  }

  function safeNavigate(path) {
    if (unsavedGuardRef.current && unsavedGuardRef.current()) {
      const confirmed = window.confirm('You have unsaved changes. Leave without saving?')
      if (!confirmed) return
    }
    navigate(path)
  }

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/`, { headers: authHeaders() })
      const data = await res.json()
      setProjects(data.data || data.results || data)
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [accessToken])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents/`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to load documents')
      const data = await res.json()
      setDocuments(data.data || data.results || data)
      setDocError('')
    } catch (err) {
      setDocError('Could not load documents.')
    } finally {
      setIsLoadingDocs(false)
    }
  }, [projectId, accessToken])

  useEffect(() => {
    if (!projectId) {
      setDocuments([])
      return
    }
    setIsLoadingDocs(true)
    fetchDocuments()
  }, [projectId, fetchDocuments])

  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'received' || d.status === 'processing')
    if (!hasPending) return
    const timer = setTimeout(fetchDocuments, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [documents, fetchDocuments])

  useEffect(() => {
    const scrollArea = document.getElementById('main-scroll-area')
    if (!scrollArea) return
    function handleScroll() {
      setIsHeaderScrolled(scrollArea.scrollTop > 20)
    }
    scrollArea.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollArea.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleCreateProject() {
    const name = window.prompt('Project name?')
    if (!name) return
    const domain = window.prompt('Project domain (e.g. example.com)?')
    if (!domain) return
    try {
      const res = await fetch(`${API_BASE}/api/projects/`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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

  const totalDocuments = projects.reduce((sum, p) => sum + (p.document_count || 0), 0)

  const statusCounts = documents.reduce(
    (acc, d) => {
      const group = (STATUS_META[d.status] || {}).group || 'processing'
      acc[group] = (acc[group] || 0) + 1
      return acc
    },
    { trained: 0, processing: 0, failed: 0 }
  )

  const hour = new Date().getHours()
  const timeOfDay = hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : 'Evening'
  const displayName = client?.email ? client.email.split('@')[0] : 'there'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          <div className="site-header sidebar-brand">
            <div className="logo-group">
              <img src={AthenaBotLogo} alt="AthenaChat logo" />
              <span className="brand-name">AthenaChat</span>
            </div>
          </div>

          <div className="sidebar-search-container">
            <Search className="search-icon" size={16} />
            <input type="text" placeholder="Search here" className="sidebar-search-input" />
          </div>

          <div className="sidebar-scroll-area">
            <nav className="nav-grid">
              <button type="button" className={`nav-tile ${isHomeView ? 'is-active' : ''}`} onClick={() => safeNavigate('/dashboard')}>
                <LayoutDashboard size={24} />
                <span>Dashboard</span>
              </button>
              <button type="button" className="nav-tile" onClick={() => setIsProjectMenuOpen((v) => !v)}>
                <FolderOpen size={24} />
                <span>Projects</span>
              </button>
              <button type="button" className="nav-tile">
                <BarChart2 size={24} />
                <span>Metrics</span>
              </button>

              <button
                type="button"
                className={`nav-tile ${!isHomeView && !isConfigView ? 'is-active' : ''}`}
                onClick={() => { if (activeProject) safeNavigate(`/dashboard/projects/${activeProject.id}`) }}
              >
                <FileText size={24} />
                <span>Documents</span>
              </button>
              {!isHomeView && activeProject && (
                <button
                  type="button"
                  className={`nav-tile ${isConfigView ? 'is-active' : ''}`}
                  onClick={() => safeNavigate(`/dashboard/projects/${activeProject.id}/config`)}
                >
                  <Settings size={24} />
                  <span>Configure</span>
                </button>
              )}

            </nav>

            <div className="sidebar-collapsible">
              <button className="collapsible-trigger" aria-expanded={quickLinksOpen} onClick={() => setQuickLinksOpen((v) => !v)}>
                <ChevronDown className="chevron" size={14} />
                <span>Quick Links</span>
              </button>
              {quickLinksOpen && (
                <ul className="collapsible-content">
                  <li><button type="button" className="pill-link">Review Chatbot</button></li>
                  <li><button type="button" className="pill-link">Analyse Usage</button></li>
                  <li><button type="button" className="pill-link">Manage API Keys</button></li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="profile-dropdown-container">
            <button className="profile-trigger" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((v) => !v)}>
              <div className="user-avatar" style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-text-primary)', color: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 600, flexShrink: 0,
              }}>
                {initialsFor(displayName)}
              </div>
              <div className="user-details">
                <span className="user-email">{client?.email || displayName}</span>
                <span className="user-role">Administrator</span>
              </div>
              <ChevronDown className="dropdown-chevron" size={16} />
            </button>

            {profileMenuOpen && (
              <div className="profile-menu is-active">
                <button type="button"><User size={16} /> My Profile</button>
                <button type="button"><Settings size={16} /> Account Settings</button>
                <button type="button"><CreditCard size={16} /> Billing</button>
              </div>
            )}
          </div>

          <button type="button" className="btn btn-secondary btn-icon-only logout-btn" aria-label="Log out" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main" id="main-scroll-area">
        <div className="header-bento-wrapper">
          <header className={`main-header-sticky bento-box ${isHeaderScrolled || isConfigView ? 'is-scrolled' : ''}`}>
            <div className="header-top-bar">
              <div className="header-titles">
                <div className="breadcrumbs">
                  Home /{' '}
                  <span style={{ cursor: 'pointer' }} onClick={() => { safeNavigate('/dashboard'); setIsProjectMenuOpen(false) }}>
                    Dashboard
                  </span>
                  {!isHomeView && (
                    <>
                      {' / '}
                      <strong style={{ cursor: 'pointer' }} onClick={() => setIsProjectMenuOpen((v) => !v)}>
                        {activeProject?.name || '...'} <ChevronDown size={12} style={{ display: 'inline' }} />
                      </strong>
                      {isConfigView && <> / <strong>Chatbot</strong></>}
                    </>
                  )}
                  {isProjectMenuOpen && (
                    <div className="profile-menu is-active" style={{ top: '100%', bottom: 'auto', minWidth: '180px' }}>
                      {projects.map((p) => (
                        <button key={p.id} type="button" onClick={() => { safeNavigate(`/dashboard/projects/${p.id}`); setIsProjectMenuOpen(false) }}>
                          {p.name}
                        </button>
                      ))}
                      <button type="button" onClick={() => { handleCreateProject(); setIsProjectMenuOpen(false) }}>
                        <Plus size={14} /> New Project
                      </button>
                    </div>
                  )}
                </div>
                <h1>Good {timeOfDay}, {displayName}</h1>
                <p className="date-display">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="header-actions">
                <button type="button" className="btn btn-secondary btn-icon-only"><Calendar size={20} /></button>
                <button type="button" className="btn btn-secondary btn-icon-only"><Bell size={20} /></button>
                <button type="button" className="btn btn-secondary btn-icon-only"><Settings size={20} /></button>
              </div>
            </div>

            <div className="header-collapsible-area">
              <div className="minimal-stats-group">
                {isHomeView ? (
                  <>
                    <div className="minimal-stat-item">
                      <div className="stat-top"><div className="stat-icon-tiny"><Folder size={16} /></div><span className="stat-huge-number">{projects.length}</span></div>
                      <span className="stat-label">Active Projects</span>
                    </div>
                    <div className="minimal-stat-item">
                      <div className="stat-top"><div className="stat-icon-tiny"><FileText size={16} /></div><span className="stat-huge-number">{totalDocuments}</span></div>
                      <span className="stat-label">Indexed Documents</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="minimal-stat-item">
                      <div className="stat-top"><div className="stat-icon-tiny"><FileText size={16} /></div><span className="stat-huge-number">{statusCounts.trained}</span></div>
                      <span className="stat-label">Trained</span>
                    </div>
                    <div className="minimal-stat-item">
                      <div className="stat-top"><div className="stat-icon-tiny"><FileText size={16} /></div><span className="stat-huge-number">{statusCounts.processing}</span></div>
                      <span className="stat-label">Processing</span>
                    </div>
                    <div className="minimal-stat-item">
                      <div className="stat-top"><div className="stat-icon-tiny"><FileWarning size={16} /></div><span className="stat-huge-number">{statusCounts.failed}</span></div>
                      <span className="stat-label">Failed</span>
                    </div>
                  </>
                )}
              </div>

              {isHomeView && (
                <div className="header-gauge-card">
                  <div className="gauge-info">
                    <span className="gauge-title">API Usage</span>
                    <div className="gauge-details"><strong>84.2k</strong> / 100k calls</div>
                    <div className="gauge-actions">
                      <button type="button" className="btn btn-secondary btn-sm">Analyse</button>
                      <button type="button" className="btn btn-primary btn-sm">Buy More</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>
        </div>

        <div className="dashboard-content">
          <Outlet context={{
            projects, isLoadingProjects, fetchProjects,
            documents, isLoadingDocs, docError, fetchDocuments,
            projectId, activeProject,
            registerUnsavedGuard,
          }} />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout