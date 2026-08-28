import { useEffect, useRef } from 'react'

// ── Deterministic seeded PRNG ─────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967295
  }
}

// ── Approximate land regions [minLat, maxLat, minLon, maxLon, dotCount] ───────
const REGIONS = [
  // North America (upper)
  [49, 72, -140, -55, 130],
  // North America (lower)
  [24, 49, -126, -65, 200],
  // Central America
  [7, 24, -108, -77, 45],
  // Greenland
  [59, 84, -73, -12, 75],
  // Caribbean
  [13, 24, -87, -59, 30],
  // South America (north)
  [-5, 13, -82, -50, 90],
  // South America (main)
  [-35, -5, -82, -34, 200],
  // South America (south)
  [-56, -35, -77, -63, 35],
  // Europe (west)
  [35, 58, -12, 22, 170],
  // Europe (east + Balkans)
  [35, 50, 18, 45, 80],
  // Scandinavia
  [55, 72, 4, 32, 85],
  // UK & Ireland
  [50, 61, -11, 2, 32],
  // Iceland
  [63, 67, -25, -13, 18],
  // Africa (north)
  [4, 37, -18, 52, 245],
  // Africa (south)
  [-35, 4, 12, 52, 130],
  // Middle East
  [12, 45, 32, 75, 110],
  // South Asia
  [5, 36, 62, 100, 145],
  // SE Asia (mainland)
  [4, 28, 92, 110, 70],
  // SE Asia (islands)
  [-10, 22, 95, 145, 95],
  // East Asia (main)
  [20, 55, 100, 145, 175],
  // Siberia & N Asia
  [50, 75, 60, 180, 120],
  // Japan
  [30, 46, 128, 148, 50],
  // Australia
  [-38, -10, 113, 155, 100],
  // New Zealand
  [-47, -34, 165, 178, 22],
  // Madagascar
  [-26, -11, 43, 51, 28],
  // British Isles fill
  [51, 59, -5, 1, 18],
]

// ── Generate all dot lat/lon (in radians) once at module load ─────────────────
const DOTS = (() => {
  const rand = seededRand(98765)
  return REGIONS.flatMap(([minLat, maxLat, minLon, maxLon, n]) =>
    Array.from({ length: n }, () => {
      const lat = (minLat + rand() * (maxLat - minLat)) * (Math.PI / 180)
      const lon = (minLon + rand() * (maxLon - minLon)) * (Math.PI / 180)
      return [lat, lon]
    })
  )
})()

// ── Purple #7c3aed ↔ Blue #0ea5e9 — colour by normalized longitude ─────────
function dotColor(lonRad, depth) {
  const t = (lonRad + Math.PI) / (2 * Math.PI) // 0..1
  const r = Math.round(124 * (1 - t) + 14 * t)
  const g = Math.round(58  * (1 - t) + 165 * t)
  const b = Math.round(237 * (1 - t) + 233 * t)
  const a = (0.12 + depth * 0.72).toFixed(2)
  return `rgba(${r},${g},${b},${a})`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Globe({ size = 680 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = size * dpr
    canvas.width = W
    canvas.height = W
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const R  = size * 0.42

    let rot = 0
    let raf = null

    function draw() {
      ctx.clearRect(0, 0, size, size)

      // Subtle sphere atmosphere glow
      const grd = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.05)
      grd.addColorStop(0,   'rgba(124,58,237,0.05)')
      grd.addColorStop(0.6, 'rgba(14,165,233,0.04)')
      grd.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2)
      ctx.fill()

      // ── Project & collect visible dots ───────────────────────────────────
      const visible = []
      for (const [lat, lon] of DOTS) {
        const theta = lon + rot
        const x3 = Math.cos(lat) * Math.cos(theta)
        const y3 = Math.sin(lat)
        const z3 = Math.cos(lat) * Math.sin(theta)

        if (z3 < -0.08) continue // behind the sphere

        const depth = (z3 + 1) / 2  // 0 = edge, 1 = front
        visible.push({
          sx: cx + x3 * R,
          sy: cy - y3 * R,
          depth,
          lon,
        })
      }

      // Sort back → front so front dots paint over back ones
      visible.sort((a, b) => a.depth - b.depth)

      // ── Draw square dots (pixel style) ───────────────────────────────────
      for (const { sx, sy, depth, lon } of visible) {
        const ds = 1.4 + depth * 3.2    // dot size 1.4–4.6 px
        ctx.fillStyle = dotColor(lon, depth)
        ctx.fillRect(sx - ds / 2, sy - ds / 2, ds, ds)
      }

      rot += 0.0028   // ~16s per full revolution
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
