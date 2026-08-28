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
    
    // State for zoom/pan
    let scale = 1
    let offsetX = 0
    let mouseX = null
    let isDragging = false
    let lastDragX = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      
      // Calculate visible data bounds
      const getIndex = (x) => {
        const raw = (x - offsetX) / scale / cW * (data.length - 1)
        return Math.max(0, Math.min(data.length - 1, raw))
      }
      
      const startIdx = Math.floor(getIndex(0))
      const endIdx = Math.ceil(getIndex(cW))
      
      let maxP = 0
      for (let i = startIdx; i <= endIdx; i++) {
        if (data[i][1] > maxP) maxP = data[i][1]
      }
      if (maxP === 0) maxP = Math.max(...data.map(d => d[1]))
      const minP = 0
      const rangeP = maxP - minP || 1

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

      // Generate transformed points
      const pts = []
      const safeStart = Math.max(0, startIdx - 5)
      const safeEnd = Math.min(data.length - 1, endIdx + 5)
      
      for (let i = safeStart; i <= safeEnd; i++) {
        const d = data[i]
        const px = (i / (data.length - 1)) * cW * scale + offsetX
        const py = cH - ((d[1] - minP) / rangeP) * cH * 0.8 - cH * 0.1
        pts.push({ x: px, y: py, time: d[0], price: d[1] })
      }

      if (pts.length === 0) return

      // ── X-Axis (Dates) ──
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const numLabels = 5
      for (let i = 0; i < numLabels; i++) {
        const xPos = cW * (i / (numLabels - 1))
        const idx = Math.floor(getIndex(xPos))
        if (idx >= 0 && idx < data.length) {
          const d = new Date(data[idx][0])
          const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`
          ctx.fillText(label, xPos, cH + 8)
        }
      }

      // ── Chart Fill ──
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, cW, H)
      ctx.clip()

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
      
      ctx.shadowColor = color
      ctx.shadowBlur = 16
      ctx.shadowOffsetY = 6
      ctx.shadowOffsetX = 0
      
      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()
      
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      // ── Hover Interactivity ──
      if (mouseX !== null && mouseX >= 0 && mouseX <= cW && !isDragging) {
        let closest = pts[0]
        let minDist = Infinity
        for (const p of pts) {
          const dist = Math.abs(p.x - mouseX)
          if (dist < minDist) { minDist = dist; closest = p }
        }

        if (closest) {
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(closest.x, 0)
          ctx.lineTo(closest.x, cH)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(closest.x, closest.y, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#07091a'
          ctx.lineWidth = 2
          ctx.stroke()

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
          
          if (tx < 0) tx = 0
          if (tx + tw > cW) tx = cW - tw
          if (ty < 0) ty = closest.y + 12

          ctx.fillStyle = 'rgba(10,12,22,0.9)'
          ctx.beginPath()
          ctx.roundRect(tx, ty, tw, th, 6)
          ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,0.1)'
          ctx.lineWidth = 1
          ctx.stroke()

          ctx.textAlign = 'center'
          ctx.fillStyle = '#94a3b8'
          ctx.font = '10px Inter, sans-serif'
          ctx.fillText(dateStr, tx + tw/2, ty + 6)
          
          ctx.fillStyle = '#f0f2ff'
          ctx.font = '600 11px Inter, sans-serif'
          ctx.fillText(priceStr, tx + tw/2, ty + 20)
        }
      } else if (!isDragging) {
        const last = pts[pts.length - 1]
        if (last && last.x <= cW && last.x >= 0) {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      ctx.restore() // remove clip
    }

    draw()

    const clampOffset = (newScale, newOffset) => {
      const minOffset = cW - cW * newScale
      return Math.min(0, Math.max(minOffset, newOffset))
    }

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = cv.getBoundingClientRect()
      const mx = e.clientX - rect.left
      if (mx > cW) return 

      // Trackpad Due-Dita Orizzontale o Mouse Wheel + Shift = Panning
      const isPan = (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) || e.shiftKey

      if (isPan) {
        const panAmount = e.shiftKey ? e.deltaY : e.deltaX
        offsetX = clampOffset(scale, offsetX - panAmount)
      } else {
        // Pinch-to-zoom su Trackpad (ctrlKey) o Mouse Wheel verticale = Zoom
        // L'uso di Math.exp rende lo zoom fluido su trackpad
        const zoomSpeed = 0.005
        const zoomFactor = Math.exp(-e.deltaY * zoomSpeed)
        
        let newScale = scale * zoomFactor
        if (newScale < 1) newScale = 1
        if (newScale > 50) newScale = 50

        let newOffset = mx - ((mx - offsetX) / scale) * newScale
        newOffset = clampOffset(newScale, newOffset)

        scale = newScale
        offsetX = newOffset
      }

      mouseX = mx
      requestAnimationFrame(draw)
    }

    const handleDown = (e) => {
      const rect = cv.getBoundingClientRect()
      const mx = e.clientX - rect.left
      if (mx > cW) return
      isDragging = true
      lastDragX = e.clientX
      cv.style.cursor = 'grabbing'
    }

    const handleMove = (e) => {
      const rect = cv.getBoundingClientRect()
      const newMouseX = e.clientX - rect.left
      
      // Update hover tooltip
      if (!isDragging) {
        mouseX = newMouseX
      } else {
        mouseX = null // Hide tooltip while dragging
        const deltaX = e.clientX - lastDragX
        offsetX = clampOffset(scale, offsetX + deltaX)
        lastDragX = e.clientX
      }
      requestAnimationFrame(draw)
    }

    const handleUp = () => {
      isDragging = false
      cv.style.cursor = 'crosshair'
      requestAnimationFrame(draw)
    }

    const handleLeave = () => {
      isDragging = false
      mouseX = null
      cv.style.cursor = 'crosshair'
      requestAnimationFrame(draw)
    }

    cv.addEventListener('wheel', handleWheel, { passive: false })
    cv.addEventListener('mousedown', handleDown)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    cv.addEventListener('mouseleave', handleLeave)
    
    return () => {
      cv.removeEventListener('wheel', handleWheel)
      cv.removeEventListener('mousedown', handleDown)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      cv.removeEventListener('mouseleave', handleLeave)
    }

  }, [data, color])

  return (
    <canvas 
      ref={cvRef} 
      style={{ width: '100%', height: '300px', display: 'block', cursor: 'crosshair', userSelect: 'none', touchAction: 'none' }} 
    />
  )
}

export default function CoinDetails({ coin, onBack }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState('30')
  
  const isUp = coin.price_change_percentage_24h >= 0
  const color = isUp ? '#10b981' : '#ef4444'

  const timeframes = [
    { label: '7D', value: '7' },
    { label: '30D', value: '30' },
    { label: '3M', value: '90' },
    { label: '6M', value: '180' },
    { label: '1Y', value: '365' },
    { label: 'ALL', value: 'max' },
  ]

  useEffect(() => {
    const fetchChart = async () => {
      try {
        setLoading(true)
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=${days}`)
        if (!res.ok) throw new Error('API Rate limit reached')
        const data = await res.json()
        setChartData(data.prices)
      } catch (err) {
        if (err.message === 'Failed to fetch') {
          setError('Rate Limit raggiunto (Troppe richieste veloci). Attendi 30-60 secondi e riprova.')
        } else {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchChart()
  }, [coin.id, days])

  return (
    <div className="db-details-view">
      <div className="db-details-bg-glow" style={{ background: color }}></div>
      
      <div className="db-details-header">
        <button className="db-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Market
        </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="db-panel-title">Price History</span>
              <div className="db-timeframe-selector">
                {timeframes.map(tf => (
                  <button
                    key={tf.value}
                    className={`db-tf-btn ${days === tf.value ? 'active' : ''}`}
                    onClick={() => setDays(tf.value)}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
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
