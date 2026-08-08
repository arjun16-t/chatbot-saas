import { Puzzle } from 'lucide-react'

function WidgetTab() {
  return (
    <div className="mp-widget-placeholder">
      <div className="mp-widget-placeholder-icon">
        <Puzzle size={28} />
      </div>
      <h3>Widget analytics coming soon</h3>
      <p>Embed views, conversation counts, and other widget-level stats will show up here once usage tracking is built.</p>
    </div>
  )
}

export default WidgetTab