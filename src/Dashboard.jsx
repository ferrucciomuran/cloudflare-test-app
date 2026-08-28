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
      else setV(Math.floor(cur))
    }, 16)
    return () => clearInterval(t)
  }, [target, dur])
  return v
}

// ── Real-time traffic chart (Canvas) ──────────────────────────────────────────
function TrafficChart() {
  const cvRef = useRef(null)
  const bufs  = useRef({ req: Array(100).fill(0.3), cache: Array(100).fill(0.2) })
  const tRef  = useRef(0)

  useEffect(() => {
    const cv  = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    cv.width  = 600
    cv.height = 170

    let raf, frame = 0

    function tick() {
      const t = tRef.current++
      const req = 0.32 + 0.3*Math.sin(t*0.04) + 0.12*Math.sin(t*0.13) + (Math.random()-0.5)*0.07
      const hit = req * (0.78 + 0.1*Math.sin(t*0.08)) - 0.04*Math.random()
      bufs.current.req.shift();   bufs.current.req.push(Math.max(0.05,Math.min(0.92,req)))
      bufs.current.cache.shift(); bufs.current.cache.push(Math.max(0.02,Math.min(0.85,hit)))
    }

    function drawLine(buf, stroke, fill) {
      const W=600, H=170, PL=44, PT=20, PB=32, PR=12
      const cW=W-PL-PR, cH=H-PT-PB
      const pts = buf.map((v,i)=>({ x: PL+(i/(buf.length-1))*cW, y: PT+(1-v)*cH }))

      const grd = ctx.createLinearGradient(0,PT,0,PT+cH)
      grd.addColorStop(0, fill); grd.addColorStop(1,'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(pts[0].x, PT+cH)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(pts[pts.length-1].x, PT+cH)
      ctx.closePath(); ctx.fill()

      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'
      ctx.beginPath()
      pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y))
      ctx.stroke()

      // trailing dot
      const last = pts[pts.length-1]
      ctx.fillStyle = stroke
      ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, Math.PI*2); ctx.fill()
    }

    function draw() {
      const W=600, H=170, PL=44, PT=20, PB=32, PR=12
      const cW=W-PL-PR, cH=H-PT-PB
      ctx.clearRect(0,0,W,H)

      // Grid
      for (let i=0; i<=4; i++) {
        const y = PT + (i/4)*cH
        ctx.strokeStyle = 'rgba(99,179,237,0.07)'; ctx.lineWidth=1
        ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(PL+cW,y); ctx.stroke()
        ctx.fillStyle='rgba(148,163,184,0.45)'; ctx.font='10px Inter'
        ctx.textAlign='right'
        ctx.fillText(Math.round((1-i/4)*100)+'k', PL-6, y+3)
      }

      drawLine(bufs.current.cache, '#06b6d4', 'rgba(6,182,212,0.09)')
      drawLine(bufs.current.req,   '#a78bfa', 'rgba(167,139,250,0.12)')

      const rNow = Math.round(bufs.current.req[99]*100)
      const cNow = Math.round(bufs.current.cache[99]*100)
      ctx.textAlign='left'
      ctx.font='bold 10px Inter'
      ctx.fillStyle='#a78bfa'; ctx.fillText(`● Requests  ${rNow}k/s`, PL, H-10)
      ctx.fillStyle='#06b6d4'; ctx.fillText(`● Cache hits  ${cNow}k/s`, PL+140, H-10)
    }

    function loop() {
      if (frame % 3 === 0) tick()
      draw()
      frame++
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={cvRef} style={{ width:'100%', height:'170px', display:'block' }} />
}

// ── Circular gauge (SVG 270°) ─────────────────────────────────────────────────
function Gauge({ value, label, color }) {
  const r    = 34
  const circ = 2 * Math.PI * r
  const fill = (value / 100) * 0.75 * circ

  return (
    <div className="db-gauge">
      <svg viewBox="0 0 80 80" width="82" height="82">
        <g transform="rotate(-135 40 40)">
          <circle cx="40" cy="40" r={r} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth="7"
            strokeDasharray={`${0.75*circ} ${0.25*circ}`}
            strokeLinecap="round"
          />
          <circle cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            style={{ transition:'stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)', filter:`drop-shadow(0 0 5px ${color}88)` }}
          />
        </g>
        <text x="40" y="37" textAnchor="middle" dominantBaseline="middle"
          fill="#f0f2ff" fontSize="15" fontWeight="700" fontFamily="Inter">{value}
        </text>
        <text x="40" y="52" textAnchor="middle"
          fill="#475569" fontSize="8.5" fontFamily="Inter">%
        </text>
      </svg>
      <span className="db-gauge-label">{label}</span>
    </div>
  )
}

// ── Activity feed ─────────────────────────────────────────────────────────────
const EVENTS = [
  { t:'success', m:'Cache purge completed — EU-WEST-2 zone'         },
  { t:'info',    m:'SSL certificate renewed for *.edge.io'           },
  { t:'warning', m:'Rate limit at 87% — AS-EAST edge node'          },
  { t:'success', m:'Worker v2.4.1 deployed → 271 PoPs'              },
  { t:'info',    m:'BGP route announced — 185.31.0.0/24'            },
  { t:'success', m:'DDoS mitigated — 14.2k req/s blocked'           },
  { t:'error',   m:'Origin timeout MIL-01 — serving from cache'     },
  { t:'info',    m:'Health check passed — all EU nodes nominal'      },
  { t:'warning', m:'Latency spike detected — SA-EAST region'        },
  { t:'success', m:'Firewall rule #4471 applied globally'            },
  { t:'info',    m:'Config sync complete — 271/273 nodes'           },
  { t:'error',   m:'DNS propagation delayed — 3 resolvers slow'     },
  { t:'success', m:'WAF signature DB updated → v2026.08.28'         },
]

function ts() {
  return new Date().toLocaleTimeString('en-GB',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

function ActivityLog() {
  const [logs, setLogs] = useState(() =>
    EVENTS.slice(0,9).map((e,i)=>({
      ...e, id:i,
      s: new Date(Date.now()-(9-i)*16000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    }))
  )

  useEffect(() => {
    const t = setInterval(() => {
      const ev = EVENTS[Math.floor(Math.random()*EVENTS.length)]
      setLogs(p => [{ ...ev, id:Date.now(), s:ts() }, ...p.slice(0,17)])
    }, 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="db-log-list">
      {logs.map(l => (
        <div key={l.id} className={`db-log-entry db-log-${l.t}`}>
          <span className="db-log-ts">{l.s}</span>
          <span className="db-log-dot" />
          <span className="db-log-msg">{l.m}</span>
        </div>
      ))}
    </div>
  )
}

// ── Edge nodes ────────────────────────────────────────────────────────────────
const NODES = [
  { region:'NA', nodes:[
    { id:'JFK', city:'New York',     ms:12, s:'active'   },
    { id:'LAX', city:'Los Angeles',  ms:8,  s:'active'   },
    { id:'ORD', city:'Chicago',      ms:15, s:'active'   },
    { id:'MIA', city:'Miami',        ms:34, s:'degraded' },
    { id:'YYZ', city:'Toronto',      ms:18, s:'active'   },
  ]},
  { region:'EU', nodes:[
    { id:'LHR', city:'London',       ms:10, s:'active'   },
    { id:'FRA', city:'Frankfurt',    ms:9,  s:'active'   },
    { id:'CDG', city:'Paris',        ms:11, s:'active'   },
    { id:'MXP', city:'Milan',        ms:13, s:'active'   },
    { id:'AMS', city:'Amsterdam',    ms:10, s:'active'   },
    { id:'MAD', city:'Madrid',       ms:16, s:'active'   },
  ]},
  { region:'APAC', nodes:[
    { id:'NRT', city:'Tokyo',        ms:6,  s:'active'   },
    { id:'SIN', city:'Singapore',    ms:14, s:'active'   },
    { id:'SYD', city:'Sydney',       ms:22, s:'active'   },
    { id:'BOM', city:'Mumbai',       ms:45, s:'degraded' },
    { id:'HKG', city:'Hong Kong',    ms:11, s:'active'   },
  ]},
  { region:'MEA', nodes:[
    { id:'DXB', city:'Dubai',        ms:28, s:'active'   },
    { id:'JNB', city:'Johannesburg', ms:35, s:'active'   },
    { id:'NBO', city:'Nairobi',      ms:48, s:'offline'  },
  ]},
]

function NodeGrid() {
  return (
    <div className="db-nodes-body">
      {NODES.map(({ region, nodes }) => (
        <div key={region}>
          <span className="db-region-name">{region}</span>
          <div className="db-region-nodes">
            {nodes.map(n => (
              <div key={n.id} className={`db-node db-node-${n.s}`} title={`${n.city} — ${n.ms}ms`}>
                <span className="db-node-dot" />
                <span className="db-node-id">{n.id}</span>
                <span className="db-node-ms">{n.ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, suffix, delta, color }) {
  const n = useCounter(value)
  return (
    <div className="db-metric" style={{ '--mc': color }}>
      <div className="db-metric-icon">{icon}</div>
      <div className="db-metric-body">
        <span className="db-metric-val">{n.toLocaleString()}<em>{suffix}</em></span>
        <span className="db-metric-label">{label}</span>
        {delta !== undefined && (
          <span className={`db-metric-delta ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs yesterday
          </span>
        )}
      </div>
      <div className="db-metric-glow" />
    </div>
  )
}

// ── Sidebar nav ───────────────────────────────────────────────────────────────
const NAV = [
  { icon:'⊞', label:'Overview',  active:true  },
  { icon:'📈', label:'Analytics'              },
  { icon:'🌐', label:'Network'                },
  { icon:'🛡',  label:'Security'              },
  { icon:'⚡', label:'Workers'                },
  { icon:'⚙',  label:'Settings'              },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [time, setTime] = useState(new Date())
  const [cpu,  setCpu]  = useState(67)
  const [mem,  setMem]  = useState(42)

  useEffect(() => {
    const tc = setInterval(() => setTime(new Date()), 1000)
    const tg = setInterval(() => {
      setCpu(v => Math.max(28, Math.min(88, v + (Math.random()-0.5)*7)))
      setMem(v => Math.max(28, Math.min(72, v + (Math.random()-0.48)*2.5)))
    }, 2200)
    return () => { clearInterval(tc); clearInterval(tg) }
  }, [])

  const fmt     = d => d.toLocaleTimeString('en-GB',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const fmtDate = d => d.toLocaleDateString('en-GB',{ weekday:'short', day:'numeric', month:'short' })

  return (
    <div className="db">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="url(#dbl)"/>
            <path d="M8 20c2-4 6-8 12-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 24c2-3 5-6 10-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
            <defs>
              <linearGradient id="dbl" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#7c3aed"/><stop offset="1" stopColor="#0ea5e9"/>
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
            <span className="db-breadcrumb">Cloudflare Edge</span>
            <span className="db-sep">›</span>
            <span className="db-page-title">Overview</span>
          </div>
          <div className="db-header-right">
            <div className="db-live"><span className="db-live-dot"/>LIVE</div>
            <div className="db-clock">
              <span className="db-time">{fmt(time)}</span>
              <span className="db-date">{fmtDate(time)}</span>
            </div>
            <div className="db-user">
              <div className="db-avatar">D</div>
              <span>demo</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="db-main">
          {/* Metric cards */}
          <div className="db-metrics-row">
            <MetricCard icon="⚡" label="Requests / 24h"  value={2840000} suffix=" req" delta={12}  color="#7c3aed" />
            <MetricCard icon="📡" label="Bandwidth saved" value={847}     suffix=" GB"  delta={8}   color="#0ea5e9" />
            <MetricCard icon="🕒" label="Avg Response"    value={12}      suffix=" ms"  delta={-3}  color="#10b981" />
            <MetricCard icon="🌐" label="Active Nodes"    value={271}     suffix=" PoPs" delta={2}  color="#f59e0b" />
          </div>

          {/* Chart row */}
          <div className="db-chart-row">
            <div className="db-panel db-chart-panel">
              <div className="db-panel-header">
                <span className="db-panel-title">Network Traffic</span>
                <span className="db-panel-badge live">● Real-time</span>
              </div>
              <div className="db-chart-area"><TrafficChart /></div>
            </div>

            <div className="db-panel db-right-panel">
              <div className="db-panel-header">
                <span className="db-panel-title">System Health</span>
              </div>
              <div className="db-gauges">
                <Gauge value={Math.round(cpu)} label="CPU Load"    color="#7c3aed" />
                <Gauge value={Math.round(mem)} label="Memory"      color="#0ea5e9" />
                <Gauge value={89}              label="Cache Ratio" color="#10b981" />
              </div>
              <div className="db-status-list">
                {[
                  { label:'Edge Network',    ok:true  },
                  { label:'DNS Resolvers',   ok:true  },
                  { label:'Origin Servers',  ok:true  },
                  { label:'WAF / Firewall',  ok:true  },
                  { label:'SA-EAST Region',  ok:false },
                ].map(s => (
                  <div key={s.label} className="db-status-item">
                    <span className={`db-status-dot ${s.ok?'ok':'warn'}`}/>
                    <span>{s.label}</span>
                    <span className={`db-status-badge ${s.ok?'ok':'warn'}`}>{s.ok?'Operational':'Degraded'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity + Nodes */}
          <div className="db-bottom-row">
            <div className="db-panel db-activity-panel">
              <div className="db-panel-header">
                <span className="db-panel-title">Activity Feed</span>
                <span className="db-panel-badge live">● LIVE</span>
              </div>
              <ActivityLog />
            </div>

            <div className="db-panel db-nodes-panel">
              <div className="db-panel-header">
                <span className="db-panel-title">Edge Nodes</span>
                <span className="db-panel-badge">271 / 273 online</span>
              </div>
              <NodeGrid />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
