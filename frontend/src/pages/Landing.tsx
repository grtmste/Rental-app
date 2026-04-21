import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div
      style={{ backgroundColor: '#0A0A0A' }}
      className="min-h-screen w-full flex items-center justify-center relative"
    >
      {/* Company name */}
      <h1
        className="text-white font-bold uppercase select-none"
        style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)', letterSpacing: '0.25em' }}
      >
        STEREO SOUND
      </h1>

      {/* Subtle ADMIN button — top right */}
      <button
        onClick={() => navigate('/login')}
        className="absolute top-6 right-6 px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition-colors duration-200"
        style={{
          color: 'rgba(255,255,255,0.25)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '4px',
          background: 'transparent',
          cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
      >
        ADMIN
      </button>
    </div>
  )
}
