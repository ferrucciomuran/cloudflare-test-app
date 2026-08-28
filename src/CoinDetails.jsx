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
    
    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1
    const rect = cv.getBoundingClientRect()
    cv.width = rect.width * dpr
    cv.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    const W = rect.width
    const H = rect.height
    
    const PAD_B = 24 // Bottom padding for dates
    const PAD_R = 50 // Right padding for prices
    const cW = W - PAD_R
    const cH = H - PAD_B
    
    const times = data.map(d => d[0])
    const prices = data.map(d => d[1])
    
    const minP = 0
    const maxP = Math.max(...prices)
    const rangeP = maxP - minP || 1
    
    const pts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * cW,
      y: cH - ((d[1] - minP) / rangeP) * cH * 0.8 - cH * 0.1,
      time: d[0],
      price: d[1]
    }))

    let mouseX = null

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // ── Grid & Y-Axis (Prices) ──
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.fillStyle = '#64748b'
      ctx.font = '10px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 1

      for (let i = 0; i <= 4; i++) {
        const y = cH * 0.1 + (i / 4) * (cH * 0.8)
        const priceVal = maxP - (i / 4) * rangeP
        
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(cW, y)
        ctx.stroke()
        
        ctx.fillText(fmtCompact(priceVal), cW + 6, y)
      }

      // ── X-Axis (Dates) ──
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const numLabels = 5
      for (let i = 0; i < numLabels; i++) {
        const idx = Math.floor((i / (numLabels - 1)) * (pts.length - 1))
        const p = pts[idx]
        const d = new Date(p.time)
        const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`
        ctx.fillText(label, p.x, cH + 8)
      }

      // ── Chart Fill ──
      const grd = ctx.createLinearGradient(0, 0, 0, cH)
      grd.addColorStop(0, `${color}44`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(pts[0].x, cH)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(pts[pts.length-1].x, cH)
      ctx.closePath()
      ctx.fill()

      // ── Chart Line ──
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()

      // ── Hover Interactivity ──
      if (mouseX !== null && mouseX >= 0 && mouseX <= cW) {
        // Find closest point
        let closest = pts[0]
        let minDist = Infinity
        for (const p of pts) {
          const dist = Math.abs(p.x - mouseX)
          if (dist < minDist) { minDist = dist; closest = p }
        }

        // Vertical line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(closest.x, 0)
        ctx.lineTo(closest.x, cH)
        ctx.stroke()
        ctx.setLineDash([])

        // Dot
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(closest.x, closest.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#07091a'
        ctx.lineWidth = 2
        ctx.stroke()

        // Tooltip
        const d = new Date(closest.time)
        const dateStr = d.toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
        const priceStr = fmtCur(closest.price)
        
        ctx.font = '600 11px Inter, sans-serif'
        const twDate = ctx.measureText(dateStr).width
        const twPrice = ctx.measureText(priceStr).width
        const tw = Math.max(twDate, twPrice) + 16
        const th = 40
        
        let tx = closest.x - tw / 2
        let ty = closest.y - th - 12
        
        // Boundaries
        if (tx < 0) tx = 0
        if (tx + tw > cW) tx = cW - tw
        if (ty < 0) ty = closest.y + 12

        // Tooltip bg
        ctx.fillStyle = 'rgba(10,12,22,0.9)'
        ctx.beginPath()
        ctx.roundRect(tx, ty, tw, th, 6)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Tooltip text
        ctx.textAlign = 'center'
        ctx.fillStyle = '#94a3b8'
        ctx.font = '10px Inter, sans-serif'
        ctx.fillText(dateStr, tx + tw/2, ty + 6)
        
        ctx.fillStyle = '#f0f2ff'
        ctx.font = '600 11px Inter, sans-serif'
        ctx.fillText(priceStr, tx + tw/2, ty + 20)
      } else {
        // Just draw the last point if not hovering
        const last = pts[pts.length - 1]
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Initial draw
    draw()

    // Event listeners
    const handleMove = (e) => {
      const rect = cv.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      draw()
    }
    const handleLeave = () => {
      mouseX = null
      draw()
    }

    cv.addEventListener('mousemove', handleMove)
    cv.addEventListener('mouseleave', handleLeave)
    
    return () => {
      cv.removeEventListener('mousemove', handleMove)
      cv.removeEventListener('mouseleave', handleLeave)
    }

  }, [data, color])

  return (
    <canvas 
      ref={cvRef} 
      style={{ width: '100%', height: '300px', display: 'block', cursor: 'crosshair' }} 
    />
  )
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
