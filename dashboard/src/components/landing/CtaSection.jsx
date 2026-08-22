import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// "Read the Docs" secondary button removed per explicit instruction --
// no public docs site exists yet.
function CtaSection() {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <div className="cta-glow" />
        <div className="cta-grid-overlay" />

        <div className="cta-content">
          <div className="cta-badge">Live in under 2 minutes</div>
          <h2 className="cta-heading">Ready to give your documents a voice?</h2>

          <div className="cta-actions">
            <Link to="/register" className="cta-btn primary">
              Deploy your chatbot
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CtaSection
