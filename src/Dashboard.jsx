import { useState, useEffect, useRef } from 'react'
import './Dashboard.css'

// ── Crypto data ───────────────────────────────────────────────────────────────
const COINS = [
  { id:'usdt', name:'Tether',     sym:'USDT', price:1.0000,  vol:62.4e9, mc:114.2e9, chg: 0.01, vp:0.00005, color:'#26a17b' },
  { id:'btc',  name:'Bitcoin',    sym:'BTC',  price:65420,   vol:38.1e9, mc:1.284e12,chg: 2.14, vp:0.0015,  color:'#f7931a' },
  { id:'eth',  name:'Ethereum',   sym:'ETH',  price:3482,    vol:19.3e9, mc:418.4e9, chg: 1.87, vp:0.0018,  color:'#627eea' },
  { id:'usdc', name:'USD Coin',   sym:'USDC', price:0.9999,  vol:9.1e9,  mc:43.1e9,  chg:-0.01, vp:0.00005, color:'#2775ca' },
  { id:'bnb',  name:'BNB',        sym:'BNB',  price:605,     vol:7.8e9,  mc:90.3e9,  chg: 0.95, vp:0.0020,  color:'#f0b90b' },
  { id:'sol',  name:'Solana',     sym:'SOL',  price:178.4,   vol:5.5e9,  mc:82.1e9,  chg: 3.42, vp:0.0030,  color:'#9945ff' },
  { id:'xrp',  name:'XRP',        sym:'XRP',  price:0.621,   vol:4.8e9,  mc:35.2e9,  chg:-0.73, vp:0.0025,  color:'#00aae4' },
  { id:'doge', name:'Dogecoin',   sym:'DOGE', price:0.1824,  vol:3.2e9,  mc:26.4e9,  chg: 4.15, vp:0.0045,  color:'#c2a633' },
  { id:'ada',  name:'Cardano',    sym:'ADA',  price:0.485,   vol:1.8e9,  mc:17.1e9,  chg:-1.23, vp:0.0030,  color:'#0033ad' },
  { id:'avax', name:'Avalanche',  sym:'AVAX', price:38.52,   vol:1.2e9,  mc:16.0e9,  chg: 2.67, vp:0.0040,  color:'#e84142' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(n) {
  if (!n) return '$0'
  if (n >= 10000) return '$' + n.toLocaleString('en', { maximumFractionDigits: 0 })
  if (n >= 1000)  return '$' + n.toLocaleString('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (n >= 1)     return '$' + n.toFixed(2)
  if (n >= 0.001) return '$' + n.toFixed(4)
  return '$' + n.toFixed(6)
}
function fmtBig(n) {
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T'
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(1) + 'B'
  return '$' + (n/1e6).toFixed(0) + 'M'
}
function fmtChg(n) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%' }

function makeHistory(base, vp, n = 120) {
  const h = []
  let cur = base * (0.93 + Math.random() * 0.05)
  for (let i = 0; i < n; i++) {
    const d = (Math.random() - 0.495) * cur * vp * 3
    cur = Math.max(cur * 0.8, cur + d)
    h.push(cur)
  }
  h[n - 1] = base
  return h
}

// ── Live prices hook ──────────────────────────────────────────────────────────
function useLivePrices() {
  const [data, setData] = useState(() => {
    const d = {}
    COINS.forEach(c => {
      const history = makeHistory(c.price, c.vp)
      d[c.id] = { price: c.price, chg24h: c.chg, history }
    })
    return d
  })

  useEffect(() => {
    const t = setInterval(() => {
      setData(prev => {
        const next = {}
        COINS.forEach(c => {
          const old = prev[c.id]
          const delta = (Math.random() - 0.498) * old.price * c.vp * 2.5
          const price = Math.max(old.price * 0.85, old.price + delta)
          const history = [...old.history.slice(1), price]
          const chg24h = ((price - history[0]) / history[0]) * 100
          next[c.id] = { price, chg24h, history }
        })
        return next
      })
    }, 1400)
    return () => clearInterval(t)
  }, [])

  return data
}

// ── Coin icon ─────────────────────────────────────────────────────────────────
function CoinIcon({ coin, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${coin.color}28, ${coin.color}0a)`,
      border: `1.5px solid ${coin.color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: coin.color,
      flexShrink: 0, letterSpacing: '-0.02em',
      boxShadow: `0 0 8px ${coin.color}22`,
    }}>
      {coin.sym[0]}
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ history, color, positive }) {
  if (!history || history.length < 2) return null
  const step = Math.floor(history.length / 10)
  const pts = Array.from({ length: 10 }, (_, i) => history[i * step] ?? history[history.length - 1])
  const min = Math.min(...pts), max = Math.max(...pts)
  const rng = max - min || pts[0] * 0.002
  const W = 80, H = 30
  const coords = pts.map((v, i) =>
    `${(i / 9) * W},${H - ((v - min) / rng) * (H * 0.86) - H * 0.04}`
  ).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      <polyline points={coords} fill="none" stroke={positive ? '#00c896' : '#ff4d6a'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Price chart (Canvas) ──────────────────────────────────────────────────────
function PriceChart({ coinId, liveData }) {
  const cvRef   = useRef(null)
  const dataRef = useRef(liveData)
  const idRef   = useRef(coinId)

  useEffect(() => { dataRef.current = liveData }, [liveData])
  useEffect(() => { idRef.current = coinId }, [coinId])

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    cv.width = 600; cv.height = 220

    let raf
    function draw() {
      const coin = COINS.find(c => c.id === idRef.current)
      const d    = dataRef.current[idRef.current]
      if (!coin || !d) { raf = requestAnimationFrame(draw); return }

      const W = 600, H = 220
      const PAD = { t: 38, r: 16, b: 36, l: 72 }
      const cW = W - PAD.l - PAD.r
      const cH = H - PAD.t - PAD.b

      ctx.clearRect(0, 0, W, H)

      const { history, price, chg24h } = d
      const min = Math.min(...history) * 0.9985
      const max = Math.max(...history) * 1.0015
      const rng = max - min || 1

      // Grid
      for (let i = 0; i <= 4; i++) {
        const y   = PAD.t + (i / 4) * cH
        const val = max - (i / 4) * rng
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke()
        ctx.fillStyle = 'rgba(148,163,184,0.45)'; ctx.font = '10px Inter'
        ctx.textAlign = 'right'
        ctx.fillText(fmtPrice(val).replace('$',''), PAD.l - 5, y + 3)
      }

      // Points
      const pts = history.map((v, i) => ({
        x: PAD.l + (i / (history.length - 1)) * cW,
        y: PAD.t + ((max - v) / rng) * cH,
      }))

      // Area
      const grd = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH)
      grd.addColorStop(0, coin.color + '28'); grd.addColorStop(1, coin.color + '00')
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.moveTo(pts[0].x, PAD.t + cH)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(pts[pts.length - 1].x, PAD.t + cH)
      ctx.closePath(); ctx.fill()

      // Line
      ctx.strokeStyle = coin.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'
      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()

      // Last dot
      const last = pts[pts.length - 1]
      ctx.fillStyle = coin.color
      ctx.beginPath(); ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2); ctx.fill()

      // Price overlay
      ctx.fillStyle = '#f0f2ff'; ctx.font = 'bold 20px Inter'; ctx.textAlign = 'left'
      ctx.fillText(fmtPrice(price), PAD.l, 26)
      ctx.fillStyle = chg24h >= 0 ? '#00c896' : '#ff4d6a'
      ctx.font = 'bold 13px Inter'
      ctx.fillText(fmtChg(chg24h), PAD.l + (price >= 1000 ? 130 : price >= 100 ? 90 : 70), 26)

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, []) // stable loop, reads from refs

  return <canvas ref={cvRef} style={{ width:'100%', height:'100%', display:'block' }} />
}

// ── Scrolling ticker ──────────────────────────────────────────────────────────
function Ticker({ liveData }) {
  const items = [...COINS, ...COINS].map((c, i) => {
    const d = liveData[c.id]
    const chg = d?.chg24h ?? c.chg
    return (
      <span key={i} className="ticker-item">
        <span className="ticker-sym" style={{ color: c.color }}>{c.sym}</span>
        <span className="ticker-price">{fmtPrice(d?.price ?? c.price)}</span>
        <span className={`ticker-chg ${chg >= 0 ? 'pos' : 'neg'}`}>{fmtChg(chg)}</span>
      </span>
    )
  })
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">{items}</div>
    </div>
  )
}

