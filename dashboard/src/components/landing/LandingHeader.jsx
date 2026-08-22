import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AthenaBotLogo from '../../assets/AthenaBot.png'

function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`lp-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="logo-group">
        <img src={AthenaBotLogo} alt="AthenaChat logo" />
        <span className="brand-name">AthenaChat</span>
      </div>

      <nav className="lp-nav-links">
        <a href="#how-it-works" className="lp-nav-link">How it works</a>
        <a href="#features" className="lp-nav-link">Features</a>
        <a href="#pricing" className="lp-nav-link">Pricing</a>
      </nav>

      <div className="lp-header-auth">
        <Link to="/login" className="lp-nav-link">Log in</Link>
        <Link to="/register" className="btn btn-primary">Sign up</Link>
      </div>
    </header>
  )
}

export default LandingHeader
