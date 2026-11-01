/*
  FX kit: isang event listener bawat uri (delegation), rAF-throttled, walang library.
  - spotlight  : --mx/--my sa ilalim ng cursor (cards, tiles)
  - tilt       : 3D perspective sa .ao-tile / [data-fx~="tilt"] (mouse lang)
  - magnet     : magnetic na hila sa primary buttons (mouse lang)
  - ripple     : bilog na alon sa pindot ng button
  - reveal     : scroll-triggered reveal na may stagger
  Awtomatikong patay kapag prefers-reduced-motion. Walang epekto sa touch maliban sa ripple at reveal.
*/
const SPOT = '.ao-tile, .ao-card, .p-card, .p-panel, .p-stat, .ad-card, .fc-sess, .mi-card, [data-fx~="spot"]'
const TILT = '.ao-tile, [data-fx~="tilt"]'
const MAGNET = '.p-btn-primary, .fc-newsess, button.fc-send, [data-fx~="magnet"]'
const RIPPLE = '.p-btn, .fc-btn, .fc-newsess, button.fc-send, .ao-quick a, .sk-btn, [data-fx~="ripple"]'
const REVEAL = '.ao-card, .p-card, .p-panel, .p-stat, .ad-card, .lgl-body section, [data-reveal]'

export const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const lowPower = () => {
  const n = typeof navigator !== 'undefined' ? navigator : {}
  return !!(n.connection && n.connection.saveData) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2)
}

export function initFx() {
  if (typeof document === 'undefined' || prefersReduced()) return () => {}
  const root = document.documentElement
  root.classList.add('fx-on')
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const off = []

  /* ---------- pointer: spotlight, tilt, magnet ---------- */
  if (fine) {
    let raf = 0
    let ev = null
    let tiltEl = null
    let magEl = null
    const frame = () => {
      raf = 0
      if (!ev) return
      const t = ev.target instanceof Element ? ev.target : null
      const spot = t && t.closest(SPOT)
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--mx', `${ev.clientX - r.left}px`)
        spot.style.setProperty('--my', `${ev.clientY - r.top}px`)
      }
      const tilt = null
      if (tiltEl && tiltEl !== tilt) resetTilt(tiltEl)
      if (tilt) {
        const r = tilt.getBoundingClientRect()
        const px = (ev.clientX - r.left) / r.width - 0.5
        const py = (ev.clientY - r.top) / r.height - 0.5
        tilt.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`)
        tilt.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`)
        tilt.classList.add('is-tilting')
        tiltEl = tilt
      } else tiltEl = null
      const mag = t && t.closest(MAGNET)
      if (magEl && magEl !== mag) resetMag(magEl)
      if (mag && !mag.disabled) {
        const r = mag.getBoundingClientRect()
        const dx = ev.clientX - (r.left + r.width / 2)
        const dy = ev.clientY - (r.top + r.height / 2)
        mag.style.setProperty('--tx', `${(dx * 0.22).toFixed(1)}px`)
        mag.style.setProperty('--ty', `${(dy * 0.28).toFixed(1)}px`)
        magEl = mag
      } else magEl = null
    }
    const resetTilt = (el) => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.classList.remove('is-tilting') }
    const resetMag = (el) => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px') }
    const move = (e) => { ev = e; if (!raf) raf = requestAnimationFrame(frame) }
    const leave = (e) => {
      const el = e.target instanceof Element ? e.target : null
      if (!el) return
      const a = el.closest(TILT); if (a && !a.contains(e.relatedTarget)) resetTilt(a)
      const b = el.closest(MAGNET); if (b && !b.contains(e.relatedTarget)) resetMag(b)
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerout', leave, { passive: true })
    off.push(() => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerout', leave); cancelAnimationFrame(raf) })
  }

  /* ---------- ripple ---------- */
  const down = (e) => {
    if (e.button > 0) return
    const t = e.target instanceof Element ? e.target.closest(RIPPLE) : null
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return
    const r = t.getBoundingClientRect()
    const size = Math.max(r.width, r.height) * 1.6
    const s = document.createElement('span')
    s.className = 'fx-ripple'
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
    t.classList.add('fx-host')
    t.appendChild(s)
    s.addEventListener('animationend', () => s.remove(), { once: true })
  }
  document.addEventListener('pointerdown', down, { passive: true })
  off.push(() => document.removeEventListener('pointerdown', down))

  return () => { off.forEach((f) => f()); root.classList.remove('fx-on') }
}