// ── Market card ───────────────────────────────────────────────────────────────
function MarketCard({ icon, label, value, sub, color, subPositive }) {
  return (
    <div className="mk-card" style={{ '--mc': color }}>
      <div className="mk-icon">{icon}</div>
      <div className="mk-body">
        <span className="mk-val">{value}</span>
        <span className="mk-label">{label}</span>
        {sub && <span className={`mk-sub ${subPositive != null ? (subPositive ? 'pos' : 'neg') : ''}`}>{sub}</span>}
      </div>
      <div className="mk-glow" />
    </div>
  )
}

// ── Top movers ────────────────────────────────────────────────────────────────
function TopMovers({ liveData }) {
  const ranked = COINS.map(c => ({
    ...c, chg: liveData[c.id]?.chg24h ?? c.chg, price: liveData[c.id]?.price ?? c.price,
  })).sort((a, b) => b.chg - a.chg)

  const gainers = ranked.slice(0, 4)
  const losers  = ranked.slice(-4).reverse()

  const Row = ({ coin }) => (
    <div className="tm-row">
      <CoinIcon coin={coin} size={26} />
      <div className="tm-info">
        <span className="tm-sym">{coin.sym}</span>
        <span className="tm-price">{fmtPrice(coin.price)}</span>
      </div>
      <span className={`tm-chg ${coin.chg >= 0 ? 'pos' : 'neg'}`}>{fmtChg(coin.chg)}</span>
    </div>
  )

  return (
    <div className="top-movers">
      <div className="tm-section">
        <p className="tm-head pos">▲ Top Gainers</p>
        {gainers.map(c => <Row key={c.id} coin={c} />)}
      </div>
      <div className="tm-divider" />
      <div className="tm-section">
        <p className="tm-head neg">▼ Top Losers</p>
        {losers.map(c => <Row key={c.id} coin={c} />)}
      </div>
    </div>
  )
}

