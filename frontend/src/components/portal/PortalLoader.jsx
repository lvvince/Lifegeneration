import { useEffect, useRef, useState } from 'react'

/* Loading screen ng portal.
   - Totoong naghihintay: fonts + window load (may minimum na ~1.4s para hindi kumurap lang)
   - Letra-por-letra ang pangalan, tumataas ang bilang, tapos bumubukas na parang shutter
   - onDone() kapag tapos na ang exit, saka lang magsisimula ang animation ng page */
const WORD = 'LIFE GENERATION'.split('')
const MIN = 1400

export default function PortalLoader({ onDone }) {
  const [n, setN] = useState(0)
  const [out, setOut] = useState(false)
  const ready = useRef(false)

  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })))
    Promise.all([loaded, document.fonts?.ready]).then(() => (ready.current = true))
    const t0 = performance.now()
    const min = still ? 250 : MIN
    let raf
    let done = false
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / min)
      const eased = 1 - Math.pow(1 - p, 2.4)
      const cap = ready.current ? 100 : 92
      setN(Math.min(cap, Math.round(eased * 100)))
      if (p >= 1 && ready.current && !done) {
        done = true
        setN(100)
        setTimeout(() => setOut(true), 180)
        setTimeout(onDone, still ? 50 : 950)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  return (
    <div className={`sk-load${out ? ' is-out' : ''}`} role="status" aria-label="Loading Life Generation">
      <i className="sk-load-top" aria-hidden="true" />
      <i className="sk-load-bot" aria-hidden="true" />
      <div className="sk-load-mid">
        <div className="sk-load-mark" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <h2 aria-hidden="true">
          {WORD.map((c, i) => (
            <span key={i} style={{ '--i': i }}>
              <b>{c === ' ' ? ' ' : c}</b>
            </span>
          ))}
        </h2>
        <p>Calapan Youth Ministry</p>
      </div>
      <div className="sk-load-foot" aria-hidden="true">
        <span className="sk-load-n">{String(n).padStart(3, '0')}</span>
        <i className="sk-load-bar"><u style={{ transform: `scaleX(${n / 100})` }} /></i>
        <span className="sk-load-t">{n < 100 ? 'Loading' : 'Ready'}</span>
      </div>
    </div>
  )
}
