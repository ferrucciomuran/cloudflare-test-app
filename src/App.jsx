import { useState, useEffect } from 'react'
import Globe from './Globe.jsx'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import './App.css'


const CARDS = [
  { id: 'requests', label: 'Requests', icon: '⚡', color: '#7c3aed', suffix: 'K' },
  { id: 'bandwidth', label: 'Bandwidth', icon: '📡', color: '#0ea5e9', suffix: 'GB' },
  { id: 'cached', label: 'Cache Hit Rate', icon: '🛡️', color: '#10b981', suffix: '%' },
  { id: 'latency', label: 'Avg Latency', icon: '🕒', color: '#f59e0b', suffix: 'ms' },
]

function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

function StatCard({ card, value }) {
  const animated = useAnimatedCounter(value)
  return (
    <div className="stat-card" style={{ '--accent': card.color }}>
      <div className="stat-icon">{card.icon}</div>
      <div className="stat-body">
        <span className="stat-value">{animated.toLocaleString()}<span className="stat-suffix">{card.suffix}</span></span>
        <span className="stat-label">{card.label}</span>
      </div>
      <div className="stat-glow" />
    </div>
  )
}

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div className="counter-panel">
      <p className="counter-desc">Interactive Counter</p>
      <div className="counter-display">{count}</div>
      <div className="counter-buttons">
        <button className="btn btn-minus" onClick={() => setCount(c => c - 1)}>−</button>
        <button className="btn btn-reset" onClick={() => setCount(0)}>Reset</button>
        <button className="btn btn-plus" onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  )
}

const STATS = [
  { id: 'requests', value: 1284 },
  { id: 'bandwidth', value: 47 },
  { id: 'cached', value: 94 },
  { id: 'latency', value: 12 },
]

export default function App() {
  const [time, setTime] = useState(new Date())
  const [page, setPage] = useState('home')

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (d) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (page === 'dashboard') {
    return <Dashboard onLogout={() => setPage('home')} />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#lg)" />
              <path d="M8 20c2-4 6-8 12-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10 24c2-3 5-6 10-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#7c3aed"/>
                  <stop offset="1" stopColor="#0ea5e9"/>
                </linearGradient>
              </defs>
            </svg>
            <span>CF Dashboard</span>
          </div>
          <div className="header-clock">{fmt(time)}</div>
          <div className="status-badge">
            <span className="status-dot" />
            Live
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          {/* ── Rotating dot-globe background ───────────────────────────── */}
          <div className="globe-bg" aria-hidden="true">
            <Globe size={680} />
          </div>

          {/* ── Hero text + Login card ────────────────────────────────────── */}
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">Cloudflare Pages<br /><span className="gradient-text">React + Vite</span></h1>
              <p className="hero-sub">Modern frontend · Edge-deployed · Instant worldwide</p>
            </div>
            <Login onLogin={() => setPage('dashboard')} />
          </div>
        </section>

        <section className="stats-grid">
          {STATS.map((s) => (
            <StatCard key={s.id} card={CARDS.find(c => c.id === s.id)} value={s.value} />
          ))}
        </section>

        <section className="bottom-row">
          <Counter />
          <div className="info-panel">
            <p className="info-title">Deploy Info</p>
            <ul className="info-list">
              <li><span>Runtime</span><span>Cloudflare Pages</span></li>
              <li><span>Framework</span><span>React 18 + Vite 5</span></li>
              <li><span>Build cmd</span><code>npm run build</code></li>
              <li><span>Output dir</span><code>dist/</code></li>
              <li><span>Node version</span><span>18+</span></li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Built with React + Vite · Deployed on Cloudflare Pages</p>
      </footer>
    </div>
  )
}
