import { useState, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, FileText, FileWarning, Trash2, ArrowDown, UploadCloud, Plus } from 'lucide-react'
import { useAuth } from '../AuthContext.jsx'
import { STATUS_META, formatDate } from '../utils/documentMeta.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function ProjectView() {
  const { documents, isLoadingDocs, docError, fetchDocuments, fetchProjects, projectId } = useOutletContext()
  const { accessToken } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  async function uploadFile(file) {
    if (!projectId || !file) return
    setIsUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file_raw', file)
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents/upload/`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.message || 'Upload failed.')
        return
      }
      await fetchDocuments()
      await fetchProjects()
    } catch (err) {
      setUploadError('Could not reach the server.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files[0]
    uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    uploadFile(e.dataTransfer.files[0])
  }

  async function handleDelete(docId, filename) {
    const confirmed = window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)
    if (!confirmed) return
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents/${docId}/`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.status === 204) {
        await fetchDocuments()
        await fetchProjects()
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const filteredDocs = documents
    .filter((d) => `${d.original_filename} ${d.status}`.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (!sortConfig.key) return 0
      const dir = sortConfig.direction === 'asc' ? 1 : -1
      const aVal = sortConfig.key === 'filename' ? a.original_filename : a[sortConfig.key]
      const bVal = sortConfig.key === 'filename' ? b.original_filename : b[sortConfig.key]
      return aVal > bVal ? dir : aVal < bVal ? -dir : 0
    })

  return (
    <>
      <section className="upload-section bento-box">
        <div className="upload-card" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <div className="upload-content">
            <div className="upload-icon-wrapper"><UploadCloud size={24} /></div>
            <div className="upload-text">
              <h3>Upload a new document</h3>
              <p className="form-hint">
                {isUploading ? 'Uploading...' : 'Drag and drop your PDF, DOCX, or TXT files here, or click to browse.'}
              </p>
              {uploadError && <p className="form-error">{uploadError}</p>}
            </div>
          </div>
          <div className="upload-actions">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,.txt,.md,.docx" onChange={handleFileInputChange} />
            <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Plus size={16} /><span>Select File</span>
            </button>
          </div>
        </div>
      </section>

      <section className="ledger-section bento-box">
        <div className="section-header">
          <h3>Document Ledger</h3>
          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input type="text" placeholder="Search documents..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
              {isLoadingDocs && <tr><td colSpan={4}>Loading documents...</td></tr>}
              {!isLoadingDocs && docError && <tr><td colSpan={4} className="form-error">{docError}</td></tr>}
              {!isLoadingDocs && !docError && filteredDocs.length === 0 && <tr><td colSpan={4}>No documents yet.</td></tr>}
              {!isLoadingDocs && filteredDocs.map((doc) => {
                const meta = STATUS_META[doc.status] || { label: doc.status, badgeClass: 'badge-neutral' }
                const isBusy = doc.status === 'received' || doc.status === 'processing'
                return (
                  <tr key={doc.doc_id}>
                    <td>
                      <div className="file-name-cell">
                        {doc.status === 'failed' ? <FileWarning className="file-icon" size={18} /> : <FileText className="file-icon" size={18} />}
                        <div>
                          <strong>{doc.original_filename}</strong>
                          <div className="mono">#{doc.doc_id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge"><span className={`badge-dot ${meta.badgeClass}`}></span>{meta.label}</span></td>
                    <td className="date-cell">{formatDate(doc.created_at)}</td>
                    <td className="align-right">
                      <button type="button" className="btn btn-danger btn-icon-only" disabled={isBusy} aria-label="Delete document" onClick={() => handleDelete(doc.doc_id, doc.original_filename)}>
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default ProjectView