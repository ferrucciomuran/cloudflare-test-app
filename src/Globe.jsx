import { useEffect, useRef } from 'react'
import { feature } from 'topojson-client'

// ── Config ────────────────────────────────────────────────────────────────────
const GRID_W = 1080   // offscreen raster width  (higher = better coastline)
const GRID_H = 540    // offscreen raster height
const STEP   = 3      // pixel sample stride → ~11 k land dots

// ── Rasterise TopoJSON → [lat_rad, lon_rad][] (async lazy singleton) ─────────
let _dotsCache   = null
let _dotsPromise = null

async function getLandDots() {
  if (_dotsCache)   return _dotsCache
  if (_dotsPromise) return _dotsPromise

  _dotsPromise = (async () => {
    // Dynamic import → separate chunk (keeps main bundle light)
    const mod      = await import('world-atlas/land-50m.json')
    const landData = mod.default ?? mod

    // 1. Rasterise land polygons in white on offscreen canvas
    const oc  = document.createElement('canvas')
    oc.width  = GRID_W
    oc.height = GRID_H
    const ctx = oc.getContext('2d', { willReadFrequently: true })

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, GRID_W, GRID_H)

    const landGeo  = feature(landData, landData.objects.land)
    const features = landGeo.type === 'FeatureCollection'
      ? landGeo.features
      : [landGeo]

    ctx.fillStyle = '#fff'
    ctx.beginPath()

    for (const feat of features) {
      const { type, coordinates } = feat.geometry
      const polygons = type === 'Polygon' ? [coordinates] : coordinates

      for (const rings of polygons) {
        for (const ring of rings) {
          for (let i = 0; i < ring.length; i++) {
            const [lon, lat] = ring[i]
            const px = ((lon + 180) / 360) * GRID_W
            const py = ((90 - lat)  / 180) * GRID_H
            if (i === 0) ctx.moveTo(px, py)
            else          ctx.lineTo(px, py)
          }
          ctx.closePath()
        }
      }
    }

    ctx.fill('evenodd')

    // 2. Sample pixel grid → lat/lon radians
    const imgData = ctx.getImageData(0, 0, GRID_W, GRID_H).data
    const DEG2RAD = Math.PI / 180
    const dots    = []

    for (let py = 0; py < GRID_H; py += STEP) {
      for (let px = 0; px < GRID_W; px += STEP) {
        if (imgData[(py * GRID_W + px) * 4] > 128) {
          const lon = ((px / GRID_W) * 360 - 180) * DEG2RAD
          // py=0 = top of raster = north pole (+90°)
          const lat = (90 - (py / GRID_H) * 180) * DEG2RAD
          dots.push([lat, lon])

        }
      }
    }

    _dotsCache = dots
    return dots
  })()

  return _dotsPromise
}

// ── Colour: purple #7c3aed → blue #0ea5e9 keyed on longitude + depth ─────────
const _colCache = new Map()

function dotColor(lonRad, depth) {
  const lk = Math.round(lonRad * 8)
  const dk = Math.round(depth  * 16)
  const k  = lk * 1000 + dk
  let c = _colCache.get(k)
  if (c) return c

  const t = (lonRad + Math.PI) / (2 * Math.PI)
  const r = Math.round(124 * (1 - t) + 14  * t)
  const g = Math.round(58  * (1 - t) + 165 * t)
  const b = Math.round(237 * (1 - t) + 233 * t)
  const a = (0.08 + depth * 0.82).toFixed(2)
  c = `rgba(${r},${g},${b},${a})`
  _colCache.set(k, c)
  return c
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Globe({ size = 680 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const PX  = size * dpr

    canvas.width  = PX
    canvas.height = PX
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const R  = size * 0.42

    let rot  = 0
    let raf  = null
    let dots = []   // filled once async load completes
    let ready = false

    // Load geo data, then start render loop
    getLandDots().then(d => {
      dots  = d
      ready = true
    })

    const visible = []   // reused buffer

    function draw() {
      ctx.clearRect(0, 0, size, size)

      // Atmosphere glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.06)
      grd.addColorStop(0,    'rgba(124,58,237,0.05)')
      grd.addColorStop(0.65, 'rgba(14,165,233,0.03)')
      grd.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2)
      ctx.fill()

      if (ready) {
        visible.length = 0

        for (let i = 0; i < dots.length; i++) {
          const lat   = dots[i][0]
          const lon   = dots[i][1]
          const theta = lon + rot

          const cosLat = Math.cos(lat)
          const x3 = cosLat * Math.sin(theta)   // sin → east is RIGHT
          const y3 = Math.sin(lat)
          const z3 = cosLat * Math.cos(theta)   // cos → depth/visibility

          if (z3 < -0.04) continue

          visible.push(cx + x3 * R, cy - y3 * R, (z3 + 1) * 0.5, lon)
        }

        // Sort back→front by depth (z-index slot = index * 4 + 2)
        const n   = visible.length / 4
        const idx = new Int32Array(n)
        for (let i = 0; i < n; i++) idx[i] = i
        idx.sort((a, b) => visible[a * 4 + 2] - visible[b * 4 + 2])

        for (let ii = 0; ii < n; ii++) {
          const i   = idx[ii]
          const sx    = visible[i * 4]
          const sy    = visible[i * 4 + 1]
          const depth = visible[i * 4 + 2]
          const lon   = visible[i * 4 + 3]

          const ds = 0.55 + depth * 1.55   // 0.55 → 2.10 px
          ctx.fillStyle = dotColor(lon, depth)
          ctx.fillRect(sx - ds * 0.5, sy - ds * 0.5, ds, ds)
        }
      }

      rot += 0.0028
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: size, height: size, display: 'block' }}
    />
  )
}
