import { Bot, ArrowUp } from 'lucide-react'

function LandingFooter() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="lp-footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-brand">
            <Bot size={18} />
            <span>AthenaChat</span>
          </div>
          <p>© 2026 AthenaChat. Built by Arjun.</p>
        </div>

        <div className="footer-right">
          <button type="button" className="footer-cta-btn" onClick={scrollToTop}>
            Back to top <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