// ── Coin table ─────────────────────────────────────────────────────────────────
function CoinTable({ liveData, selected, onSelect }) {
  const rows = COINS.map((c, i) => {
    const d = liveData[c.id]
    return { ...c, rank: i + 1, price: d?.price ?? c.price, chg24h: d?.chg24h ?? c.chg, history: d?.history ?? [] }
  }).sort((a, b) => b.vol - a.vol)

  return (
    <div className="coin-table">
      <div className="ct-head">
        <span className="ct-rank">#</span>
        <span className="ct-name">Asset</span>
        <span className="ct-right">Price</span>
        <span className="ct-right">24h Change</span>
        <span className="ct-right">Volume 24h</span>
        <span className="ct-right">Market Cap</span>
        <span className="ct-right">7d</span>
      </div>
      <div className="ct-body">
        {rows.map((c, i) => (
          <div
            key={c.id}
            className={`ct-row ${selected === c.id ? 'selected' : ''}`}
            onClick={() => onSelect(c.id)}
            style={{ '--coin-color': c.color }}
          >
            <span className="ct-rank ct-cell">{i + 1}</span>
            <span className="ct-cell ct-name-cell">
              <CoinIcon coin={c} size={28} />
              <span className="ct-coin-info">
                <span className="ct-coin-name">{c.name}</span>
                <span className="ct-coin-sym">{c.sym}</span>
              </span>
            </span>
            <span className="ct-cell ct-right ct-price">{fmtPrice(c.price)}</span>
            <span className={`ct-cell ct-right ct-chg ${c.chg24h >= 0 ? 'pos' : 'neg'}`}>
              {fmtChg(c.chg24h)}
            </span>
            <span className="ct-cell ct-right ct-muted">{fmtBig(c.vol)}</span>
            <span className="ct-cell ct-right ct-muted">{fmtBig(c.mc)}</span>
            <span className="ct-cell ct-right">
              <Sparkline history={c.history} color={c.color} positive={c.chg24h >= 0} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { icon:'◈', label:'Overview', active:true },
  { icon:'📈', label:'Markets'               },
  { icon:'🔔', label:'Alerts'                },
  { icon:'💼', label:'Portfolio'             },
  { icon:'📰', label:'News'                  },
  { icon:'⚙',  label:'Settings'             },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [time,     setTime]     = useState(new Date())
  const [selected, setSelected] = useState('btc')
  const liveData = useLivePrices()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt     = d => d.toLocaleTimeString('en-GB',  { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const fmtDate = d => d.toLocaleDateString('en-GB',  { weekday:'short', day:'numeric', month:'short' })

  // Aggregate market stats
  const totalMC  = COINS.reduce((s, c) => s + (liveData[c.id]?.price ?? c.price) / c.price * c.mc, 0)
  const totalVol = COINS.reduce((s, c) => s + c.vol, 0)
  const btcMC    = (liveData['btc']?.price ?? COINS[1].price) / COINS[1].price * COINS[1].mc
  const btcDom   = (btcMC / totalMC * 100).toFixed(1)
  const topGainer = COINS.reduce((best, c) => {
    const chg = liveData[c.id]?.chg24h ?? c.chg
    return chg > (liveData[best.id]?.chg24h ?? best.chg) ? c : best
  }, COINS[0])
  const topGainerChg = liveData[topGainer.id]?.chg24h ?? topGainer.chg

  const selectedCoin = COINS.find(c => c.id === selected)

  return (
    <div className="db">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <span style={{ fontSize: '1.3rem' }}>◈</span>
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

      {/* Body */}
      <div className="db-body">
        {/* Header */}
        <header className="db-header">
          <div className="db-header-left">
            <span className="db-breadcrumb">CryptoEdge</span>
            <span className="db-sep">›</span>
            <span className="db-page-title">Market Overview</span>
          </div>
          <div className="db-header-right">
            <div className="db-live"><span className="db-live-dot"/>24/7 OPEN</div>
            <div className="db-clock">
              <span className="db-time">{fmt(time)}</span>
              <span className="db-date">{fmtDate(time)}</span>
            </div>
          </div>
        </header>

        {/* Ticker */}
        <Ticker liveData={liveData} />

        {/* Main */}
        <main className="db-main">
          {/* Market cards */}
          <div className="db-metrics-row">
            <MarketCard icon="🌐" label="Global Market Cap"  value={fmtBig(totalMC)}  sub="+1.2% today"  color="#7c3aed" subPositive={true} />
            <MarketCard icon="📊" label="24h Trading Volume" value={fmtBig(totalVol)} sub="Top 10 coins" color="#0ea5e9" />
            <MarketCard icon="₿"  label="BTC Dominance"     value={btcDom + '%'}      sub="Market share" color="#f7931a" />
            <MarketCard icon="🚀" label="Top Gainer 24h"    value={topGainer.sym}
              sub={fmtChg(topGainerChg)} color={topGainer.color} subPositive={true} />
          </div>

          {/* Chart + Movers */}
          <div className="db-chart-row">
            <div className="db-panel">
              <div className="db-panel-header">
                <div className="chart-tabs">
                  {COINS.filter((_, i) => i < 6).map(c => (
                    <button
                      key={c.id}
                      className={`chart-tab ${selected === c.id ? 'active' : ''}`}
                      style={{ '--tc': c.color }}
                      onClick={() => setSelected(c.id)}
                    >
                      {c.sym}
                    </button>
                  ))}
                </div>
                <span className="db-panel-badge live">● Live</span>
              </div>
              <div className="db-chart-area" style={{ height: 220 }}>
                <PriceChart coinId={selected} liveData={liveData} />
              </div>
            </div>

            <div className="db-panel">
              <div className="db-panel-header">
                <span className="db-panel-title">Top Movers</span>
              </div>
              <TopMovers liveData={liveData} />
            </div>
          </div>

          {/* Volume table */}
          <div className="db-panel" style={{ padding: 0 }}>
            <div className="db-panel-header" style={{ padding: '12px 20px' }}>
              <span className="db-panel-title">Volume Rankings</span>
              <span className="db-panel-badge">Sorted by 24h Volume</span>
            </div>
            <CoinTable liveData={liveData} selected={selected} onSelect={setSelected} />
          </div>
        </main>
      </div>
    </div>
  )
}
