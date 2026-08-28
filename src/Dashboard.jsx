import { useState, useEffect, useRef } from 'react'
import './Dashboard.css'

// ── Animated counter ───────────────────────────────────────────────────────────
function useCounter(target, dur = 1600) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let cur = 0
    const step = target / (dur / 16)
    const t = setInterval(() => {
      cur += step
      if (cur >= target) { setV(target); clearInterval(t) }
      else setV(cur)
    }, 16)
    return () => clearInterval(t)
  }, [target, dur])
  return v
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCur = (val, maxDecimals = 2) => {
  if (val === undefined || val === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: val < 1 ? 2 : 0,
    maximumFractionDigits: val < 1 ? 4 : maxDecimals,
  }).format(val)
}

const fmtCompact = (val) => {
  if (val === undefined || val === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(val)
}

// ── Sparkline Canvas ──────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  const cvRef = useRef(null)

  useEffect(() => {
    if (!cvRef.current || !data || data.length === 0) return
    const cv = cvRef.current
    const ctx = cv.getContext('2d')
    const W = cv.width = 120
    const H = cv.height = 40
    
    ctx.clearRect(0, 0, W, H)
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1 // avoid div by zero
    
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * W,
      y: H - ((v - min) / range) * H * 0.8 - H * 0.1 // 10% padding top/bottom
    }))

    // Fill
    const grd = ctx.createLinearGradient(0, 0, 0, H)
    grd.addColorStop(0, `${color}33`) // 20% opacity
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.moveTo(pts[0].x, H)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length-1].x, H)
    ctx.closePath()
    ctx.fill()

    // Line
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()
  }, [data, color])

  return <canvas ref={cvRef} style={{ width: '120px', height: '40px' }} />
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, isCurrency = false, isCompact = false, delta, color }) {
  const target = parseFloat(value) || 0
  const n = useCounter(target)
  
  let displayValue = value
  if (typeof value === 'number') {
    if (isCompact) displayValue = fmtCompact(n)
    else if (isCurrency) displayValue = fmtCur(n)
    else displayValue = Math.floor(n).toLocaleString()
  }

  return (
    <div className="db-metric" style={{ '--mc': color }}>
      <div className="db-metric-icon">{icon}</div>
      <div className="db-metric-body">
        <span className="db-metric-val">{displayValue}</span>
        <span className="db-metric-label">{label}</span>
        {delta !== undefined && (
          <span className={`db-metric-delta ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}% (24h)
          </span>
        )}
      </div>
      <div className="db-metric-glow" />
    </div>
  )
}

// ── Sidebar nav ───────────────────────────────────────────────────────────────
const NAV = [
  { icon:'📈', label:'Volume',  active:true  },
  { icon:'🔥', label:'Trending'              },
  { icon:'💼', label:'Portfolio'             },
  { icon:'🌐', label:'DeFi'                  },
  { icon:'⚙',  label:'Settings'              },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [time, setTime] = useState(new Date())
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [globalData, setGlobalData] = useState({ vol: 0, btc: 0, gainer: null })

  // Clock
  useEffect(() => {
    const tc = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tc)
  }, [])

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch top 50 coins by volume
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h')
        if (!res.ok) throw new Error('API Rate limit reached or error')
        const data = await res.json()
        
        setCoins(data)
        
        // Calculate global metrics
        const totalVol = data.reduce((acc, c) => acc + (c.total_volume || 0), 0)
        const btc = data.find(c => c.symbol === 'btc')
        
        // Find top gainer
        let topGainer = data[0]
        data.forEach(c => {
          if (c.price_change_percentage_24h > (topGainer?.price_change_percentage_24h || -999)) {
            topGainer = c
          }
        })
        
        setGlobalData({ vol: totalVol, btc: btc?.current_price || 0, gainer: topGainer })
        setError(null)
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Poll every 60s to avoid rate limit (CoinGecko free limit ~10-30/min)
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fmt = d => d.toLocaleTimeString('en-GB',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const fmtDate = d => d.toLocaleDateString('en-GB',{ weekday:'short', day:'numeric', month:'short' })

  return (
    <div className="db">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" fill="url(#dbl)" />
            <path d="M16 8l7 4-7 4-7-4 7-4zM9 16l7 4 7-4M9 21l7 4 7-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="dbl" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#10b981"/><stop offset="1" stopColor="#0ea5e9"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <nav className="db-nav">
          {NAV.map(n => (
            <button key={n.label} className={`db-nav-btn${n.active?' active':''}`} title={n.label}>
              {n.icon}
            </button>
          ))}
        </nav>
        <button className="db-nav-btn db-logout" title="Logout" onClick={onLogout}>⏻</button>
      </aside>

      {/* ── Body ── */}
      <div className="db-body">
        {/* Header */}
        <header className="db-header">
          <div className="db-header-left">
            <span className="db-breadcrumb">Crypto Markets</span>
            <span className="db-sep">›</span>
            <span className="db-page-title">Volume Analysis</span>
          </div>
          <div className="db-header-right">
            {loading ? (
              <div className="db-live" style={{ color: '#0ea5e9' }}><span className="db-spin-dot"/>SYNCING</div>
            ) : error ? (
              <div className="db-live" style={{ color: '#ef4444' }}><span className="db-live-dot" style={{ background: '#ef4444' }}/>ERROR</div>
            ) : (
              <div className="db-live"><span className="db-live-dot"/>LIVE</div>
            )}
            <div className="db-clock">
              <span className="db-time">{fmt(time)}</span>
              <span className="db-date">{fmtDate(time)}</span>
            </div>
            <div className="db-user">
              <div className="db-avatar">T</div>
              <span>trader</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="db-main">
          {/* Metric cards */}
          <div className="db-metrics-row">
            <MetricCard 
              icon="📊" 
              label="Top 50 24h Volume" 
              value={globalData.vol} 
              isCompact 
              color="#0ea5e9" 
            />
            <MetricCard 
              icon="₿" 
              label="BTC Price" 
              value={globalData.btc} 
              isCurrency 
              color="#f59e0b" 
            />
            {globalData.gainer ? (
              <MetricCard 
                icon="🚀" 
                label={`Top Gainer: ${globalData.gainer.symbol.toUpperCase()}`} 
                value={globalData.gainer.current_price} 
                isCurrency
                delta={globalData.gainer.price_change_percentage_24h}
                color="#10b981" 
              />
            ) : (
              <MetricCard icon="🚀" label="Top Gainer" value={0} color="#10b981" />
            )}
            <MetricCard 
              icon="⚡" 
              label="API Status" 
              value="Nominal" 
              color="#7c3aed" 
            />
          </div>

          {/* Table Panel */}
          <div className="db-panel db-table-panel">
            <div className="db-panel-header">
              <span className="db-panel-title">Volume Leaderboard (Top 50)</span>
              <span className="db-panel-badge live">● CoinGecko Data</span>
            </div>
            
            <div className="db-table-container">
              {error ? (
                <div className="db-error-msg">
                  Failed to fetch data: {error}. Please try again in a minute (Rate Limit).
                </div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ textAlign: 'left' }}>Asset</th>
                      <th>Price</th>
                      <th>24h Change</th>
                      <th>24h Volume</th>
                      <th>Market Cap</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Last 7 Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coins.map((coin, idx) => {
                      const isUp = coin.price_change_percentage_24h >= 0
                      const color = isUp ? '#10b981' : '#ef4444'
                      return (
                        <tr key={coin.id}>
                          <td className="db-td-rank">{idx + 1}</td>
                          <td>
                            <div className="db-td-asset">
                              <img src={coin.image} alt={coin.name} className="db-coin-img" />
                              <div className="db-coin-info">
                                <span className="db-coin-name">{coin.name}</span>
                                <span className="db-coin-sym">{coin.symbol.toUpperCase()}</span>
                              </div>
                            </div>
                          </td>
                          <td className="db-td-num">{fmtCur(coin.current_price)}</td>
                          <td className="db-td-num" style={{ color, fontWeight: 600 }}>
                            {isUp ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                          </td>
                          <td className="db-td-num">{fmtCompact(coin.total_volume)}</td>
                          <td className="db-td-num">{fmtCompact(coin.market_cap)}</td>
                          <td style={{ padding: '4px 8px' }}>
                            {coin.sparkline_in_7d?.price && (
                              <Sparkline data={coin.sparkline_in_7d.price} color={color} />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {coins.length === 0 && !error && (
                      Array(10).fill(0).map((_, i) => (
                        <tr key={i} className="db-skeleton-row">
                          <td colSpan="7"><div className="db-skeleton-pulse"></div></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
