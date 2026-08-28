import { useState, useEffect, useRef } from 'react'

const fmtCur = (val) => {
  if (val === undefined || val === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: val < 1 ? 2 : 0,
    maximumFractionDigits: val < 1 ? 4 : 2,
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

function LargeChart({ data, color }) {
  const cvRef = useRef(null)

  useEffect(() => {
    if (!cvRef.current || !data || data.length === 0) return
    const cv = cvRef.current
    const ctx = cv.getContext('2d')
    const W = cv.width = cv.clientWidth
    const H = cv.height = 300
    
    ctx.clearRect(0, 0, W, H)
    
    const prices = data.map(d => d[1])
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1
    
    const pts = prices.map((v, i) => ({
      x: (i / (prices.length - 1)) * W,
      y: H - ((v - min) / range) * H * 0.8 - H * 0.1
    }))

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = H * 0.1 + (i / 4) * (H * 0.8)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Fill
    const grd = ctx.createLinearGradient(0, 0, 0, H)
    grd.addColorStop(0, `${color}44`)
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
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()

    // Current price dot
    const last = pts[pts.length - 1]
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
    ctx.fill()

  }, [data, color])

  return <canvas ref={cvRef} style={{ width: '100%', height: '300px', display: 'block' }} />
}

export default function CoinDetails({ coin, onBack }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const isUp = coin.price_change_percentage_24h >= 0
  const color = isUp ? '#10b981' : '#ef4444'

  useEffect(() => {
    const fetchChart = async () => {
      try {
        setLoading(true)
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=30`)
        if (!res.ok) throw new Error('API Rate limit reached')
        const data = await res.json()
        setChartData(data.prices)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchChart()
  }, [coin.id])

  return (
    <div className="db-details-view">
      <div className="db-details-header">
        <button className="db-back-btn" onClick={onBack}>← Back to Market</button>
        <div className="db-details-title">
          <img src={coin.image} alt={coin.name} className="db-details-img" />
          <h1>{coin.name} <span>{coin.symbol.toUpperCase()}</span></h1>
        </div>
      </div>

      <div className="db-details-main">
        <div className="db-details-sidebar">
          <div className="db-details-card">
            <span className="db-details-label">Current Price</span>
            <span className="db-details-val large">{fmtCur(coin.current_price)}</span>
            <span className="db-details-change" style={{ color }}>
              {isUp ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}% (24h)
            </span>
          </div>
          
          <div className="db-details-card">
            <span className="db-details-label">Market Cap Rank</span>
            <span className="db-details-val">#{coin.market_cap_rank}</span>
          </div>

          <div className="db-details-card">
            <span className="db-details-label">Market Cap</span>
            <span className="db-details-val">{fmtCur(coin.market_cap)}</span>
          </div>

          <div className="db-details-card">
            <span className="db-details-label">24h Trading Volume</span>
            <span className="db-details-val">{fmtCur(coin.total_volume)}</span>
          </div>
          
          <div className="db-details-card">
            <span className="db-details-label">Circulating Supply</span>
            <span className="db-details-val">{fmtCompact(coin.circulating_supply)} {coin.symbol.toUpperCase()}</span>
          </div>

          <div className="db-details-card">
            <span className="db-details-label">All-Time High</span>
            <span className="db-details-val">{fmtCur(coin.ath)}</span>
            <span className="db-details-change" style={{ color: coin.ath_change_percentage >= 0 ? '#10b981' : '#ef4444' }}>
              {coin.ath_change_percentage?.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="db-details-chart-panel db-panel">
          <div className="db-panel-header">
            <span className="db-panel-title">Price History (30 Days)</span>
            <span className="db-panel-badge live">● Live</span>
          </div>
          <div className="db-chart-container">
            {loading ? (
              <div className="db-details-loading">
                <span className="db-spin-dot" style={{ width: 24, height: 24, borderWidth: 3 }}></span>
                <p>Fetching history...</p>
              </div>
            ) : error ? (
              <div className="db-error-msg">Failed to load chart: {error}</div>
            ) : (
              <LargeChart data={chartData} color={color} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
