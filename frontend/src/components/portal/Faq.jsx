import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { FAQS } from '../../data/faqs.js'
import { on } from '../../lib/bus.js'

/* Frequently Asked Questions — simple at mabilis.
   - Isang bukas lang sa isang oras; agad sumasagot (0.2s), walang pagkaantala
   - Event-driven: emit('faq:open', 'rsvp') o link na /dashboard#faq-rsvp -> bubukas at mag-i-scroll
   - Keyboard: Enter/Space, Arrow Up/Down, Home/End */
export default function Faq({ id = 'faq' }) {
  const [open, setOpen] = useState(FAQS[0].id)
  const root = useRef(null)
  const { hash, key } = useLocation()

  const show = (fid) => {
    if (!FAQS.some((f) => f.id === fid)) return
    setOpen(fid)
    setTimeout(() => document.getElementById(`faq-${fid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }
  useEffect(() => {
    const m = /^#faq-(.+)$/.exec(hash)
    if (m) show(m[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, key])
  useEffect(() => on('faq:open', show), [])

  const onKey = (e, i) => {
    const btns = [...(root.current?.querySelectorAll('.sk-faq-q') || [])]
    const go = (n) => (e.preventDefault(), btns[(n + btns.length) % btns.length]?.focus())
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(btns.length - 1)
  }

  return (
    <section className="sk-faq" id={id} ref={root} aria-labelledby="faq-title">
      <h2 id="faq-title" data-reveal>
        Frequently Asked
        <br />
        Questions
      </h2>

      <div className="sk-faq-list">
        {FAQS.map((f, i) => {
          const isOpen = open === f.id
          return (
            <div className={`sk-faq-item${isOpen ? ' is-open' : ''}`} key={f.id} id={`faq-${f.id}`}>
              <h3>
                <button
                  type="button"
                  className="sk-faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${f.id}`}
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  {f.q}
                </button>
              </h3>
              <div className="sk-faq-a" id={`faq-a-${f.id}`} role="region" aria-label={f.q} inert={!isOpen}>
                <div>
                  {f.a.map((p, k) => (
                    <p key={k}>{p}</p>
                  ))}
                  {f.go && (
                    <Link to={f.go.to} className="sk-link">
                      {f.go.label} <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="sk-faq-foot">
        Still have a question? Ask your D-Group leader or any officer.
      </p>
    </section>
  )
}
