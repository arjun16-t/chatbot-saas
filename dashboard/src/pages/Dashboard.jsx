// src/pages/Dashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, FolderOpen, FileText, BarChart2,
  ChevronDown, User, Settings, CreditCard, LogOut, UploadCloud,
  Calendar, Bell, Folder, Plus, ArrowDown, Trash2, FileWarning,
} from 'lucide-react'
import { useAuth } from '../AuthContext.jsx'
import AthenaBotLogo from '../assets/AthenaBot.png'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const POLL_INTERVAL_MS = 3000

const STATUS_META = {
  created: { label: 'Trained', badgeClass: 'badge-success' },
  updated: { label: 'Trained', badgeClass: 'badge-success' },
  duplicate: { label: 'Trained', badgeClass: 'badge-success' },
  received: { label: 'Processing', badgeClass: 'badge-processing' },
  processing: { label: 'Processing', badgeClass: 'badge-processing' },
  failed: { label: 'Failed', badgeClass: 'badge-error' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Dashboard() {
  const { accessToken, client, logout } = useAuth()
  const navigate = useNavigate()

  // ---- Projects ----
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)

  // ---- Documents ----
  const [documents, setDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [docError, setDocError] = useState('')

  // ---- Table controls ----
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // ---- Upload ----
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  // ---- Sidebar / profile UI state ----
  const [quickLinksOpen, setQuickLinksOpen] = useState(true)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  // ---- Fetch projects on mount, default to the first one ----
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`${API_BASE}/api/projects/`, { headers: authHeaders() })
        const data = await res.json()
        const list = data.data || data.results || data
        setProjects(list)
        if (list.length > 0) setActiveProjectId(list[0].id)
      } catch (err) {
        console.error('Failed to load projects', err)
      }
    }
    fetchProjects()
  }, [])

  // ---- Fetch documents whenever the active project changes ----
  const fetchDocuments = useCallback(async () => {
    if (!activeProjectId) return
    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProjectId}/documents/`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Failed to load documents')
      const data = await res.json()
      setDocuments(data.data || data.results || data)
      setDocError('')
    } catch (err) {
      setDocError('Could not load documents.')
    } finally {
      setIsLoadingDocs(false)
    }
  }, [activeProjectId, accessToken])

  useEffect(() => {
    setIsLoadingDocs(true)
    fetchDocuments()
  }, [fetchDocuments])

  // ---- Poll while any document is still processing ----
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'received' || d.status === 'processing')
    if (!hasPending) return
    const interval = setInterval(fetchDocuments, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [documents, fetchDocuments])

  // ---- Header scroll shrink ----
  useEffect(() => {
    const scrollArea = document.getElementById('main-scroll-area')
    if (!scrollArea) return
    function handleScroll() {
      setIsHeaderScrolled(scrollArea.scrollTop > 20)
    }
    scrollArea.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollArea.removeEventListener('scroll', handleScroll)
  }, [])

  // ---- Greeting ----
  const hour = new Date().getHours()
  const timeOfDay = hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : 'Evening'
  const displayName = client?.email ? client.email.split('@')[0] : 'there'

  // ---- Upload handlers ----
  async function uploadFile(file) {
    if (!activeProjectId || !file) return
    setIsUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file_raw', file)
    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProjectId}/documents/upload/`, {
        method: 'POST',
        headers: authHeaders(), // no Content-Type -- browser sets multipart boundary itself
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.message || 'Upload failed.')
        return
      }
      await fetchDocuments()
    } catch (err) {
      setUploadError('Could not reach the server.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files[0]
    uploadFile(file)
    e.target.value = '' // allow re-selecting the same file later
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    uploadFile(file)
  }

  // ---- Delete ----
  async function handleDelete(docId, filename) {
    const confirmed = window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)
    if (!confirmed) return
    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProjectId}/documents/${docId}/`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.status === 204) {
        setDocuments((prev) => prev.filter((d) => d.doc_id !== docId))
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  // ---- Create project (inline, minimal) ----
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
        setProjects((prev) => [...prev, data.data])
        setActiveProjectId(data.data.id)
      }
    } catch (err) {
      console.error('Project creation failed', err)
    }
  }

  // ---- Sorting ----
  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // ---- Derived: filtered + sorted documents (not state) ----
  const filteredDocs = documents
    .filter((d) => {
      const haystack = `${d.original_filename || d.filename} ${d.status}`.toLowerCase()
      return haystack.includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0
      const dir = sortConfig.direction === 'asc' ? 1 : -1
      const aVal = sortConfig.key === 'filename' ? (a.original_filename || a.filename) : a[sortConfig.key]
      const bVal = sortConfig.key === 'filename' ? (b.original_filename || b.filename) : b[sortConfig.key]
      return aVal > bVal ? dir : aVal < bVal ? -dir : 0
    })

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">

      {/* SIDEBAR */}
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
              <a href="#" className="nav-tile is-active">
                <LayoutDashboard />
                <span>Dashboard</span>
              </a>
              <a href="#" className="nav-tile">
                <FolderOpen />
                <span>Projects</span>
              </a>
              <a href="#" className="nav-tile">
                <FileText />
                <span>Documents</span>
              </a>
              <a href="#" className="nav-tile">
                <BarChart2 />
                <span>Metrics</span>
              </a>
            </nav>

            <div className="sidebar-collapsible">
              <button className="collapsible-trigger" aria-expanded={quickLinksOpen} onClick={() => setQuickLinksOpen((v) => !v)}>
                <ChevronDown className="chevron" size={14} />
                <span>Quick Links</span>
              </button>
              {quickLinksOpen && (
                <ul className="collapsible-content">
                  <li><a href="#" className="pill-link">Review Chatbot</a></li>
                  <li><a href="#" className="pill-link">Analyse Usage</a></li>
                  <li><a href="#" className="pill-link">Manage API Keys</a></li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="profile-dropdown-container">
            <button className="profile-trigger" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((v) => !v)}>
              <div className="user-avatar">
                <img src={`https://ui-avatars.com/api/?name=${displayName}&background=111&color=fff`} alt={displayName} />
              </div>
              <div className="user-details">
                <span className="user-email">{client?.email || displayName}</span>
                <span className="user-role">Administrator</span>
              </div>
              <ChevronDown className="dropdown-chevron" size={16} />
            </button>

            {profileMenuOpen && (
              <div className="profile-menu is-active">
                <a href="#"><User size={16} /> My Profile</a>
                <a href="#"><Settings size={16} /> Account Settings</a>
                <a href="#"><CreditCard size={16} /> Billing</a>
              </div>
            )}
          </div>

          <button type="button" className="btn btn-secondary btn-icon-only logout-btn" aria-label="Log out" onClick={handleLogout}>
            <LogOut />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main" id="main-scroll-area">
        <div className="header-bento-wrapper">
          <header className={`main-header-sticky bento-box ${isHeaderScrolled ? 'is-scrolled' : ''}`}>
            <div className="header-top-bar">
              <div className="header-titles">
                <p className="breadcrumbs">
                  Home / Dashboard /{' '}
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <strong style={{ cursor: 'pointer' }} onClick={() => setIsProjectMenuOpen((v) => !v)}>
                      {activeProject?.name || 'Select a project'} <ChevronDown size={12} style={{ display: 'inline' }} />
                    </strong>
                    {isProjectMenuOpen && (
                      <div className="profile-menu is-active" style={{ top: '100%', bottom: 'auto', minWidth: '180px' }}>
                        {projects.map((p) => (
                          <a key={p.id} href="#" onClick={(e) => { e.preventDefault(); setActiveProjectId(p.id); setIsProjectMenuOpen(false) }}>
                            {p.name}
                          </a>
                        ))}
                        <a href="#" onClick={(e) => { e.preventDefault(); handleCreateProject(); setIsProjectMenuOpen(false) }}>
                          <Plus size={14} /> New Project
                        </a>
                      </div>
                    )}
                  </span>
                </p>
                <h1>Good {timeOfDay}, {displayName}</h1>
                <p className="date-display">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="header-actions">
                <button className="btn btn-secondary btn-icon-only"><Calendar /></button>
                <button className="btn btn-secondary btn-icon-only"><Bell /></button>
              </div>
            </div>
          </header>
        </div>

        <div className="dashboard-content">

          {/* UPLOAD */}
          <section className="upload-section bento-box">
            <div
              className="upload-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="upload-content">
                <div className="upload-icon-wrapper">
                  <UploadCloud />
                </div>
                <div className="upload-text">
                  <h3>Upload a new document</h3>
                  <p className="form-hint">
                    {isUploading ? 'Uploading...' : 'Drag and drop your PDF, DOCX, or TXT files here, or click to browse.'}
                  </p>
                  {uploadError && <p className="form-error">{uploadError}</p>}
                </div>
              </div>
              <div className="upload-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.txt,.md,.docx"
                  onChange={handleFileInputChange}
                />
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !activeProjectId}>
                  <Plus />
                  <span>Select File</span>
                </button>
              </div>
            </div>
          </section>

          {/* LEDGER */}
          <section className="ledger-section bento-box">
            <div className="section-header">
              <h3>Document Ledger</h3>
              <div className="search-wrapper">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className={`sortable ${sortConfig.key === 'filename' ? 'is-sorted ' + sortConfig.direction : ''}`} onClick={() => handleSort('filename')}>
                      <div className="th-content">Filename <ArrowDown className="sort-icon" size={14} /></div>
                    </th>
                    <th className={`sortable ${sortConfig.key === 'status' ? 'is-sorted ' + sortConfig.direction : ''}`} onClick={() => handleSort('status')}>
                      <div className="th-content">Status <ArrowDown className="sort-icon" size={14} /></div>
                    </th>
                    <th className={`sortable ${sortConfig.key === 'created_at' ? 'is-sorted ' + sortConfig.direction : ''}`} onClick={() => handleSort('created_at')}>
                      <div className="th-content">Uploaded Date <ArrowDown className="sort-icon" size={14} /></div>
                    </th>
                    <th className="align-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDocs && (
                    <tr><td colSpan={4}>Loading documents...</td></tr>
                  )}
                  {!isLoadingDocs && docError && (
                    <tr><td colSpan={4} className="form-error">{docError}</td></tr>
                  )}
                  {!isLoadingDocs && !docError && filteredDocs.length === 0 && (
                    <tr><td colSpan={4}>No documents yet.</td></tr>
                  )}
                  {!isLoadingDocs && filteredDocs.map((doc) => {
                    const meta = STATUS_META[doc.status] || { label: doc.status, badgeClass: 'badge-neutral' }
                    const isBusy = doc.status === 'received' || doc.status === 'processing'
                    return (
                      <tr key={doc.doc_id}>
                        <td>
                          <div className="file-name-cell">
                            {doc.status === 'failed' ? <FileWarning className="file-icon" size={18} /> : <FileText className="file-icon" size={18} />}
                            <div>
                              <strong>{doc.original_filename || doc.filename}</strong>
                              <div className="mono">#{doc.doc_id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge">
                            <span className={`badge-dot ${meta.badgeClass}`}></span>
                            {meta.label}
                          </span>
                        </td>
                        <td className="date-cell">{formatDate(doc.created_at)}</td>
                        <td className="align-right">
                          <button
                            className="btn btn-danger btn-icon-only"
                            disabled={isBusy}
                            aria-label="Delete document"
                            onClick={() => handleDelete(doc.doc_id, doc.original_filename || doc.filename)}
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

export default Dashboard