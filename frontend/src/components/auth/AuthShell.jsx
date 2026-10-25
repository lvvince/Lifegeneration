import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/auth2.css'

/* logo.png ng org; kapag wala, "LG" na kahon */
export function Brand() {
  const [bad, setBad] = useState(false)
  return (
    <Link to="/" className="au-brand" aria-label="Life Generation home">
      {bad ? <span className="au-logo is-fallback">LG</span> : <img className="au-logo" src="/logo.png" alt="" draggable="false" onError={() => setBad(true)} />}
      <span className="au-brand-name">
        LIFE <b>GENERATION</b>
      </span>
    </Link>
  )
}

export default function AuthShell({ title, sub, switchLead, switchTo, switchLabel, wide, steps, children }) {
  const root = useRef(null)
  const [ok, setOk] = useState(false)

  // parallax ng larawan sa galaw ng mouse (desktop lang, hindi gumagalaw kapag reduced-motion)
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return undefined
    let raf = 0
    let x = 0
    let y = 0
    const apply = () => {
      raf = 0
      el.style.setProperty('--mx', x.toFixed(3))
      el.style.setProperty('--my', y.toFixed(3))
    }
    const move = (e) => {
      x = e.clientX / window.innerWidth - 0.5
      y = e.clientY / window.innerHeight - 0.5
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="au" ref={root}>
      <div className="au-bg" aria-hidden="true">
        <img className={ok ? 'is-ready' : ''} src="/hero-bg.jpg" alt="" draggable="false" onLoad={() => setOk(true)} onError={() => setOk(false)} />
      </div>
      <i className="au-shade" aria-hidden="true" />

      <header className="au-top">
        <Brand />
        <div className="au-nav" role="navigation" aria-label="Public pages">
          <Link to="/">Home</Link>
          <Link to={switchTo} className="is-cta">
            {switchLabel}
          </Link>
        </div>
      </header>

      <div className="au-stage">
        <section className={`au-card${wide ? ' is-wide' : ''}`}>
          <div className="au-head">
            {steps && (
              <div className="au-steps" aria-label={`Step ${steps[0]} of ${steps[1]}`}>
                {Array.from({ length: steps[1] }).map((_, i) => (
                  <i key={i} className={i < steps[0] ? 'is-on' : ''} />
                ))}
                <small>
                  Step {steps[0]} of {steps[1]}
                </small>
              </div>
            )}
            <h1>
              {title}
              <i>.</i>
            </h1>
            {sub && (
              <p>
                {sub}{' '}
                {switchLead && (
                  <Link to={switchTo} className="au-link">
                    {switchLead}
                  </Link>
                )}
              </p>
            )}
          </div>
          {children}
        </section>
      </div>
    </div>
  )
}
