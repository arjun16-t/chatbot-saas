import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import HeroIllustration from './HeroIllustration.jsx'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />

      <div className="hero-inner">
        <div className="hero-text-col">
          <h1 className="reveal">Turn your documents into an <span className="text-gradient">AI chatbot.</span></h1>
          <p className="reveal">Upload your docs and get a working chatbot on your site in minutes — no vector database to set up, no infrastructure to manage.</p>

          <div className="hero-actions reveal">
            <Link to="/register" className="btn btn-primary lp-btn-lg">Deploy your chatbot</Link>
            <span className="hero-cta-caption"><Zap size={12} /> Live in under 2 minutes — free to try</span>
          </div>
        </div>

        <div className="hero-illustration-col reveal">
          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}

export default Hero