import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  Sparkles, CheckCircle2, Lock, Plus, Trash2, HandHeart, X,
  Users, EyeOff, Send, Search, Check, Share2, BookOpen, ImagePlus
} from 'lucide-react'
import { apiGet, apiPost, apiRequest, API_URL, getUser } from '../api.js'
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
const KINDS = ['pin', 'paper', 'stack']
const look = (id, i) => {
  const n = Number(id) || i + 1
  return { color: COLORS[(n * 7) % 3], kind: KINDS[(n * 5) % 3], rot: (((n * 37) % 9) - 4) * 0.7, flip: n % 2 === 0 }
}
const photoUrl = (p) => (/^(https?:|data:|blob:)/.test(String(p)) ? p : p ? `${API_URL}/${String(p).replace(/^\/+/, '')}` : '')
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

          {/* Verse of the day: pinned to the board */}
          <figure className="pw-vod">
            <i className="pw-pin" aria-hidden="true" />
            <figcaption className="pw-vod-top">
              <span className="pw-vod-label"><BookOpen size={14} aria-hidden="true" /> {isTl ? 'Talata ngayong araw' : 'Verse of the day'}</span>
              {devotional && (
                <div className="pw-lang" role="group" aria-label="Language">
                  <button type="button" aria-pressed={!isTl} className={!isTl ? 'is-on' : ''} onClick={() => setPwLang('en')}>EN</button>
                  <button type="button" aria-pressed={isTl} className={isTl ? 'is-on' : ''} onClick={() => setPwLang('tl')}>TL</button>
                </div>
              )}
            </figcaption>
            <blockquote className="pw-vod-q">“{currentVerse}”</blockquote>
            <cite className="pw-vod-ref">{currentRef}</cite>
            <div className="pw-vod-acts">
              {devotional && (
                <button type="button" className="pw-chip" aria-expanded={showDevotional} onClick={() => setShowDevotional(!showDevotional)}>
                  {showDevotional ? (isTl ? 'Itago ang Pagninilay' : 'Hide reflection') : (isTl ? 'Basahin ang Pagninilay' : 'Read reflection')}
                </button>
              )}
              <button type="button" className={`pw-chip${showBibleSearch ? ' is-on' : ''}`} aria-expanded={showBibleSearch} onClick={() => { setShowBibleSearch(!showBibleSearch); if (!showBibleSearch) setBibleResult(null) }}>
                <Search size={13} aria-hidden="true" /> {showBibleSearch ? (isTl ? 'Isara ang Search' : 'Close search') : (isTl ? 'Maghanap sa Bibliya' : 'Search Bible')}
              </button>
            </div>

            {showDevotional && devotional && (
              <div className="pw-vod-more">
                <p className="pw-vod-theme"><b>{currentTheme}</b> {currentTitle}</p>
                {currentReflection && <p>{currentReflection}</p>}
                {currentPrayer && <p className="pw-vod-prayer"><b>{isTl ? 'Panalangin:' : 'Prayer:'}</b> {currentPrayer}</p>}
              </div>
            )}

            {showBibleSearch && (
              <div className="pw-vod-more">
                <form className="pw-bs" onSubmit={(e) => { e.preventDefault(); doBibleSearch() }}>
                  <label className="pw-bs-in">
                    <Search size={15} aria-hidden="true" />
                    <input type="text" value={bibleQuery} onChange={(e) => setBibleQuery(e.target.value)} placeholder={isTl ? 'Juan 3:16, Awit 23…' : 'John 3:16, Psalm 23…'} aria-label="Bible passage" autoFocus />
                  </label>
                  <select value={bibleTrans} aria-label="Translation" onChange={(e) => { setBibleTrans(e.target.value); if (bibleQuery.trim()) doBibleSearch(bibleQuery, e.target.value) }}>
                    <option value="niv">NIV</option>
                    <option value="tl">Tagalog (MBB)</option>
                    <option value="nkjv">NKJV</option>
                    <option value="kjv">KJV</option>
                    <option value="web">WEB</option>
                  </select>
                  <button type="submit" className="pw-chip is-solid" disabled={bibleSearching || !bibleQuery.trim()}>{bibleSearching ? '…' : (isTl ? 'Hanapin' : 'Look up')}</button>
                </form>
                <div className="pw-bs-pop">
                  {['John 3:16', 'Jeremiah 29:11', 'Philippians 4:6', 'Psalm 23'].map((chip) => (
                    <button key={chip} type="button" className={`pw-chip${bibleQuery === chip ? ' is-on' : ''}`} onClick={() => { setBibleQuery(chip); doBibleSearch(chip) }}>{chip}</button>
                  ))}
                </div>
                {bibleError && <p className="pw-err" role="alert">{bibleError}</p>}
                {bibleResult && (
                  <div className="pw-bs-res">
                    <p className="pw-bs-ref"><b>{bibleResult.reference}</b> <span>{bibleResult.translation_name}</span></p>
                    <p className="pw-bs-text">“{bibleResult.text}”</p>
                    <div className="pw-vod-acts">
                      <button type="button" className="pw-chip is-solid" onClick={() => handleStickBibleVerse(bibleResult)}><Plus size={13} aria-hidden="true" /> {isTl ? 'I-stick bilang Panalangin' : 'Stick as prayer note'}</button>
                      <button type="button" className="pw-chip" onClick={() => handleCopyBibleVerse(bibleResult)}>{bibleCopied ? <Check size={13} aria-hidden="true" /> : <Share2 size={13} aria-hidden="true" />} {bibleCopied ? 'Copied' : 'Copy'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </figure>
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
                <div key={p.id} className={`pw-item${p.image ? ' has-photo' : ''}${l.flip ? ' is-flip' : ''}`} style={{ '--i': Math.min(i, 12), '--r': `${l.rot}deg` }}>
                  <article className={`pw-note k-${l.kind} c-${l.color}${answered(p) ? ' is-answered' : ''}${prayed.has(p.id) ? ' is-prayed' : ''}`} style={{ '--k': (i % 3) + 1 }}>
                    <i className="pw-fix" aria-hidden="true" />
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
                  {p.image && (
                    <figure className="pw-photo">
                      <i className="pw-fix is-tape" aria-hidden="true" />
                      <img src={photoUrl(p.image)} alt={`Photo shared with: ${p.title}`} loading="lazy" decoding="async" />
                    </figure>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ---------- binuksang note ---------- */}
      {current && createPortal(
        <div className="pw pw-layer"><div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <article className={`pw-big c-${look(current.id, 0).color}${answered(current) ? ' is-answered' : ''}`} role="dialog" aria-modal="true" aria-label={current.title}>
            <i className="pw-fix" aria-hidden="true" />
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
            {current.image && <img className="pw-big-img" src={photoUrl(current.image)} alt={`Photo shared with: ${current.title}`} decoding="async" />}
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
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErr('Please attach a JPG, PNG or WEBP photo.')
    if (f.size > 8 * 1024 * 1024) return setErr('That photo is over 8 MB. Please choose a smaller one.')
    setErr('')
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }
  const dropPhoto = () => { setPhoto(null); setPreview('') }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setErr('Give your note a short title.')
    if (!form.body.trim()) return setErr('Write what we can pray about.')
    setErr('')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('body', form.body.trim())
      fd.append('visibility', form.visibility)
      fd.append('is_anonymous', form.anonymous ? '1' : '0')
      if (photo) fd.append('image', photo)
      const res = await apiRequest('/api/prayer/submit', { method: 'POST', body: fd })
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
        <i className="pw-fix" aria-hidden="true" />
        <button type="button" className="pw-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <small className="pw-kicker">Write a note</small>
        <input className="pw-in pw-in-title" value={form.title} onChange={set('title')} placeholder="I pray for…" maxLength={80} autoFocus aria-label="Title" />
        <textarea className="pw-in pw-in-body" value={form.body} onChange={set('body')} placeholder="Share what we can pray about" rows={5} maxLength={600} aria-label="Details" />
        <div className="pw-attach">
          {preview ? (
            <div className="pw-attach-prev">
              <img src={preview} alt="Selected photo preview" />
              <button type="button" onClick={dropPhoto} aria-label="Remove photo"><X size={15} /></button>
            </div>
          ) : (
            <label className="pw-attach-btn">
              <ImagePlus size={16} aria-hidden="true" /> Add a photo <small>optional</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />
            </label>
          )}
        </div>
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
