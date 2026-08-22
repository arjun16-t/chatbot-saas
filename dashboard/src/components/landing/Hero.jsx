import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import uiSnippetDocument from '../../assets/ui-snippet-document.png'
import uiSnippetChat from '../../assets/ui-snippet-chat.png'
import uiSnippetLatency from '../../assets/ui-snippet-latency.png'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />

      <div className="hero-floating-ui" aria-hidden="true">
        <div className="floating-card float-left">
          <img src={uiSnippetDocument} alt="Document processing UI" />
        </div>
        <div className="floating-card float-bottom">
          <img src={uiSnippetChat} alt="Chat interface UI" />
        </div>
        <div className="floating-card float-right">
          <img src={uiSnippetLatency} alt="Latency metrics UI" />
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-badge reveal">
          <Zap size={14} />
          <span>Live in under 2 minutes.</span>
        </div>

        <h1 className="reveal">Turn your documents into an <span className="text-gradient">AI chatbot.</span></h1>
        <p className="reveal">AthenaChat helps teams instantly vectorize their PDFs, docs, and text files into a highly accurate, deployable AI assistant.</p>

        <div className="hero-actions reveal">
          <Link to="/register" className="btn btn-primary lp-btn-lg">Deploy your chatbot</Link>
        </div>
      </div>
    </section>
  )
}

export default Hero
