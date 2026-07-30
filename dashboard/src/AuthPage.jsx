import { useState } from 'react'
import AthenaBotLogo from './assets/AthenaBot.png'

function AuthPage({ initialView = 'signin' }) {
  const [activeView, setActiveView] = useState(initialView)

  const containerClass = activeView === 'signup'
    ? 'auth-flip-container right-active'
    : 'auth-flip-container'

  return (
    <div className={containerClass} id="auth-flip-container">

      {/* SIGN IN form panel */}
      <div className="form-panel form-panel-signin">
        {/* TODO: sign-in form content, next layer */}
      </div>

      {/* SIGN UP form panel */}
      <div className="form-panel form-panel-signup">
        {/* TODO: sign-up form content, next layer */}
      </div>
      {/* Sliding gradient overlay */}
      <div className="overlay-container" id="overlay-container">
        {/* TODO: blobs (ref-based, next layer) */}
        <div className="overlay">
          <div className="overlay-panel overlay-panel-left">
            <div className="logo-mark">
              <img src={AthenaBotLogo} alt="" />
              <span>AthenaChat</span>
            </div>
            <h2>Already deploying with us?</h2>
            <p>Log in to manage your documents and chatbot settings.</p>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveView('signin')}>
              Sign In
            </button>
          </div>

          <div className="overlay-panel overlay-panel-right">
            <div className="logo-mark">
              <img src={AthenaBotLogo} alt="" />
              <span>AthenaChat</span>
            </div>
            <h2>New to AthenaChat?</h2>
            <p>Deploy an AI chatbot trained on your own documents — live in minutes.</p>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveView('signup')}>
              Sign Up
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default AuthPage