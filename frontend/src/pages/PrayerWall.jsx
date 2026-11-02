import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  Sparkles, CheckCircle2, Lock, Plus, Trash2, HandHeart, X, Users, EyeOff, Send, Search, Check, Share2,
  BookOpen, ImagePlus, User, Home, HeartPulse, Compass, Flower2, Ellipsis, Sun, ArrowRight,
} from 'lucide-react'
import { apiGet, apiPost, apiRequest, API_URL, getUser } from '../api.js'
import { ConfirmDialog, useToast } from '../components/portal/ui.jsx'
import Garland from '../components/faith/Garland.jsx'
import FaithTabs from '../components/faith/FaithTabs.jsx'
import '../styles/prayer.css'
import '../styles/prayer2.css'
import '../styles/faith.css'

export const CATS = [
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'family', label: 'Family', icon: Home },
  { key: 'healing', label: 'Healing', icon: HeartPulse },
  { key: 'guidance', label: 'Guidance', icon: Compass },
  { key: 'gratitude', label: 'Gratitude', icon: Flower2 },
  { key: 'others', label: 'Others', icon: Ellipsis },
]
const catOf = (k) => CATS.find((c) => c.key === k) || CATS[0]
const SORTS = [
  ['new', 'Newest first'],
  ['prayed', 'Most prayed for'],
  ['answered', 'Answered first'],
  ['old', 'Oldest first'],
]

const photoUrl = (p) => (/^(https?:|data:|blob:)/.test(String(p)) ? p : p ? `${API_URL}/${String(p).replace(/^\/+/, '')}` : '')
const when = (d) => new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
const tilt = (id, i) => ((((Number(id) || i + 1) * 37) % 9) - 4) * 0.55

