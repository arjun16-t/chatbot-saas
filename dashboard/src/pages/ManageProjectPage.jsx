import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LayoutGrid, SlidersHorizontal, Puzzle } from 'lucide-react'

import ProjectHeaderCard from '../components/manageProject/ProjectHeaderCard.jsx'
import OverviewTab from '../components/manageProject/OverviewTab.jsx'
import SettingsTab from '../components/manageProject/SettingsTab.jsx'
import WidgetTab from '../components/manageProject/WidgetTab.jsx'
import '../styles/manageProject.css'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'widget', label: 'Widget', icon: Puzzle },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
]

function ManageProjectPage() {
  const { activeProject, documents, fetchProjects } = useOutletContext()
  const [activeTab, setActiveTab] = useState('overview')

  if (!activeProject) {
    return <div className="mp-loading">Loading project…</div>
  }

  return (
    <div className="mp-page">
      <ProjectHeaderCard project={activeProject} />

      <div className="mp-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`mp-tab ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mp-tab-content">
        {activeTab === 'overview' && (
          <OverviewTab project={activeProject} documents={documents} onProjectUpdated={fetchProjects} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab project={activeProject} onProjectUpdated={fetchProjects} />
        )}
        {activeTab === 'widget' && <WidgetTab />}
      </div>
    </div>
  )
}

export default ManageProjectPage