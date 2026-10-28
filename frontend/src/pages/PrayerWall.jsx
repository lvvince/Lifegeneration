import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  Sparkles, CheckCircle2, Lock, Plus, Trash2, HandHeart, X,
  Users, EyeOff, Send, Search, Check, Share2, BookOpen
} from 'lucide-react'
import { apiGet, apiPost, getUser } from '../api.js'
import { ConfirmDialog, useToast } from '../components/portal/ui.jsx'
import '../styles/prayer.css'

const COLORS = ['yellow', 'lilac', 'peach']
const PRAYED_KEY = 'lg-prayed'

const readPrayed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(PRAYED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
const writePrayed = (set) => {
  try {
    localStorage.setItem(PRAYED_KEY, JSON.stringify([...set]))
  } catch {
    /* walang storage, okay lang */
  }
}

// parehong note, parehong tabingi at kulay tuwing bubuksan (galing sa id)
const look = (id, i) => {
  const n = Number(id) || i + 1
  return { color: COLORS[(n * 7) % 3], rot: (((n * 37) % 9) - 4) * 0.8, dy: ((n * 53) % 5) * 5 }
}
const when = (d) => new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

export default function PrayerWall() {
  const user = getUser()
  const toast = useToast()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [composer, setComposer] = useState(false)
  const location = useLocation()
  const [initialPrayer, setInitialPrayer] = useState({ title: '', body: '' })

  // Devotional & Language toggle state
  const [devotional, setDevotional] = useState(null)
  const [showDevotional, setShowDevotional] = useState(false)
  const [pwLang, setPwLang] = useState('en') // 'en' | 'tl'

  // Live Bible Search on Prayer Wall
  const [showBibleSearch, setShowBibleSearch] = useState(false)
  const [bibleQuery, setBibleQuery] = useState('')
  const [bibleTrans, setBibleTrans] = useState('niv') // 'niv' | 'tl' | 'nkjv' | 'kjv' | 'web'
  const [bibleSearching, setBibleSearching] = useState(false)
  const [bibleResult, setBibleResult] = useState(null)
  const [bibleError, setBibleError] = useState('')
  const [bibleCopied, setBibleCopied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('compose') === '1') {
      const title = params.get('title') || ''
      const body = params.get('body') || ''
      setInitialPrayer({ title, body })
      setComposer(true)
    }
  }, [location.search])

  useEffect(() => {
    apiGet('/api/devotional/today').then(setDevotional).catch(() => {})
  }, [])

  const [open, setOpen] = useState(null) // id ng nakabukas na note
  const [toDelete, setToDelete] = useState(null)
  const [prayed, setPrayed] = useState(readPrayed)
  const [burst, setBurst] = useState(0)
  const root = useRef(null)

  const load = useCallback(
    () =>
      apiGet('/api/prayer')
        .then((d) => setPrayers(Array.isArray(d) ? d : []))
        .catch((e) => setError(e.message || 'Failed to load prayers.'))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    load()
  }, [load])

  // parallax: sumusunod ang title, magnets at mga note sa scroll
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let raf = 0
    const tick = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      el.style.setProperty('--sy', String(Math.max(-400, Math.min(400, -r.top))))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Esc isinasara ang note / composer
  useEffect(() => {
    if (!open && !composer) return undefined
    const key = (e) => e.key === 'Escape' && (setOpen(null), setComposer(false))
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, composer])

  const mine = (p) => user && (p.is_mine || (p.user_id && Number(p.user_id) === Number(user.id)))
  const owner = (p) => user && (mine(p) || user.role === 'admin')
  const answered = (p) => p.status === 'answered'
  const shown = useMemo(
    () => {
      const t = q.trim().toLowerCase()
      return prayers.filter((p) => (filter === 'answered' ? answered(p) : filter === 'mine' ? mine(p) : true) && (!t || `${p.title} ${p.body} ${p.member_name}`.toLowerCase().includes(t)))
    },
    [prayers, filter, q] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const current = prayers.find((p) => p.id === open)

  const togglePrayed = (id) => {
    setPrayed((old) => {
      const next = new Set(old)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        setBurst((b) => b + 1)
      }
      writePrayed(next)
      return next
    })
  }

  async function markAnswered(id) {
    try {
      const res = await apiPost('/api/prayer/mark-answered', { id })
      toast(res.message || 'Marked as answered. Praise God!')
      load()
    } catch (err) {
      toast(err.message || 'Failed to update prayer.', 'bad')
    }
  }

  async function remove() {
    try {
      await apiPost('/api/prayer/delete', { id: toDelete.id })
      toast('Prayer request deleted.')
      setToDelete(null)
      setOpen(null)
      load()
    } catch (err) {
      toast(err.message || 'Failed to delete prayer.', 'bad')
    }
  }

  // Bible search executor on Prayer Wall
  const doBibleSearch = async (queryToUse, transToUse = bibleTrans) => {
    const qStr = (queryToUse || bibleQuery).trim()
    if (!qStr) return
    setBibleSearching(true)
    setBibleError('')
    try {
      const res = await apiGet(`/api/bible/lookup?q=${encodeURIComponent(qStr)}&translation=${encodeURIComponent(transToUse)}`)
      if (res.success) {
        setBibleResult(res)
        setBibleError('')
      } else {
        setBibleError(res.error || 'Passage not found')
        setBibleResult(null)
      }
    } catch (err) {
      setBibleError(err.message || 'Passage not found. Try e.g. "John 3:16", "Awit 23", or "Romans 8:28"')
      setBibleResult(null)
    } finally {
      setBibleSearching(false)
    }
  }

  const handleStickBibleVerse = (res) => {
    if (!res) return
    const title = `Prayer: ${res.reference}`
    const body = `“${res.text}”\n— ${res.reference} (${res.translation_name})\n\nLord, teach me how to live out this truth...`
    setInitialPrayer({ title, body })
    setComposer(true)
  }

  const handleCopyBibleVerse = (res) => {
    if (!res) return
    navigator.clipboard?.writeText(`“${res.text}”\n— ${res.reference} (${res.translation_name})`)
    setBibleCopied(true)
    setTimeout(() => setBibleCopied(false), 2000)
  }

  const isTl = pwLang === 'tl'
  const currentVerse = (isTl && devotional?.verse_tl) ? devotional.verse_tl : (devotional?.verse || 'In every situation, by prayer and petition, present your requests to God.')
  const currentRef = (isTl && devotional?.reference_tl) ? devotional.reference_tl : (devotional?.reference || 'Philippians 4:6')
  const currentTitle = (isTl && devotional?.title_tl) ? devotional.title_tl : (devotional?.title || 'Verse of the Day')
  const currentTheme = (isTl && devotional?.theme_tl) ? devotional.theme_tl : (devotional?.theme || 'Prayer')
  const currentReflection = (isTl && devotional?.reflection_tl) ? devotional.reflection_tl : devotional?.reflection
  const currentPrayer = (isTl && devotional?.prayer_prompt_tl) ? devotional.prayer_prompt_tl : devotional?.prayer_prompt

  const tabs = [
    ['all', 'All', prayers.length],
    ['answered', 'Answered', prayers.filter(answered).length],
    ...(user ? [['mine', 'Mine', prayers.filter(mine).length]] : []),
  ]

  return (
    <div className="pw" ref={root}>
      <header className="pw-head">
        <div className="pw-head-l">
          <span className="pw-kicker-top">Prayer wall</span>
          <h1 className="pw-title">
            i <span>pray</span> for<em>…</em>
          </h1>

          {/* Daily Scripture Bar */}
          <div className="pw-verse" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>“{currentVerse}”</span>
            <b>{currentRef}</b>

            {/* Language Switcher */}
            {devotional && (
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 999,
                  padding: 2,
                  background: 'rgba(0,0,0,0.06)',
                  alignItems: 'center'
                }}
                title="Switch Language"
              >
                <button
                  type="button"
                  onClick={() => setPwLang('en')}
                  style={{
                    border: 0,
                    background: !isTl ? '#ffffff' : 'transparent',
                    color: !isTl ? '#ff5a0a' : '#586079',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    boxShadow: !isTl ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setPwLang('tl')}
                  style={{
                    border: 0,
                    background: isTl ? '#ffffff' : 'transparent',
                    color: isTl ? '#ff5a0a' : '#586079',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    boxShadow: isTl ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  🇵🇭 TL
                </button>
              </div>
            )}

            {/* Read Reflection toggle */}
            {devotional && (
              <button
                type="button"
                onClick={() => setShowDevotional(!showDevotional)}
                style={{
                  border: 0,
                  background: 'rgba(255, 90, 10, 0.12)',
                  color: '#ff5a0a',
                  padding: '3px 11px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {showDevotional ? (isTl ? 'Itago ang Pagninilay' : 'Hide Reflection') : (isTl ? 'Basahin ang Pagninilay' : 'Read Today’s Reflection')}
              </button>
            )}

            {/* Search Bible button */}
            <button
              type="button"
              onClick={() => {
                setShowBibleSearch(!showBibleSearch)
                if (!showBibleSearch) setBibleResult(null)
              }}
              style={{
                border: 0,
                background: showBibleSearch ? '#ff5a0a' : 'rgba(0,0,0,0.06)',
                color: showBibleSearch ? '#fff' : 'var(--p-text-2, #586079)',
                padding: '3px 11px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Look up any Bible verse in NIV, Tagalog, NKJV"
            >
              <Search size={12} />
              <span>{showBibleSearch ? (isTl ? 'Isara ang Search' : 'Close Search') : (isTl ? 'Maghanap sa Bibliya' : 'Search Bible')}</span>
            </button>
          </div>

          {/* Collapsible Reflection Box */}
          {showDevotional && devotional && (
            <div
              style={{
                marginTop: 12,
                padding: '16px 20px',
                background: 'var(--p-surface, #ffffff)',
                border: '1px solid var(--p-border, #e5e8f1)',
                borderRadius: 16,
                boxShadow: '0 8px 24px -8px rgba(0,0,0,0.08)',
                maxWidth: 620
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#ff5a0a', background: 'rgba(255, 90, 10, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  {currentTheme}
                </span>
                <strong style={{ fontSize: 13.5 }}>{currentTitle}</strong>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: 'var(--p-text-2, #586079)' }}>
                {currentReflection}
              </p>
    
              {currentPrayer && (
                <div style={{ fontSize: 12, fontStyle: 'italic', color: '#c2410c', borderLeft: '3px solid #ff5a0a', paddingLeft: 10, background: 'rgba(255, 90, 10, 0.04)', padding: '6px 10px', borderRadius: '0 8px 8px 0' }}>
                  <b>{isTl ? 'Panalangin:' : 'Prayer:'}</b> {currentPrayer}
                </div>
              )}
            </div>
          )}

          {/* Collapsible Live Bible Search Box */}
          {showBibleSearch && (
            <div
              style={{
                marginTop: 14,
                padding: '16px 20px',
                background: '#ffffff',
                border: '1px solid rgba(255, 90, 10, 0.25)',
                borderRadius: 16,
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                maxWidth: 620
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  doBibleSearch()
                }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}
              >
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: 11, opacity: 0.5 }} />
                  <input
                    type="text"
                    value={bibleQuery}
                    onChange={(e) => setBibleQuery(e.target.value)}
                    placeholder={isTl ? "I-type ang talata (hal. Juan 3:16, Awit 23)..." : "Search passage (e.g. John 3:16, Psalm 23)..."}
                    style={{
                      width: '100%',
                      paddingLeft: 32,
                      paddingRight: 10,
                      height: 38,
                      borderRadius: 10,
                      border: '1px solid var(--p-border, #e5e8f1)',
                      fontSize: 13
                    }}
                    autoFocus
                  />
                </div>

                <select
                  value={bibleTrans}
                  onChange={(e) => {
                    setBibleTrans(e.target.value)
                    if (bibleQuery.trim()) doBibleSearch(bibleQuery, e.target.value)
                  }}
                  style={{
                    height: 38,
                    borderRadius: 10,
                    border: '1px solid var(--p-border, #e5e8f1)',
                    padding: '0 8px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: '#fff'
                  }}
                >
                  <option value="niv">NIV</option>
                  <option value="tl">Tagalog (MBB)</option>
                  <option value="nkjv">NKJV</option>
                  <option value="kjv">KJV</option>
                  <option value="web">WEB</option>
                </select>

                <button
                  type="submit"
                  disabled={bibleSearching || !bibleQuery.trim()}
                  style={{
                    background: '#ff5a0a',
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '0 16px',
                    height: 38,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {bibleSearching ? '...' : (isTl ? 'Hanapin' : 'Lookup')}
                </button>
              </form>

              {/* Quick suggestions */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--p-text-3)', textTransform: 'uppercase' }}>
                  {isTl ? 'Mungkahi:' : 'Popular:'}
                </span>
                {['John 3:16', 'Jeremiah 29:11', 'Philippians 4:6', 'Psalm 23'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setBibleQuery(chip)
                      doBibleSearch(chip)
                    }}
                    style={{
                      border: 0,
                      background: bibleQuery === chip ? 'rgba(255, 90, 10, 0.15)' : 'rgba(0,0,0,0.04)',
                      color: bibleQuery === chip ? '#ff5a0a' : 'inherit',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {bibleError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 12, marginBottom: 8 }}>
                  {bibleError}
                </div>
              )}

              {bibleResult && (
                <div style={{ padding: '12px 14px', background: 'rgba(255, 90, 10, 0.04)', borderRadius: 12, border: '1px solid rgba(255, 90, 10, 0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 14, color: '#ff5a0a' }}>{bibleResult.reference}</strong>
                    <span style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 4 }}>
                      {bibleResult.translation_name}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.5, fontStyle: 'italic', color: '#1a1f2e' }}>
                    &ldquo;{bibleResult.text}&rdquo;
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleStickBibleVerse(bibleResult)}
                      style={{
                        background: '#ff5a0a',
                        color: '#fff',
                        border: 0,
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Plus size={13} />
                      <span>{isTl ? 'I-stick bilang Panalangin' : 'Stick as Prayer Note'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyBibleVerse(bibleResult)}
                      style={{
                        background: '#fff',
                        border: '1px solid var(--p-border, #e5e8f1)',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {bibleCopied ? <Check size={13} color="#16a34a" /> : <Share2 size={13} />}
                      <span>{bibleCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pw-head-r">
          {user ? (
            <button type="button" className="pw-add" onClick={() => setComposer(true)}>
              <Plus size={18} /> Stick a note
            </button>
          ) : (
            <Link to="/login" className="pw-add">
              Sign in to post
            </Link>
          )}
        </div>
      </header>

      <div className="pw-tools">
        <label className="pw-search">
          <Search size={17} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>
        <div className="pw-tabs" role="tablist" aria-label="Filter notes">
          {tabs.map(([key, label, n]) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}>
              {label} <small>{n}</small>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="pw-alert">{error}</div>}

      <section className="pw-board" aria-live="polite">
        {loading ? (
          <div className="pw-wall" aria-busy="true">
            {[150, 210, 180, 240, 170, 200].map((h, i) => (
              <div className="pw-note is-skel" key={i} style={{ height: h }} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="pw-empty">
            <div className="pw-note c-yellow is-blank" style={{ '--r': '-2deg' }}>
              <h3>{q ? 'No match' : filter === 'mine' ? 'Nothing here yet' : 'Be the first'}</h3>
              <p>{q ? 'Try a different word.' : filter === 'mine' ? 'Notes you post will stick here.' : 'Write what we can pray about and stick it on the wall.'}</p>
            </div>
          </div>
        ) : (
          <div className="pw-wall" key={`${filter}-${q}`}>
            {shown.map((p, i) => {
              const l = look(p.id, i)
              return (
                <article
                  key={p.id}
                  className={`pw-note c-${l.color}${answered(p) ? ' is-answered' : ''}${prayed.has(p.id) ? ' is-prayed' : ''}`}
                  style={{ '--r': `${l.rot}deg`, '--i': Math.min(i, 12), '--k': (i % 3) + 1 }}
                >
                  <i className="pw-tape" aria-hidden="true" />
                  <button type="button" className="pw-open" onClick={() => setOpen(p.id)} aria-label={`Open prayer note: ${p.title}`} />
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  <footer>
                    <span className="pw-by">
                      {p.visibility === 'private' && <Lock size={12} aria-label="Leaders only" />}
                      {p.member_name}
                      <time>{when(p.created_at)}</time>
                    </span>
                    <button type="button" className="pw-pray-mini" aria-pressed={prayed.has(p.id)} aria-label={prayed.has(p.id) ? 'Remove prayed mark' : 'I prayed for this'} onClick={() => togglePrayed(p.id)}>
                      <HandHeart size={17} />
                    </button>
                  </footer>
                  {answered(p) && <span className="pw-stamp">Answered</span>}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ---------- binuksang note ---------- */}
      {current && createPortal(
        <div className="pw pw-layer"><div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <article className={`pw-big c-${look(current.id, 0).color}${answered(current) ? ' is-answered' : ''}`} role="dialog" aria-modal="true" aria-label={current.title}>
            <i className="pw-tape" aria-hidden="true" />
            <button type="button" className="pw-x" onClick={() => setOpen(null)} aria-label="Close">
              <X size={18} />
            </button>
            {answered(current) && (
              <span className="pw-tag ok">
                <Sparkles size={13} /> Answered
              </span>
            )}
            {current.visibility === 'private' && (
              <span className="pw-tag">
                <Lock size={12} /> Leaders only
              </span>
            )}
            <h2>{current.title}</h2>
            <p>{current.body}</p>
            <footer>
              <span>{current.member_name}</span>
              <time>{when(current.created_at)}</time>
            </footer>
            <div className="pw-actions">
              <button type="button" className={`pw-pray${prayed.has(current.id) ? ' is-on' : ''}`} onClick={() => togglePrayed(current.id)} key={burst}>
                <HandHeart size={18} /> {prayed.has(current.id) ? 'You prayed for this' : 'I prayed for this'}
              </button>
              {owner(current) && !answered(current) && (
                <button type="button" className="pw-ghost" onClick={() => markAnswered(current.id)}>
                  <CheckCircle2 size={16} /> Answered
                </button>
              )}
              {owner(current) && (
                <button type="button" className="pw-ghost is-danger" onClick={() => setToDelete(current)} aria-label="Delete note">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </article>
        </div></div>,
        document.body
      )}

      {composer && createPortal(<div className="pw pw-layer"><Composer initial={initialPrayer} onClose={() => setComposer(false)} onDone={() => { setComposer(false); load() }} toast={toast} /></div>, document.body)}

      {toDelete && (
        <ConfirmDialog title="Delete this note?" message={`"${toDelete.title}" will be removed for everyone.`} confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setToDelete(null)} />
      )}
    </div>
  )
}

/* Blangkong sticky note na sinusulatan */
function Composer({ initial, onClose, onDone, toast }) {
  const [form, setForm] = useState({ title: initial?.title || '', body: initial?.body || '', visibility: 'public', anonymous: false })
  const [color, setColor] = useState('yellow')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setErr('Give your note a short title.')
    if (!form.body.trim()) return setErr('Write what we can pray about.')
    setErr('')
    setBusy(true)
    try {
      const res = await apiPost('/api/prayer/submit', { title: form.title.trim(), body: form.body.trim(), visibility: form.visibility, is_anonymous: form.anonymous })
      toast(res.message || 'Your note is on the wall.')
      onDone()
    } catch (err) {
      toast(err.message || 'Failed to post prayer request.', 'bad')
      setBusy(false)
    }
  }

  return (
    <div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`pw-big is-compose c-${color}`} onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-label="Write a prayer note">
        <i className="pw-tape" aria-hidden="true" />
        <button type="button" className="pw-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <small className="pw-kicker">Write a note</small>
        <input className="pw-in pw-in-title" value={form.title} onChange={set('title')} placeholder="I pray for…" maxLength={80} autoFocus aria-label="Title" />
        <textarea className="pw-in pw-in-body" value={form.body} onChange={set('body')} placeholder="Share what we can pray about" rows={5} maxLength={600} aria-label="Details" />
        {err && <p className="pw-err" role="alert">{err}</p>}
        <div className="pw-opts">
          <div className="pw-sw" role="radiogroup" aria-label="Who can see this?">
            <button type="button" role="radio" aria-checked={form.visibility === 'public'} className={form.visibility === 'public' ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, visibility: 'public' }))}>
              <Users size={15} /> Everyone
            </button>
            <button type="button" role="radio" aria-checked={form.visibility === 'private'} className={form.visibility === 'private' ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, visibility: 'private' }))}>
              <Lock size={14} /> Leaders
            </button>
          </div>
          <button type="button" className={`pw-anon${form.anonymous ? ' is-on' : ''}`} onClick={() => setForm((f) => ({ ...f, anonymous: !f.anonymous }))} aria-pressed={form.anonymous}>
            <EyeOff size={15} /> No name
          </button>
          <div className="pw-swatches" role="radiogroup" aria-label="Note color">
            {COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={`sw-${c}${color === c ? ' is-on' : ''}`} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <button type="submit" className="pw-send" disabled={busy}>
          {busy ? 'Sticking…' : <><Send size={16} /> Stick it on the wall</>}
        </button>
      </form>
    </div>
  )
}