export default function PrayerWall() {
  const user = getUser()
  const toast = useToast()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('new')
  const [q, setQ] = useState('')
  const [composer, setComposer] = useState(false)
  const [freshId, setFreshId] = useState(null)
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
      setInitialPrayer({ title: params.get('title') || '', body: params.get('body') || '' })
      setComposer(true)
    }
  }, [location.search])

  useEffect(() => {
    apiGet('/api/devotional/today').then(setDevotional).catch(() => {})
  }, [])

  const [open, setOpen] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [testi, setTesti] = useState('')
  const root = useRef(null)

  const load = useCallback(
    () =>
      apiGet('/api/prayer')
        .then((d) => setPrayers(Array.isArray(d) ? d : []))
        .catch((e) => setError(e.message || 'Failed to load prayers.'))
        .finally(() => setLoading(false)),
    []
  )
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!open && !composer) return undefined
    const key = (e) => e.key === 'Escape' && (setOpen(null), setComposer(false))
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, composer])

  const mine = (p) => !!user && !!p.is_mine
  const owner = (p) => user && (mine(p) || user.role === 'admin' || user.role === 'officer')
  const answered = (p) => p.status === 'answered'

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = prayers.filter((p) =>
      (filter === 'answered' ? answered(p) : filter === 'active' ? !answered(p) : filter === 'mine' ? mine(p) : true) &&
      (cat === 'all' || (p.category || 'personal') === cat) &&
      (!t || `${p.title} ${p.body} ${p.member_name} ${p.testimony || ''}`.toLowerCase().includes(t))
    )
    const ts = (p) => new Date(String(p.created_at).replace(' ', 'T')).getTime() || 0
    const by = {
      new: (a, b) => ts(b) - ts(a),
      old: (a, b) => ts(a) - ts(b),
      prayed: (a, b) => (b.prayer_count || 0) - (a.prayer_count || 0) || ts(b) - ts(a),
      answered: (a, b) => Number(answered(b)) - Number(answered(a)) || ts(b) - ts(a),
    }[sort]
    return [...list].sort(by)
  }, [prayers, filter, cat, sort, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const current = prayers.find((p) => p.id === open)

  async function pray(p) {
    if (!user) return toast('Sign in to pray for someone.', 'bad')
    const was = !!p.i_prayed
    setPrayers((old) => old.map((x) => (x.id === p.id ? { ...x, i_prayed: !was, prayer_count: Math.max(0, (x.prayer_count || 0) + (was ? -1 : 1)) } : x)))
    try {
      const r = await apiPost('/api/prayer/pray', { id: p.id })
      setPrayers((old) => old.map((x) => (x.id === p.id ? { ...x, i_prayed: r.on, prayer_count: r.count } : x)))
    } catch (e) {
      toast(e.message || 'Could not save your prayer.', 'bad')
      load()
    }
  }

  async function markAnswered(p, text) {
    try {
      const res = await apiPost('/api/prayer/mark-answered', { id: p.id, testimony: text })
      toast(res.message || 'Marked as answered. Praise God!')
      setTesti('')
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
    ['active', 'Praying', prayers.filter((p) => !answered(p)).length],
    ['answered', 'Answered', prayers.filter(answered).length],
    ...(user ? [['mine', 'Mine', prayers.filter(mine).length]] : []),
  ]
  const totalPrayers = prayers.reduce((n, p) => n + (p.prayer_count || 0), 0)

  return (
    <div className="pw fh" ref={root}>
      <section className="fh-hero">
        <Garland />
        <FaithTabs />
        <div className="fh-hero-grid">
          <div className="fh-hero-main">
            <span className="fh-kicker">A place to carry one another</span>
            <h1 className="fh-title">Prayer Wall</h1>
            <p className="fh-verse">
              “Confess your sins to one another and pray for one another, so that you may be healed.” <cite>James 5:16</cite>
            </p>
            <ul className="fh-stats" aria-label="Prayer wall summary">
              <li><b>{prayers.length}</b> requests</li>
              <li><b>{totalPrayers}</b> prayers lifted</li>
              <li><b>{prayers.filter(answered).length}</b> answered</li>
            </ul>
            <div className="fh-cta">
              {user ? (
                <button type="button" className="fh-btn is-primary" onClick={() => setComposer(true)}><Plus size={18} aria-hidden="true" /> Pin a prayer</button>
              ) : (
                <Link to="/login" className="fh-btn is-primary">Sign in to post</Link>
              )}
              <Link to="/god-today" className="fh-btn"><Sun size={17} aria-hidden="true" /> Where have you seen God today? <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          {/* Verse of the day: pinned to the board */}
          <figure className="pw-vod fh-vod">
            <i className="fh-pin" aria-hidden="true" />
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
      </section>

      <div className="fh-tools">
        <label className="fh-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prayers" aria-label="Search prayers" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search"><X size={15} /></button>}
        </label>
        <select className="fh-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort prayers">
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="fh-seg" role="group" aria-label="Show">
          {tabs.map(([key, label, n]) => (
            <button key={key} type="button" className={filter === key ? 'is-on' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<em>{n}</em></button>
          ))}
        </div>
        <div className="fh-cats" role="group" aria-label="Category">
          <button type="button" className={cat === 'all' ? 'is-on' : ''} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
          {CATS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={`c-${key}${cat === key ? ' is-on' : ''}`} aria-pressed={cat === key} onClick={() => setCat(key)}><Icon size={14} aria-hidden="true" />{label}</button>
          ))}
        </div>
      </div>

      {error && <div className="pw-alert">{error}</div>}

      <section className="fh-board" aria-live="polite" aria-label="Prayer requests">
        {loading ? (
          <div className="fh-grid" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => <div className="fh-note is-skel" key={i} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="fh-empty">
            <div className="fh-note c-personal is-blank">
              <i className="fh-pin" aria-hidden="true" />
              <h3>{q || cat !== 'all' ? 'Nothing matches' : filter === 'mine' ? 'Nothing here yet' : 'Be the first'}</h3>
              <p>{q || cat !== 'all' ? 'Try another word or category.' : 'Pin a prayer request and let the community stand with you.'}</p>
            </div>
          </div>
        ) : (
          <div className="fh-grid" key={`${filter}-${cat}-${sort}-${q}`}>
            {shown.map((p, i) => {
              const c = catOf(p.category)
              const Icon = c.icon
              return (
                <article key={p.id} className={`fh-note c-${c.key}${answered(p) ? ' is-answered' : ''}${p.i_prayed ? ' is-prayed' : ''}${freshId === p.id ? ' is-new' : ''}`} style={{ '--i': Math.min(i, 12), '--r': `${tilt(p.id, i)}deg` }}>
                  <i className="fh-pin" aria-hidden="true" />
                  <button type="button" className="fh-open" onClick={() => setOpen(p.id)} aria-label={`Open prayer: ${p.title}`} />
                  <div className="fh-note-top">
                    <span className="fh-cat"><Icon size={12} aria-hidden="true" /> {c.label}</span>
                    {p.visibility === 'private' && <span className="fh-lock" title="Leaders only"><Lock size={12} aria-label="Leaders only" /></span>}
                    {answered(p) && <span className="fh-ans"><Sparkles size={12} aria-hidden="true" /> Answered</span>}
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  {answered(p) && p.testimony && <q className="fh-testi">{p.testimony}</q>}
                  <footer>
                    <span className="fh-by">{p.is_anonymous ? <EyeOff size={12} aria-hidden="true" /> : null}{p.member_name}<time>{when(p.created_at)}</time></span>
                    <button type="button" className={`fh-pray${p.i_prayed ? ' is-on' : ''}`} aria-pressed={!!p.i_prayed} aria-label={`${p.i_prayed ? 'Stop praying for' : 'Pray for'} ${p.title}. ${p.prayer_count || 0} praying`} onClick={() => pray(p)}>
                      <HandHeart size={16} aria-hidden="true" />
                      <b>{p.prayer_count || 0}</b>
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {current && createPortal(
        <div className="pw pw-layer fh"><div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <article className={`pw-big fh-big c-${catOf(current.category).key}`} role="dialog" aria-modal="true" aria-label={current.title}>
            <i className="fh-pin" aria-hidden="true" />
            <button type="button" className="pw-x" onClick={() => setOpen(null)} aria-label="Close"><X size={18} /></button>
            <div className="fh-note-top">
              <span className="fh-cat">{(() => { const I = catOf(current.category).icon; return <I size={12} aria-hidden="true" /> })()} {catOf(current.category).label}</span>
              {current.visibility === 'private' && <span className="fh-lock"><Lock size={12} aria-hidden="true" /> Leaders only</span>}
              {answered(current) && <span className="fh-ans"><Sparkles size={12} aria-hidden="true" /> Answered</span>}
            </div>
            <h2>{current.title}</h2>
            {current.image && <img className="pw-big-img" src={photoUrl(current.image)} alt={`Photo shared with: ${current.title}`} decoding="async" />}
            <p>{current.body}</p>
            {answered(current) && current.testimony && (
              <div className="fh-testi-big"><b><Sparkles size={14} aria-hidden="true" /> How God answered</b><p>{current.testimony}</p></div>
            )}
            <footer><span>{current.member_name}</span><time>{when(current.created_at)}</time></footer>
            <div className="fh-pray-row">
              <button type="button" className={`fh-btn is-primary fh-pray-big${current.i_prayed ? ' is-on' : ''}`} onClick={() => pray(current)} aria-pressed={!!current.i_prayed} key={`${current.id}-${current.i_prayed}`}>
                <HandHeart size={18} aria-hidden="true" /> {current.i_prayed ? 'You are praying for this' : 'I will pray for this'}
                {current.i_prayed && [0, 1, 2, 3, 4, 5].map((n) => <i key={n} className="pw-spark" style={{ '--a': `${n * 60}deg` }} aria-hidden="true" />)}
              </button>
              <span className="fh-count"><b>{current.prayer_count || 0}</b> {current.prayer_count === 1 ? 'person is' : 'people are'} praying</span>
            </div>
            {owner(current) && !answered(current) && (
              <form className="fh-testi-form" onSubmit={(e) => { e.preventDefault(); markAnswered(current, testi) }}>
                <label htmlFor="fh-testi">God answered? Share a short testimony <small>(optional)</small></label>
                <textarea id="fh-testi" rows={3} maxLength={800} value={testi} onChange={(e) => setTesti(e.target.value)} placeholder="Tell us how God moved…" />
                <button type="submit" className="fh-btn is-sage"><CheckCircle2 size={16} aria-hidden="true" /> Mark as answered</button>
              </form>
            )}
            {owner(current) && answered(current) && !current.testimony && (
              <form className="fh-testi-form" onSubmit={(e) => { e.preventDefault(); markAnswered(current, testi) }}>
                <label htmlFor="fh-testi2">Add your testimony</label>
                <textarea id="fh-testi2" rows={3} maxLength={800} value={testi} onChange={(e) => setTesti(e.target.value)} placeholder="Tell us how God moved…" />
                <button type="submit" className="fh-btn is-sage" disabled={!testi.trim()}><Check size={16} aria-hidden="true" /> Save testimony</button>
              </form>
            )}
            {owner(current) && (
              <button type="button" className="fh-del" onClick={() => setToDelete(current)}><Trash2 size={15} aria-hidden="true" /> Delete this prayer</button>
            )}
          </article>
        </div></div>,
        document.body
      )}

      {composer && createPortal(
        <div className="pw pw-layer fh"><Composer initial={initialPrayer} onClose={() => setComposer(false)} onDone={(id) => { setComposer(false); setFreshId(id || null); load(); setTimeout(() => setFreshId(null), 2500) }} toast={toast} /></div>,
        document.body
      )}

      {toDelete && (
        <ConfirmDialog title="Delete this prayer?" message={`"${toDelete.title}" will be removed for everyone.`} confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setToDelete(null)} />
      )}
    </div>
  )
}

/* Composer: a blank note you write on. Colour follows the category. */
function Composer({ initial, onClose, onDone, toast }) {
  const [form, setForm] = useState(() => {
    let d = {}
    try { d = JSON.parse(localStorage.getItem('lgy_prayer_draft') || '{}') } catch { d = {} }
    return { title: initial?.title || d.title || '', body: initial?.body || d.body || '', visibility: 'public', anonymous: false, category: d.category || 'personal' }
  })
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
  useEffect(() => {
    try { (form.title || form.body) ? localStorage.setItem('lgy_prayer_draft', JSON.stringify({ title: form.title, body: form.body, category: form.category })) : localStorage.removeItem('lgy_prayer_draft') } catch { /* private mode */ }
  }, [form.title, form.body, form.category])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setErr('Give your prayer a short title.')
    if (!form.body.trim()) return setErr('Write what we can pray about.')
    setErr('')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('body', form.body.trim())
      fd.append('visibility', form.visibility)
      fd.append('category', form.category)
      fd.append('is_anonymous', form.anonymous ? '1' : '0')
      if (photo) fd.append('image', photo)
      const res = await apiRequest('/api/prayer/submit', { method: 'POST', body: fd })
      try { localStorage.removeItem('lgy_prayer_draft') } catch { /* ignore */ }
      toast(res.message || 'Your prayer is on the wall.')
      onDone(res.id)
    } catch (e2) {
      toast(e2.message || 'Failed to post prayer request.', 'bad')
      setBusy(false)
    }
  }

  return (
    <div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`pw-big fh-big is-compose c-${form.category}`} onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-label="Pin a prayer">
        <i className="fh-pin" aria-hidden="true" />
        <button type="button" className="pw-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <small className="pw-kicker">New prayer</small>
        <div className="fh-cats is-form" role="radiogroup" aria-label="Category">
          {CATS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" role="radio" aria-checked={form.category === key} className={`c-${key}${form.category === key ? ' is-on' : ''}`} onClick={() => setForm((f) => ({ ...f, category: key }))}><Icon size={14} aria-hidden="true" />{label}</button>
          ))}
        </div>
        <input className="pw-in pw-in-title" value={form.title} onChange={set('title')} placeholder="Short title, e.g. Healing for Mama" maxLength={80} autoFocus aria-label="Title" />
        <textarea className="pw-in pw-in-body" value={form.body} onChange={set('body')} placeholder="Share what we can pray about" rows={5} maxLength={600} aria-label="Details" />
        <div className="pw-attach">
          {preview ? (
            <div className="pw-attach-prev">
              <img src={preview} alt="Selected photo preview" />
              <button type="button" onClick={() => { setPhoto(null); setPreview('') }} aria-label="Remove photo"><X size={15} /></button>
            </div>
          ) : (
            <label className="pw-attach-btn"><ImagePlus size={16} aria-hidden="true" /> Add a photo <small>optional</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />
            </label>
          )}
        </div>
        {err && <p className="pw-err" role="alert">{err}</p>}
        <div className="fh-privacy">
          <div className="fh-seg is-mini" role="radiogroup" aria-label="Who can see this?">
            <button type="button" role="radio" aria-checked={form.visibility === 'public'} className={form.visibility === 'public' ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, visibility: 'public' }))}><Users size={15} aria-hidden="true" /> Everyone</button>
            <button type="button" role="radio" aria-checked={form.visibility === 'private'} className={form.visibility === 'private' ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, visibility: 'private' }))}><Lock size={14} aria-hidden="true" /> Leaders only</button>
          </div>
          <label className="fh-check"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))} /> <span><EyeOff size={14} aria-hidden="true" /> Post anonymously <small>your name stays hidden</small></span></label>
        </div>
        <button type="submit" className="fh-btn is-primary fh-send" disabled={busy}>
          {busy ? 'Pinning…' : <><Send size={16} aria-hidden="true" /> Pin it to the wall</>}
        </button>
      </form>
    </div>
  )
}
