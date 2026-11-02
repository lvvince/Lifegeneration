import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { HandHeart, Heart, ImagePlus, MessageCircle, PenLine, Search, Send, Sparkles, Trash2, X, Clock, EyeOff } from 'lucide-react'
import { apiGet, apiPost, apiRequest, API_URL, getUser } from '../api.js'
import { ConfirmDialog, useToast } from '../components/portal/ui.jsx'
import Garland from '../components/faith/Garland.jsx'
import FaithTabs from '../components/faith/FaithTabs.jsx'
import '../styles/prayer.css'
import '../styles/faith.css'
import '../styles/godtoday.css'

const TONES = ['sage', 'cream', 'blue', 'butter', 'blush']
const photoUrl = (p) => (/^(https?:|data:|blob:)/.test(String(p)) ? p : p ? `${API_URL}/${String(p).replace(/^\/+/, '')}` : '')
const parse = (d) => new Date(String(d).replace(' ', 'T'))
const when = (d) => parse(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const MAX = 400
const DRAFT = 'lgy_god_today_draft'
const PROMPTS = [
  'Name one small thing today that reminded you God is near.',
  'Who did God use to encourage you this week?',
  'What answered prayer are you thankful for right now?',
  'Where did you feel peace today when you did not expect it?',
  'What did you see, hear or read that pointed you to Jesus?',
  'What is one way God provided for you recently?',
  'Where did you notice His goodness in an ordinary moment?',
]
const draftGet = () => { try { return localStorage.getItem(DRAFT) || '' } catch { return '' } }
const draftSet = (v) => { try { v ? localStorage.setItem(DRAFT, v) : localStorage.removeItem(DRAFT) } catch { /* private mode */ } }
// stable pseudo-random tilt per note so the board doesn't reshuffle on every render
const tilt = (id) => ((Number(id) * 37) % 70) / 10 - 3.5
const tone = (id) => TONES[Number(id) % TONES.length]

export default function GodToday() {
  const user = getUser()
  const toast = useToast()
  const [posts, setPosts] = useState(null)
  const [sort, setSort] = useState('recent')
  const [compose, setCompose] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [freshId, setFreshId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async (s = sort) => {
    try {
      const r = await apiGet(`/api/sightings?sort=${s}`)
      setPosts(Array.isArray(r) ? r : r.posts || r.data || [])
      setErr('')
    } catch (e) {
      setErr(e.message || 'Could not load the wall.')
      setPosts((p) => p || [])
    }
  }, [sort])

  useEffect(() => { load(sort) }, [sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = useMemo(() => posts?.find((p) => p.id === openId) || null, [posts, openId])
  const canDelete = (p) => user && (p.is_mine || user.role === 'admin' || user.role === 'officer')

  async function amen(p) {
    if (!user) return toast('Sign in to say Amen.', 'bad')
    const on = !p.i_amen
    setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, i_amen: on, amens: Math.max(0, x.amens + (on ? 1 : -1)) } : x)))
    try {
      const r = await apiPost('/api/sightings/react', { id: p.id })
      setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, i_amen: !!r.on, amens: r.count ?? x.amens } : x)))
    } catch (e) {
      setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, i_amen: p.i_amen, amens: p.amens } : x)))
      toast(e.message || 'Could not save that.', 'bad')
    }
  }

  async function remove() {
    const p = toDelete
    setToDelete(null)
    try {
      await apiPost('/api/sightings/delete', { id: p.id })
      setPosts((l) => l.filter((x) => x.id !== p.id))
      setOpenId(null)
      toast('Note taken down.')
    } catch (e) {
      toast(e.message || 'Could not delete.', 'bad')
    }
  }

  const bump = (id, n) => setPosts((l) => l.map((x) => (x.id === id ? { ...x, comments: (x.comments || 0) + n } : x)))
  const prompt = PROMPTS[Math.floor(Date.now() / 864e5) % PROMPTS.length]
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!posts || !t) return posts
    return posts.filter((p) => `${p.body} ${p.author_name}`.toLowerCase().includes(t))
  }, [posts, q])
  const total = posts?.length || 0
  const totalAmens = (posts || []).reduce((n, p) => n + (p.amens || 0), 0)

  return (
    <div className="pw fh gt">
      <header className="fh-hero">
        <Garland />
        <FaithTabs />
        <div className="fh-hero-grid">
          <div className="fh-hero-main">
            <span className="fh-kicker">Take a moment to remember</span>
            <h1 className="fh-title gt-title">Where have you seen God today?</h1>
            <p className="fh-verse">“Every good and perfect gift is from above.” <cite>James 1:17</cite></p>
            <ul className="fh-stats" aria-label="Board summary">
              <li><b>{total}</b> {total === 1 ? 'note' : 'notes'}</li>
              <li><b>{totalAmens}</b> amens</li>
            </ul>
            <div className="fh-cta">
              {user ? (
                <button type="button" className="fh-btn is-primary" onClick={() => setCompose(true)}><PenLine size={17} aria-hidden="true" /> Write a note</button>
              ) : (
                <Link to="/login" className="fh-btn is-primary"><PenLine size={17} aria-hidden="true" /> Sign in to write</Link>
              )}
              <Link to="/prayer" className="fh-btn"><HandHeart size={17} aria-hidden="true" /> Prayer Wall</Link>
            </div>
          </div>
          <figure className="fh-vod gt-prompt">
            <i className="fh-pin" aria-hidden="true" />
            <figcaption><Sparkles size={14} aria-hidden="true" /> Today&apos;s prompt</figcaption>
            <blockquote>{prompt}</blockquote>
          </figure>
        </div>
      </header>

      <div className="fh-tools">
        <label className="fh-search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes or names" aria-label="Search notes" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search"><X size={16} /></button>}
        </label>
        <div className="fh-seg gt-sort" role="radiogroup" aria-label="Sort notes">
          <button type="button" role="radio" aria-checked={sort === 'recent'} className={sort === 'recent' ? 'is-on' : ''} onClick={() => setSort('recent')}><Clock size={15} aria-hidden="true" /> Recent</button>
          <button type="button" role="radio" aria-checked={sort === 'top'} className={sort === 'top' ? 'is-on' : ''} onClick={() => setSort('top')}><Heart size={15} aria-hidden="true" /> Most appreciated</button>
        </div>
      </div>

      <section className="fh-board gt-board" aria-label="Gratitude board">
        {err && <p className="pw-err" role="alert">{err}</p>}
        {posts === null && (
          <div className="gt-wall" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="gt-note is-skel" />)}</div>
        )}
        {posts && posts.length === 0 && !err && (
          <div className="fh-empty">
            <div className="gt-note t-cream is-blank" style={{ '--r': '-2deg' }}>
              <i className="fh-pin" aria-hidden="true" />
              <p className="gt-text">Nothing here yet. Be the first to share where you saw God today.</p>
              {user && <button type="button" className="fh-btn is-primary" onClick={() => setCompose(true)}><PenLine size={16} aria-hidden="true" /> Write a note</button>}
            </div>
          </div>
        )}
        {shown && shown.length === 0 && posts?.length > 0 && <p className="gt-none">No notes match “{q}”.</p>}
        {shown && shown.length > 0 && (
          <ul className="gt-wall">
            {shown.map((p, i) => (
              <li key={p.id} className={`gt-note t-${tone(p.id)}${p.image ? ' has-img' : ''}${freshId === p.id ? ' is-new' : ''}`} style={{ '--r': `${tilt(p.id)}deg`, '--i': Math.min(i, 12) }}>
                <i className="fh-pin" aria-hidden="true" />
                <button type="button" className="fh-open" onClick={() => setOpenId(p.id)} aria-label={`Open note by ${p.author_name}`} />
                {p.image && <img className="gt-photo" src={photoUrl(p.image)} alt="" loading="lazy" decoding="async" />}
                <p className="gt-text">{p.body}</p>
                <footer>
                  <span className="fh-by"><b>{p.author_name}</b><time dateTime={p.created_at}>{when(p.created_at)}</time></span>
                  <span className="gt-acts">
                    <button type="button" className={`fh-pray gt-amen${p.i_amen ? ' is-on' : ''}`} aria-pressed={!!p.i_amen} onClick={() => amen(p)} aria-label={`Amen, ${p.amens} so far`}><Heart size={16} aria-hidden="true" fill={p.i_amen ? 'currentColor' : 'none'} /> <b>{p.amens}</b></button>
                    <span className="gt-cm" aria-label={`${p.comments || 0} comments`}><MessageCircle size={15} aria-hidden="true" /> {p.comments || 0}</span>
                  </span>
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>

      {current && createPortal(
        <div className="pw pw-layer fh"><Reader post={current} user={user} onClose={() => setOpenId(null)} onAmen={() => amen(current)} onDelete={canDelete(current) ? () => setToDelete(current) : null} onBump={(n) => bump(current.id, n)} toast={toast} /></div>,
        document.body,
      )}
      {compose && createPortal(
        <div className="pw pw-layer fh"><Composer onClose={() => setCompose(false)} toast={toast} onDone={async (id) => {
          setCompose(false)
          setSort('recent')
          await load('recent')
          setFreshId(id)
          setTimeout(() => setFreshId(null), 2600)
          window.scrollTo({ top: (document.querySelector('.gt-board')?.getBoundingClientRect().top || 0) + window.scrollY - 90, behavior: 'smooth' })
        }} /></div>,
        document.body,
      )}
      {toDelete && <ConfirmDialog title="Take down this note?" message="It will be removed from the board for everyone." confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setToDelete(null)} />}
    </div>
  )
}

function Reader({ post, user, onClose, onAmen, onDelete, onBump, toast }) {
  const [list, setList] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)

  useEffect(() => {
    let alive = true
    apiGet(`/api/sightings/${post.id}/comments`).then((r) => alive && setList(Array.isArray(r) ? r : r.comments || r.data || [])).catch(() => alive && setList([]))
    return () => { alive = false }
  }, [post.id])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      const r = await apiPost('/api/sightings/comment', { id: post.id, body })
      const c = r.comment || { id: Date.now(), author_name: user?.full_name || user?.name || user?.username || 'You', body, created_at: new Date().toISOString() }
      setList((l) => [...(l || []), c])
      onBump(1)
      setText('')
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 40)
    } catch (e2) {
      toast(e2.message || 'Could not send.', 'bad')
    }
    setBusy(false)
  }

  return (
    <div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <article className={`fh-big gt-read t-${tone(post.id)}`} role="dialog" aria-modal="true" aria-label={`Note by ${post.author_name}`}>
        <i className="fh-pin" aria-hidden="true" />
        <button type="button" className="pw-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {post.image && <img className="gt-photo is-big" src={photoUrl(post.image)} alt="Photo shared with this note" decoding="async" />}
        <p className="gt-big-text">{post.body}</p>
        <footer><span>{post.author_name}</span><time dateTime={post.created_at}>{when(post.created_at)}</time></footer>
        <div className="fh-pray-row">
          <button type="button" className={`fh-btn fh-pray-big${post.i_amen ? ' is-primary is-on' : ''}`} aria-pressed={!!post.i_amen} onClick={onAmen}><Heart size={17} aria-hidden="true" fill={post.i_amen ? 'currentColor' : 'none'} /> {post.i_amen ? 'Amen!' : 'Amen'}</button>
          <span className="fh-count"><b>{post.amens}</b> {post.amens === 1 ? 'person is' : 'people are'} thankful too</span>
        </div>
        <section className="gt-cms" aria-label="Encouragements">
          <h3><MessageCircle size={16} aria-hidden="true" /> Encouragements</h3>
          {list === null && <p className="gt-muted">Loading…</p>}
          {list && list.length === 0 && <p className="gt-muted">No replies yet. Leave a kind word.</p>}
          {list && list.length > 0 && (
            <ul>{list.map((c) => <li key={c.id}><b>{c.author_name}</b><span>{c.body}</span><time dateTime={c.created_at}>{when(c.created_at)}</time></li>)}<li ref={end} aria-hidden="true" className="gt-end" /></ul>
          )}
          {user ? (
            <form className="gt-cf" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Encourage them…" aria-label="Write an encouragement" />
              <button type="submit" className="fh-btn is-primary" disabled={busy || !text.trim()} aria-label="Send"><Send size={16} aria-hidden="true" /></button>
            </form>
          ) : <p className="gt-muted"><Link to="/login">Sign in</Link> to leave an encouragement.</p>}
        </section>
        {onDelete && <button type="button" className="fh-del" onClick={onDelete}><Trash2 size={15} aria-hidden="true" /> Take this note down</button>}
      </article>
    </div>
  )
}

