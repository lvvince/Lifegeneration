import { useEffect, useRef } from 'react'
import { prefersReduced, lowPower } from '../../lib/fx.js'

/* Particle network sa canvas. Humihinto kapag wala sa screen o nakatago ang tab. Nasa ≤2x DPR. */
export default function ParticleNet({ color = '255,255,255', accent = '255,90,10', className = 'fx-net' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return undefined
    const ctx = c.getContext('2d')
    const still = prefersReduced()
    let w = 0, h = 0, dpr = 1, raf = 0, run = false
    const mouse = { x: -999, y: -999 }
    let pts = []
    const size = () => {
      const r = c.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = r.width; h = r.height
      c.width = w * dpr; c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round(Math.min(lowPower() ? 22 : 56, (w * h) / 16000))
      pts = Array.from({ length: n }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, a: i % 9 === 0 }))
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const L = 118
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        if (!still) {
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy
          if (d2 < 14000) { p.x += dx * 0.004; p.y += dy * 0.004 }
        }
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j]
          const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy)
          if (d < L) {
            ctx.strokeStyle = `rgba(${p.a || q.a ? accent : color},${(1 - d / L) * 0.22})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
          }
        }
        ctx.fillStyle = `rgba(${p.a ? accent : color},${p.a ? 0.9 : 0.5})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.a ? 2.2 : 1.5, 0, 6.283); ctx.fill()
      }
    }
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    const start = () => { if (!run && !still) { run = true; raf = requestAnimationFrame(loop) } }
    const stop = () => { run = false; cancelAnimationFrame(raf) }
    size(); draw()
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && document.visibilityState === 'visible' ? start() : stop()))
    io.observe(c)
    const ro = new ResizeObserver(() => { size(); draw() })
    ro.observe(c)
    const vis = () => (document.visibilityState === 'visible' ? null : stop())
    const move = (e) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', vis)
    return () => { stop(); io.disconnect(); ro.disconnect(); window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', vis) }
  }, [color, accent])
  return <canvas ref={ref} className={className} aria-hidden="true" />
}
