import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { prefersReduced, lowPower } from '../../lib/fx.js'

/*
  Cinematic page transitions, walang library: Web Animations API + clip-path.
  Kino-capture ang click sa internal links, tinatakpan ng overlay (cover), lilipat ng route, tapos bubuksan (reveal).
  Modes: iris (bilog mula sa click), wipe (diagonal), curtain (dalawang kurtina), pixel (dissolve),
         blur (blur-to-focus), zoom (zoom-through).
*/
const INK = '#111111'
const OR = '#ff5a0a'
const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)'
const sect = (p) => (p === '/' ? 'home' : p.split('/')[1] || 'home')

function pick(from, to) {
  const a = sect(from), b = sect(to)
  if (['login', 'register', 'forgot-password', 'reset-password'].includes(b) || ['login', 'register'].includes(a)) return 'iris'
  if (b === 'chat') return 'curtain'
  if (b === 'gifts-matcher') return 'pixel'
  if (b === 'give') return 'zoom'
  if (a === 'home' || b === 'home') return 'iris'
  if ((a === 'admin' || a === 'officer') !== (b === 'admin' || b === 'officer')) return 'wipe'
  if (a === b) return 'blur'
  return 'wipe'
}

export default function RouteTransition() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const box = useRef(null)
  const state = useRef({ busy: false, mode: null, x: 0, y: 0, pending: null })
  const prev = useRef(pathname)

  const content = () => document.querySelector('.sk-main') || document.querySelector('main') || document.getElementById('root')

  /* ---------- reveal (nasa bagong route na) ---------- */
  const reveal = async () => {
    const st = state.current
    const el = box.current
    const mode = st.mode
    const main = content()
    try {
      if (mode === 'blur') {
        await main.animate([{ filter: 'blur(10px)', opacity: 0.4, transform: 'scale(0.992)' }, { filter: 'blur(0)', opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(0.16,1,0.3,1)' }).finished
      } else if (mode === 'zoom') {
        el.firstChild.style.opacity = '0'
        await main.animate([{ transform: 'scale(0.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.16,1,0.3,1)' }).finished
      } else if (mode === 'iris') {
        const f = el.firstChild
        await f.animate([{ clipPath: `circle(150vmax at ${st.x}px ${st.y}px)` }, { clipPath: `circle(0px at ${st.x}px ${st.y}px)` }], { duration: 480, easing: EASE, fill: 'forwards' }).finished
      } else if (mode === 'wipe') {
        const f = el.firstChild
        await f.animate([{ clipPath: 'polygon(-20% 0,120% 0,100% 100%,-40% 100%)' }, { clipPath: 'polygon(120% 0,120% 0,100% 100%,100% 100%)' }], { duration: 460, easing: EASE, fill: 'forwards' }).finished
      } else if (mode === 'curtain') {
        const [l, r] = el.children
        await Promise.all([
          l.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 480, easing: EASE, fill: 'forwards' }).finished,
          r.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 480, easing: EASE, fill: 'forwards' }).finished,
        ])
      } else if (mode === 'pixel') {
        await Promise.all([...el.children].map((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: Number(c.dataset.d) * 0.7, easing: 'steps(3,end)', fill: 'forwards' }).finished))
      }
    } catch { /* animation cancelled */ }
    el.replaceChildren()
    el.style.pointerEvents = 'none'
    st.busy = false
    st.mode = null
  }

  /* ---------- cover (bago lumipat) ---------- */
  const cover = async (to, x, y) => {
    const st = state.current
    const el = box.current
    const from = window.location.pathname
    let mode = pick(from, to)
    if (lowPower() && mode === 'pixel') mode = 'wipe'
    st.busy = true; st.mode = mode; st.x = x; st.y = y
    el.style.pointerEvents = 'all'
    const mk = (css) => { const d = document.createElement('div'); d.style.cssText = css; return d }
    const fill = `position:absolute;inset:0;background:${INK};will-change:clip-path`
    const main = content()
    try {
      if (mode === 'iris') {
        const f = mk(fill + `;clip-path:circle(0px at ${x}px ${y}px)`)
        el.replaceChildren(f)
        await f.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150vmax at ${x}px ${y}px)` }], { duration: 440, easing: EASE, fill: 'forwards' }).finished
      } else if (mode === 'wipe') {
        const f = mk(fill + `;background:linear-gradient(105deg, ${INK} 0 92%, ${OR} 92% 100%)`)
        el.replaceChildren(f)
        await f.animate([{ clipPath: 'polygon(-20% 0,-20% 0,-40% 100%,-40% 100%)' }, { clipPath: 'polygon(-20% 0,120% 0,100% 100%,-40% 100%)' }], { duration: 420, easing: EASE, fill: 'forwards' }).finished
      } else if (mode === 'curtain') {
        const l = mk(`position:absolute;top:0;bottom:0;left:0;width:50.5%;background:${INK};transform-origin:left;transform:scaleX(0)`)
        const r = mk(`position:absolute;top:0;bottom:0;right:0;width:50.5%;background:${OR};transform-origin:right;transform:scaleX(0)`)
        el.replaceChildren(l, r)
        await Promise.all([
          l.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 400, easing: EASE, fill: 'forwards' }).finished,
          r.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 400, delay: 60, easing: EASE, fill: 'forwards' }).finished,
        ])
      } else if (mode === 'pixel') {
        const cols = innerWidth < 600 ? 7 : 14
        const size = Math.ceil(innerWidth / cols)
        const rows = Math.ceil(innerHeight / size)
        const cells = []
        for (let i = 0; i < cols * rows; i++) {
          const c = mk(`background:${i % 11 === 0 ? OR : INK};opacity:0;width:100%;height:100%`)
          c.dataset.d = String(Math.random() * 220)
          cells.push(c)
        }
        el.style.display = 'grid'
        el.style.gridTemplateColumns = `repeat(${cols},1fr)`
        el.style.gridTemplateRows = `repeat(${rows},1fr)`
        el.replaceChildren(...cells)
        await Promise.all(cells.map((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: Number(c.dataset.d) * 0.7, easing: 'steps(3,end)', fill: 'forwards' }).finished))
      } else if (mode === 'zoom') {
        el.replaceChildren(mk(`position:absolute;inset:0;background:${INK};opacity:0`))
        await Promise.all([
          main.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.08)', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(0.7,0,0.84,0)', fill: 'forwards' }).finished,
          el.firstChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' }).finished,
        ])
      } else {
        el.replaceChildren(mk('position:absolute;inset:0'))
        await main.animate([{ filter: 'blur(0)', opacity: 1 }, { filter: 'blur(8px)', opacity: 0.35 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished
      }
    } catch { /* cancelled */ }
    el.style.display = ''
    el.style.gridTemplateColumns = el.style.gridTemplateRows = ''
    st.pending = to
    nav(to)
  }

  /* ---------- click capture ---------- */
  useEffect(() => {
    if (prefersReduced()) return undefined
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.closest('[data-no-transition]')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const to = url.pathname + url.search + url.hash
      if (url.pathname === window.location.pathname && url.search === window.location.search) return // hash/same page: bahala ang browser
      const st = state.current
      if (st.busy) return
      e.preventDefault()
      e.stopImmediatePropagation()
      cover(to, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- pagbabago ng route ---------- */
  useEffect(() => {
    if (prev.current === pathname) return
    prev.current = pathname
    const st = state.current
    if (st.pending) {
      st.pending = null
      window.scrollTo(0, 0)
      requestAnimationFrame(() => requestAnimationFrame(reveal))
    } else if (!prefersReduced() && !st.busy) {
      // back/forward o programmatic navigate: maikling blur-to-focus lang
      const main = content()
      main?.animate?.([{ filter: 'blur(6px)', opacity: 0.5 }, { filter: 'blur(0)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.16,1,0.3,1)' })
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="fx-rt" aria-hidden="true" />
}
