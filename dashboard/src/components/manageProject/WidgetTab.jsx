import { useState, useEffect, useCallback } from 'react'
import { MessageCircleQuestion, Check, RotateCcw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

import { useAuth } from '../../AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const FILTERS = [
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildInitialUrl(projectId, filter) {
  const base = `${API_BASE}/api/projects/${projectId}/unanswered/`
  if (filter === 'all') return base
  return `${base}?is_resolved=${filter === 'resolved' ? 'True' : 'False'}`
}

function WidgetTab({ projectId }) {
  const { accessToken } = useAuth()

  const [filter, setFilter] = useState('unresolved')
  const [listUrl, setListUrl] = useState(() => buildInitialUrl(projectId, 'unresolved'))
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState(new Set())

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  const fetchList = useCallback(async (url) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(url, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not load unanswered queries.')
        return
      }
      const page = data.data
      setItems(page.results)
      setPagination({ count: page.count, next: page.next, previous: page.previous })
    } catch (err) {
      setError('Could not reach the server.')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    fetchList(listUrl)
  }, [listUrl, fetchList])

  function handleFilterChange(newFilter) {
    setFilter(newFilter)
    setListUrl(buildInitialUrl(projectId, newFilter))
  }

  function setBusy(id, busy) {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function handleToggleResolve(item) {
    setBusy(item.id, true)
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/unanswered/${item.id}/`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_resolved: !item.is_resolved }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not update this query.')
        return
      }
      await fetchList(listUrl)
    } catch (err) {
      setError('Could not reach the server.')
    } finally {
      setBusy(item.id, false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('Delete this unanswered query? This cannot be undone.')) return
    setBusy(item.id, true)
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/unanswered/${item.id}/`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not delete this query.')
        return
      }
      await fetchList(listUrl)
    } catch (err) {
      setError('Could not reach the server.')
    } finally {
      setBusy(item.id, false)
    }
  }

  return (
    <div className="mp-widget-queries">
      <div className="mp-filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`mp-filter-tab ${filter === f.id ? 'is-active' : ''}`}
            onClick={() => handleFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="mp-filter-count">{pagination.count} total</span>
      </div>

      {error && <p className="form-error mp-settings-error">{error}</p>}

      {isLoading ? (
        <p className="mp-loading">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mp-widget-placeholder">
          <div className="mp-widget-placeholder-icon">
            <MessageCircleQuestion size={28} />
          </div>
          <h3>No {filter !== 'all' ? filter : ''} queries</h3>
          <p>Questions your chatbot couldn't answer will show up here, so you know what to add to your documents.</p>
        </div>
      ) : (
        <>
          <div className="mp-query-list">
            {items.map((item) => (
              <div key={item.id} className="mp-query-row">
                <div className="mp-query-text">
                  <p>{item.query}</p>
                  <span className="mp-meta-label">{formatDate(item.created_at)}</span>
                </div>
                <span className={`badge ${item.is_resolved ? 'badge-success' : 'badge-neutral'}`}>
                  {item.is_resolved ? 'Resolved' : 'Unresolved'}
                </span>
                <div className="mp-query-actions">
                  <button
                    type="button"
                    className="mp-icon-btn"
                    title={item.is_resolved ? 'Mark unresolved' : 'Mark resolved'}
                    onClick={() => handleToggleResolve(item)}
                    disabled={busyIds.has(item.id)}
                  >
                    {item.is_resolved ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    className="mp-icon-btn mp-icon-btn-danger"
                    title="Delete"
                    onClick={() => handleDelete(item)}
                    disabled={busyIds.has(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {(pagination.next || pagination.previous) && (
            <div className="mp-pagination">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setListUrl(pagination.previous)}
                disabled={!pagination.previous}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setListUrl(pagination.next)}
                disabled={!pagination.next}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default WidgetTab