function Composer({ onClose, onDone, toast }) {
  const [body, setBody] = useState(draftGet)
  const [anon, setAnon] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  useEffect(() => draftSet(body), [body])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErr('Please attach a JPG, PNG or WEBP photo.')
    if (f.size > 8 * 1024 * 1024) return setErr('That photo is over 8 MB. Please choose a smaller one.')
    setErr('')
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return setErr('Write a few words about what you saw.')
    setErr('')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('body', body.trim())
      fd.append('anonymous', anon ? '1' : '0')
      if (photo) fd.append('image', photo)
      const res = await apiRequest('/api/sightings/submit', { method: 'POST', body: fd })
      draftSet('')
      toast(res.message || 'Pinned to the board.')
      onDone(res.id)
    } catch (e2) {
      toast(e2.message || 'Could not post.', 'bad')
      setBusy(false)
    }
  }

  return (
    <div className="pw-over" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="fh-big gt-compose t-butter" onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-label="Write a note">
        <i className="fh-pin" aria-hidden="true" />
        <button type="button" className="pw-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <small className="pw-kicker"><Sparkles size={13} aria-hidden="true" /> Where have you seen God today?</small>
        <textarea className="gt-ta" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e) }} maxLength={MAX} rows={5} placeholder="I saw God when…" aria-label="Your note" autoFocus />
        <span className="gt-left" aria-live="polite">{body.length}/{MAX}</span>
        <div className="pw-attach">
          {preview ? (
            <div className="pw-attach-prev"><img src={preview} alt="Selected photo preview" /><button type="button" onClick={() => { setPhoto(null); setPreview('') }} aria-label="Remove photo"><X size={15} /></button></div>
          ) : (
            <label className="pw-attach-btn"><ImagePlus size={16} aria-hidden="true" /> Add a photo <small>optional</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />
            </label>
          )}
        </div>
        {err && <p className="pw-err" role="alert">{err}</p>}
        <label className="fh-check"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> <span><EyeOff size={14} aria-hidden="true" /> Post anonymously <small>your name stays hidden</small></span></label>
        <button type="submit" className="fh-btn is-primary fh-send" disabled={busy}>{busy ? 'Pinning…' : <><Send size={16} aria-hidden="true" /> Pin it to the board</>}</button>
      </form>
    </div>
  )
}
