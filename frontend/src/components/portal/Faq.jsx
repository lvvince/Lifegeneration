import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, ArrowRight, X } from 'lucide-react'
import { FAQS, FAQ_CATS } from '../../data/faqs.js'
import { on } from '../../lib/bus.js'

/* Frequently Asked Questions
   - Accordion: isang bukas lang sa isang oras, smooth ang taas (grid 0fr -> 1fr)
   - Search + category chips (walang highlight na text, para di maselect)
   - Event-driven: emit('faq:open', 'rsvp') kahit saang page -> bubukas at mag-i-scroll
   - Keyboard: Enter/Space buksan, Arrow Up/Down lipat ng tanong, Home/End */
export default function Faq({ id = 'faq' }) {
  const [open, setOpen] = useState(FAQS[0].id)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const root = useRef(null)
  const { hash, key } = useLocation()

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return FAQS.filter((f) => (cat === 'all' || f.cat === cat) && (!t || f.q.toLowerCase().includes(t) || f.a.join(' ').toLowerCase().includes(t)))
  }, [cat, q])

  // may nag-emit ng faq:open o may #faq-<id> sa link
  const show = (fid) => {
    if (!FAQS.some((f) => f.id === fid)) return
    setCat('all')
    setQ('')
    setOpen(fid)
    setTimeout(() => document.getElementById(`faq-${fid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
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
      <header className="sk-faq-head" data-reveal>
        <h2 id="faq-title">
          Frequently Asked
          <br />
          Questions
        </h2>
        <p>Quick answers about D-Groups, events and your account.</p>
      </header>

      <div className="sk-faq-tools" data-reveal data-delay="1">
        <label className="sk-faq-search">
          <Search size={18} strokeWidth={1.8} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a question" autoComplete="off" enterKeyHint="search" aria-label="Search questions" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="sk-chips" role="tablist" aria-label="FAQ categories">
          {FAQ_CATS.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'is-on' : ''} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sk-faq-list" data-reveal data-delay="2">
        {list.length === 0 && (
          <div className="sk-faq-none">
            <b>No answers found</b>
            <span>Try another word, or ask your D-Group leader.</span>
          </div>
        )}
        {list.map((f, i) => {
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
                  <span>{f.q}</span>
                  <i aria-hidden="true">
                    <Plus size={18} strokeWidth={2} />
                  </i>
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

      <div className="sk-faq-foot" data-reveal>
        <b>Still have a question?</b>
        <span>Ask your D-Group leader or any officer. We are happy to help.</span>
        <Link to="/dgroups" className="sk-btn is-soft">
          Find my D-Group <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
