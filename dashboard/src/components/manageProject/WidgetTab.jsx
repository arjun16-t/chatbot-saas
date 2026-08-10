import { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageCircleQuestion, ArrowDown, Check, RotateCcw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [busy, setBusy] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [selectedIds, setSelectedIds] = useState(new Set())

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
      setSelectedIds(new Set())
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

  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return items
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      return aVal > bVal ? dir : aVal < bVal ? -dir : 0
    })
  }, [items, sortConfig])

  function toggleSelectAll() {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)))
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulkAction(action) {
    if (selectedIds.size === 0) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/unanswered/bulk/`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Bulk action failed.')
        return
      }
      await fetchList(listUrl)
    } catch (err) {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleResolve(item) {
    setBusy(true)
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
      setBusy(false)
    }
  }

  async function handleDelete(item) {
    setBusy(true)
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
      setBusy(false)
    }
  }

  const allSelected = sortedItems.length > 0 && selectedIds.size === sortedItems.length

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

      {selectedIds.size > 0 && (
        <div className="mp-bulk-toolbar">
          <span>{selectedIds.size} selected</span>
          <div className="mp-bulk-actions">
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => runBulkAction('resolve')}>
              <Check size={14} /> Mark Resolved
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => runBulkAction('unresolve')}>
              <RotateCcw size={14} /> Mark Unresolved
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => runBulkAction('delete')}>
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {error && <p className="form-error mp-settings-error">{error}</p>}

      {isLoading ? (
        <p className="mp-loading">Loading…</p>
      ) : sortedItems.length === 0 ? (
        <div className="mp-widget-placeholder">
          <div className="mp-widget-placeholder-icon">
            <MessageCircleQuestion size={28} />
          </div>
          <h3>No {filter !== 'all' ? filter : ''} queries</h3>
          <p>Questions your chatbot couldn't answer will show up here, so you know what to add to your documents.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="mp-checkbox-col">
                    <input type="checkbox" className="mp-row-checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className={`sortable ${sortConfig.key === 'query' ? 'is-sorted ' + sortConfig.direction : ''}`} onClick={() => handleSort('query')}>
                    <div className="th-content">Query <ArrowDown className="sort-icon" size={14} /></div>
                  </th>
                  <th className={`sortable ${sortConfig.key === 'is_resolved' ? 'is-sorted ' + sortConfig.direction : ''}`} onClick={() => handleSort('is_resolved')}>
                    <div className="th-content">Status <ArrowDown className="sort-icon" size={14} /></div>
                  </th>
                  <th className={`sortable ${sortConfig.key === 'created_at' ? 'is-sorted ' + sortConfig.direction : ''}`} onClick={() => handleSort('created_at')}>
                    <div className="th-content">Date <ArrowDown className="sort-icon" size={14} /></div>
                  </th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="mp-checkbox-col">
                      <input
                        type="checkbox"
                        className="mp-row-checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                      />
                    </td>
                    <td className="mp-query-cell">{item.query}</td>
                    <td>
                      <span className={`badge ${item.is_resolved ? 'badge-success' : 'badge-neutral'}`}>
                        {item.is_resolved ? 'Resolved' : 'Unresolved'}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(item.created_at)}</td>
                    <td className="align-right">
                      <div className="mp-query-actions">
                        <button
                          type="button"
                          className="mp-icon-btn"
                          title={item.is_resolved ? 'Mark unresolved' : 'Mark resolved'}
                          disabled={busy}
                          onClick={() => handleToggleResolve(item)}
                        >
                          {item.is_resolved ? <RotateCcw size={14} /> : <Check size={14} />}
                        </button>
                        <button
                          type="button"
                          className="mp-icon-btn mp-icon-btn-danger"
                          title="Delete"
                          disabled={busy}
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(pagination.next || pagination.previous) && (
            <div className="mp-pagination">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setListUrl(pagination.previous)} disabled={!pagination.previous}>
                <ChevronLeft size={14} /> Previous
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setListUrl(pagination.next)} disabled={!pagination.next}>
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