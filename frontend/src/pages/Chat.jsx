import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Hash, Megaphone, Users, Lock, Send, ImagePlus, Reply, Pencil, Trash2, Pin, PinOff, Search, X,
  Heart, HandHeart, ThumbsUp, Flame, SmilePlus, ChevronLeft, ArrowDown, Check, Activity, ShieldCheck,
  VolumeX, Volume2, Network, HeartHandshake, AtSign, Trophy, CircleAlert, Clock, BellRing,
  Video, CalendarPlus, CalendarDays, ExternalLink, UserCheck, Plus, Link2, Copy, BookOpen,
} from 'lucide-react'
import { apiGet, apiPost, apiRequest, getUser } from '../api.js'
import { initials, resolveImageUrl } from '../lib/format.js'
import { useToast } from '../components/portal/ui.jsx'
import '../styles/chat.css'

const REACTIONS = [
  { key: 'heart', label: 'Heart', Icon: Heart },
  { key: 'pray', label: 'Praying', Icon: HandHeart },
  { key: 'thumbs_up', label: 'Agree', Icon: ThumbsUp },
  { key: 'praise', label: 'Praise', Icon: Flame },
]
const MUTES = [[15, '15 minutes'], [60, '1 hour'], [1440, '1 day'], [10080, '7 days']]
const POLL_MS = 5000

/* ---------- small helpers ---------- */
const parse = (d) => new Date(String(d).replace(' ', 'T'))
const hhmm = (d) => parse(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
const dayKey = (d) => parse(d).toDateString()
function dayLabel(d) {
  const t = parse(d)
  const today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  if (t.toDateString() === today.toDateString()) return 'Today'
  if (t.toDateString() === y.toDateString()) return 'Yesterday'
  return t.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
}
function ago(d) {
  if (!d) return 'a while ago'
  const s = Math.max(0, (Date.now() - parse(d).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
const roleName = (r) => ({ admin: 'Admin', officer: 'Officer', secretary: 'Secretary', moderator: 'Moderator' }[r] || null)
const LEVEL = { active: 'Active', casual: 'Casual', quiet: 'Quiet' }

function Avatar({ name, src, size = 36, online }) {
  return (
    <span className="fc-av" style={{ '--s': `${size}px` }} aria-hidden="true">
      {src ? <img src={resolveImageUrl(src)} alt="" draggable="false" loading="lazy" /> : <b>{initials(name)}</b>}
      {online !== undefined && <i className={online ? 'is-on' : ''} />}
    </span>
  )
}

/* text -> links and @mentions (React escapes everything, nothing is injected as HTML) */
function RichText({ text, mentions = [] }) {
  const names = mentions.map((m) => m.name).filter(Boolean)
  const parts = []
  const re = new RegExp(`(https?:\\/\\/[^\\s<]+)${names.length ? `|(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))` : ''}`, 'g')
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) parts.push(<a key={m.index} href={m[1]} target="_blank" rel="noopener noreferrer nofollow">{m[1]}</a>)
    else parts.push(<mark key={m.index} className="fc-mention">{m[2]}</mark>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

/* ====================================================================== */
export default function Chat() {
  const user = getUser()
  const toast = useToast()

  const [boot, setBoot] = useState(null)
  const [bootErr, setBootErr] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [view, setView] = useState('list') // phone: 'list' | 'room'
  const [messages, setMessages] = useState([])
  const [pinned, setPinned] = useState([])
  const [lastRead, setLastRead] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [side, setSide] = useState(null) // 'members' | 'activity' | null
  const [showPins, setShowPins] = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [profileId, setProfileId] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [picked, setPicked] = useState(null) // message whose toolbar is open (touch)
  const [pendingNew, setPendingNew] = useState(0)
  const [members, setMembers] = useState([])
  const [draft, setDraft] = useState({ text: '', title: '', announce: false, important: false, mentions: [], image: null, preview: '', reply: null, edit: null })
  const [sending, setSending] = useState(false)
  const [joinDismissed, setJoinDismissed] = useState([])
  const [sessions, setSessions] = useState({ upcoming: [], past: [] })

  const list = useRef(null)
  const stick = useRef(true)
  const activeRef = useRef(null)
  const msgsRef = useRef([])
  const area = useRef(null)
  msgsRef.current = messages
  activeRef.current = activeId

  const channels = boot?.channels || []
  const me = boot?.me
  const channel = channels.find((c) => c.id === activeId)

  /* ---------- load channels ---------- */
  const loadBoot = useCallback(async () => {
    try {
      const b = await apiGet('/api/chat/bootstrap')
      setBoot(b)
      setBootErr('')
      return b
    } catch (e) {
      setBootErr(e.message || 'Could not open the chat.')
      return null
    }
  }, [])

  const loadSessions = useCallback(() => apiGet('/api/chat/sessions').then((d) => setSessions({ upcoming: d.upcoming || [], past: d.past || [] })).catch(() => {}), [])

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('google')
    if (!g) return
    toast(g === 'connected' ? 'Google connected. Meet links are now created automatically.' : 'Google connection failed. Please try again.', g === 'connected' ? undefined : 'bad')
    window.history.replaceState({}, '', window.location.pathname)
    if (g === 'connected') setSide('sessions')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return undefined
    loadBoot().then((b) => {
      if (b && window.matchMedia('(min-width: 768px)').matches) setActiveId((id) => id || (b.channels.find((c) => c.kind === 'general') || b.channels[0])?.id || null)
    })
    apiGet('/api/chat/members').then((m) => setMembers(Array.isArray(m) ? m : [])).catch(() => {})
    loadSessions()
    const t = setInterval(() => { if (document.visibilityState === 'visible') { loadBoot(); loadSessions() } }, 15000)
    return () => clearInterval(t)
  }, [loadBoot]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- load the room ---------- */
  const scrollDown = useCallback((smooth) => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    if (!activeId) return undefined
    let alive = true
    setLoading(true)
    setMessages([]); setPinned([]); setResults(null); setQ(''); setSearching(false); setShowPins(false); setPendingNew(0)
    setDraft((d) => ({ ...d, reply: null, edit: null }))
    apiGet(`/api/chat/channels/${activeId}/messages`)
      .then((r) => {
        if (!alive) return
        setMessages(r.messages || [])
        setPinned(r.pinned || [])
        setLastRead(r.last_read || 0)
        setHasMore(!!r.has_more)
        stick.current = true
        requestAnimationFrame(() => scrollDown(false))
      })
      .catch((e) => alive && toast(e.message || 'Could not load messages.', 'bad'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- live sync: new messages, edits, reactions, deletions ---------- */
  const sync = useCallback(async () => {
    const id = activeRef.current
    if (!id) return
    try {
      const r = await apiGet(`/api/chat/channels/${id}/messages`)
      if (id !== activeRef.current) return
      const fresh = r.messages || []
      setMessages((old) => {
        const first = fresh[0]?.id ?? Infinity
        const keep = old.filter((m) => m.id < first)
        const next = [...keep, ...fresh]
        const added = next.filter((m) => !old.some((o) => o.id === m.id) && m.user_id !== me?.id).length
        if (added && !stick.current) setPendingNew((n) => n + added)
        return next
      })
      setPinned(r.pinned || [])
    } catch { /* offline: try again next tick */ }
  }, [me?.id])

  useEffect(() => {
    if (!activeId) return undefined
    const t = setInterval(() => document.visibilityState === 'visible' && !results && sync(), POLL_MS)
    const vis = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [activeId, results, sync])

  useEffect(() => { if (stick.current) requestAnimationFrame(() => scrollDown(false)) }, [messages, scrollDown])

  /* mark as read once the newest message is on screen */
  useEffect(() => {
    if (!activeId || !messages.length || !me?.can_post && me?.reason === 'no_profile') return
    const lastId = messages[messages.length - 1].id
    const t = setTimeout(() => {
      if (document.visibilityState !== 'visible' || !stick.current) return
      apiPost(`/api/chat/channels/${activeId}/read`, { last_id: lastId }).catch(() => {})
      setBoot((b) => b && { ...b, channels: b.channels.map((c) => (c.id === activeId ? { ...c, unread: 0, mentions: 0 } : c)) })
    }, 600)
    return () => clearTimeout(t)
  }, [messages, activeId, pendingNew]) // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = list.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stick.current = near
    if (near && pendingNew) setPendingNew(0)
  }

  async function loadOlder() {
    const firstId = messages[0]?.id
    if (!firstId) return
    const el = list.current
    const prevH = el.scrollHeight
    try {
      const r = await apiGet(`/api/chat/channels/${activeId}/messages?before=${firstId}`)
      setMessages((old) => [...(r.messages || []), ...old])
      setHasMore(!!r.has_more)
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevH })
    } catch (e) { toast(e.message, 'bad') }
  }

  /* ---------- search ---------- */
  useEffect(() => {
    if (!searching || q.trim().length < 2) { setResults(null); return undefined }
    const t = setTimeout(() => {
      apiGet(`/api/chat/channels/${activeId}/messages?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setResults(r.messages || []))
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [q, searching, activeId])

  /* ---------- composer ---------- */
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const canPost = me?.can_post
  const readonlyForMe = channel?.readonly && !me?.staff
  const mentionQuery = useMemo(() => {
    const m = /(?:^|\s)@([\p{L}.' -]{0,30})$/u.exec(draft.text)
    return m ? m[1].toLowerCase() : null
  }, [draft.text])
  const suggestions = useMemo(() => {
    if (mentionQuery === null) return []
    return members.filter((m) => m.id !== me?.id && m.name.toLowerCase().includes(mentionQuery.trim())).slice(0, 6)
  }, [mentionQuery, members, me?.id])

  function pickMention(m) {
    const text = draft.text.replace(/@([\p{L}.' -]{0,30})$/u, `@${m.name} `)
    set({ text, mentions: draft.mentions.some((x) => x.id === m.id) ? draft.mentions : [...draft.mentions, { id: m.id, name: m.name }] })
    area.current?.focus()
  }
  function mention(m) {
    setProfileId(null)
    set({ text: `${draft.text}${draft.text && !/\s$/.test(draft.text) ? ' ' : ''}@${m.name} `, mentions: [...draft.mentions, { id: m.id, name: m.name }] })
    setView('room')
    setTimeout(() => area.current?.focus(), 50)
  }
  function chooseImage(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return toast('Please attach a JPG, PNG, WEBP or GIF photo.', 'bad')
    if (f.size > 8 * 1024 * 1024) return toast('That photo is over 8 MB.', 'bad')
    if (draft.preview) URL.revokeObjectURL(draft.preview)
    set({ image: f, preview: URL.createObjectURL(f) })
  }
  const clearImage = () => { if (draft.preview) URL.revokeObjectURL(draft.preview); set({ image: null, preview: '' }) }
  const resetDraft = () => setDraft((d) => ({ text: '', title: '', announce: d.announce && !!channel?.readonly, important: false, mentions: [], image: null, preview: '', reply: null, edit: null }))

  async function send(e) {
    e?.preventDefault()
    if (sending || !canPost) return
    const text = draft.text.trim()
    const announce = channel?.readonly || draft.announce
    if (draft.edit) {
      if (!text) return
      setSending(true)
      try {
        await apiPost(`/api/chat/messages/${draft.edit.id}/edit`, { body: text })
        resetDraft(); sync()
      } catch (err) { toast(err.message, 'bad') } finally { setSending(false) }
      return
    }
    if (!text && !draft.image) return
    if (announce && !draft.title.trim()) return toast('Give the announcement a short title.', 'bad')
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('body', text)
      fd.append('kind', announce ? 'announcement' : 'message')
      if (announce) { fd.append('title', draft.title.trim()); fd.append('important', draft.important ? '1' : '0') }
      if (draft.reply) fd.append('reply_to', draft.reply.id)
      if (draft.image) fd.append('image', draft.image)
      fd.append('mentions', JSON.stringify(draft.mentions.filter((m) => text.includes(`@${m.name}`)).map((m) => m.id)))
      const r = await apiRequest(`/api/chat/channels/${activeId}/messages`, { method: 'POST', body: fd })
      stick.current = true
      setMessages((old) => (old.some((m) => m.id === r.message.id) ? old : [...old, r.message]))
      resetDraft()
      requestAnimationFrame(() => scrollDown(true))
    } catch (err) {
      toast(err.message || 'Could not send.', 'bad')
    } finally { setSending(false) }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
    if (e.key === 'Escape') { set({ reply: null, edit: null, text: draft.edit ? '' : draft.text }) }
  }
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }, [draft.text, activeId])

  /* ---------- message actions ---------- */
  const patch = (id, fn) => setMessages((old) => old.map((m) => (m.id === id ? fn(m) : m)))
  async function react(m, key) {
    if (!canPost) return toast(me?.reason === 'muted' ? 'You are muted right now.' : 'Sign in with a member account to react.', 'bad')
    patch(m.id, (x) => {
      const cur = x.reactions[key] || { n: 0, mine: false }
      const next = { n: Math.max(0, cur.n + (cur.mine ? -1 : 1)), mine: !cur.mine }
      const r = { ...x.reactions }
      if (next.n) r[key] = next; else delete r[key]
      return { ...x, reactions: r }
    })
    setPicked(null)
    try { await apiPost(`/api/chat/messages/${m.id}/react`, { reaction: key }) } catch (e) { toast(e.message, 'bad'); sync() }
  }
  async function pin(m) {
    try { const r = await apiPost(`/api/chat/messages/${m.id}/pin`); toast(r.pinned ? 'Pinned.' : 'Unpinned.'); setPicked(null); sync() } catch (e) { toast(e.message, 'bad') }
  }
  async function remove(m) {
    if (!window.confirm('Delete this message?')) return
    try { await apiPost(`/api/chat/messages/${m.id}/delete`); setPicked(null); sync() } catch (e) { toast(e.message, 'bad') }
  }
  async function ack(m) {
    patch(m.id, (x) => ({ ...x, acks: { n: x.acks.n + 1, mine: true } }))
    try { await apiPost(`/api/chat/messages/${m.id}/ack`) } catch (e) { toast(e.message, 'bad'); sync() }
  }
  function startEdit(m) { setPicked(null); set({ edit: m, reply: null, text: m.body }); setTimeout(() => area.current?.focus(), 30) }
  function startReply(m) { setPicked(null); set({ reply: m, edit: null }); setTimeout(() => area.current?.focus(), 30) }
  function jump(id) {
    const el = list.current?.querySelector(`[data-mid="${id}"]`)
    if (!el) return toast('That message is further up. Scroll up to load it.')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('is-flash')
    setTimeout(() => el.classList.remove('is-flash'), 1400)
  }

  const openRoom = (id) => { setActiveId(id); setView('room'); setSide(null) }

  /* ---------- guard rails ---------- */
  if (!user) {
    return (
      <div className="fc-gate">
        <Hash size={28} aria-hidden="true" />
        <h1>Fellowship Chat</h1>
        <p>Sign in to chat with the youth, officers and admins of Life Generation.</p>
        <Link to="/login" className="fc-btn">Sign in</Link>
      </div>
    )
  }
  if (bootErr && !boot) {
    return (
      <div className="fc-gate">
        <CircleAlert size={28} aria-hidden="true" />
        <h1>The chat is not available</h1>
        <p>{bootErr}</p>
        <button type="button" className="fc-btn" onClick={loadBoot}>Try again</button>
      </div>
    )
  }

  const shown = results || messages
  const groups = []
  let prevDay = ''
  let dividerDone = false
  shown.forEach((m, i) => {
    const k = dayKey(m.created_at)
    if (k !== prevDay) { groups.push({ type: 'day', key: `d${m.id}`, label: dayLabel(m.created_at) }); prevDay = k }
    if (!results && !dividerDone && lastRead && m.id > lastRead && m.user_id !== me?.id) {
      groups.push({ type: 'new', key: 'new' }); dividerDone = true
    }
    const prev = shown[i - 1]
    const joined = prev && !groups[groups.length - 1].type && prev.user_id === m.user_id && prev.kind === 'message' && m.kind === 'message' && !m.reply && (parse(m.created_at) - parse(prev.created_at)) < 5 * 60000 && dayKey(prev.created_at) === k
    groups.push({ type: 'msg', key: m.id, m, joined })
  })

  const unreadTotal = channels.reduce((n, c) => n + (c.id === activeId ? 0 : c.unread), 0)
  const online = members.filter((m) => m.online)
  const soon = sessions.upcoming.filter((x) => x.live || x.can_join)
  const liveCount = soon.filter((x) => x.live).length
  const nextLive = soon[0] || null

  return (
    <div className={`fc fc-view-${view}${side ? ' has-side' : ''}`} onClick={() => picked && setPicked(null)}>
      {/* ---------- channels ---------- */}
      <aside className="fc-rooms" aria-label="Chat rooms">
        <header className="fc-rooms-head">
          <h1>Fellowship</h1>
          <span className="fc-online" title={`${online.length} ${online.length === 1 ? 'person is' : 'people are'} online right now`}><i aria-hidden="true" />{online.length} online</span>
        </header>
        <div className="fc-nav" role="navigation" aria-label="Rooms">
          {[
            ['Announcements', (c) => c.kind === 'announcement'],
            ['Rooms', (c) => c.kind === 'general'],
            ['My groups', (c) => c.kind === 'dgroup' || c.kind === 'ministry'],
            ['Staff', (c) => c.kind === 'staff'],
          ].map(([label, test]) => {
            const items = channels.filter(test)
            if (!items.length) return null
            return (
              <div className="fc-sec" key={label}>
                <small>{label}</small>
                {items.map((c) => {
                  const Icon = c.kind === 'announcement' ? Megaphone : c.kind === 'dgroup' ? Network : c.kind === 'ministry' ? HeartHandshake : c.kind === 'staff' ? Lock : Hash
                  return (
                    <button key={c.id} type="button" className={`fc-room${c.id === activeId ? ' is-on' : ''}${c.unread && c.id !== activeId ? ' has-new' : ''}`} onClick={() => openRoom(c.id)} aria-current={c.id === activeId ? 'true' : undefined}>
                      <Icon size={17} strokeWidth={2} aria-hidden="true" />
                      <span>{c.name}</span>
                      {c.id !== activeId && c.mentions > 0 && <i className="fc-pill is-hot" aria-label={`${c.mentions} mentions`}>@{c.mentions}</i>}
                      {c.id !== activeId && !c.mentions && c.unread > 0 && <i className="fc-pill">{c.unread > 99 ? '99+' : c.unread}</i>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="fc-rooms-foot">
          <button type="button" className="fc-link" onClick={() => { if (!activeId && channels[0]) setActiveId(channels[0].id); setView('room'); setSide('activity') }}>
            <Trophy size={16} aria-hidden="true" /> Who is active
          </button>
        </div>
      </aside>

      {/* ---------- conversation ---------- */}
      <section className="fc-main" aria-label={channel ? `#${channel.name}` : 'Conversation'}>
        {!channel ? (
          <div className="fc-empty"><Hash size={30} aria-hidden="true" /><b>Pick a room</b><p>Choose a room on the left to start.</p></div>
        ) : (
          <>
            <header className="fc-bar">
              <button type="button" className="fc-iconbtn fc-back" onClick={() => setView('list')} aria-label="Back to rooms">
                <ChevronLeft size={20} />
                {unreadTotal > 0 && <i className="fc-pill">{unreadTotal > 9 ? '9+' : unreadTotal}</i>}
              </button>
              <div className="fc-bar-t">
                <h2>{channel.kind === 'announcement' ? <Megaphone size={17} aria-hidden="true" /> : channel.staff_only ? <Lock size={16} aria-hidden="true" /> : <Hash size={17} aria-hidden="true" />}{channel.name}</h2>
                <p>{channel.description}</p>
              </div>
              <div className="fc-bar-a">
                <button type="button" className={`fc-iconbtn${searching ? ' is-on' : ''}`} onClick={() => { setSearching((s) => !s); setQ('') }} aria-label="Search this room" aria-pressed={searching}><Search size={18} /></button>
                <button type="button" className={`fc-iconbtn${showPins ? ' is-on' : ''}`} onClick={() => setShowPins((s) => !s)} aria-label={`Pinned messages (${pinned.length})`} aria-pressed={showPins}>
                  <Pin size={18} />{pinned.length > 0 && <i className="fc-pill">{pinned.length}</i>}
                </button>
                <button type="button" className={`fc-iconbtn${side === 'sessions' ? ' is-on' : ''}`} onClick={() => setSide(side === 'sessions' ? null : 'sessions')} aria-label={`Online sessions${nextLive ? ' (live now)' : ''}`} aria-pressed={side === 'sessions'}>
                  <Video size={18} />{liveCount > 0 && <i className="fc-livedot" aria-hidden="true" />}
                </button>
                <button type="button" className={`fc-iconbtn${side === 'members' || side === 'activity' ? ' is-on' : ''}`} onClick={() => setSide(side === 'members' || side === 'activity' ? null : 'members')} aria-label="People and activity" aria-pressed={side === 'members' || side === 'activity'}><Users size={18} /></button>
              </div>
            </header>

            {nextLive && !joinDismissed.includes(nextLive.id) && (
              <SessionStrip s={nextLive} onOpen={() => setSide('sessions')} onClose={() => setJoinDismissed((a) => [...a, nextLive.id])} />
            )}

            {searching && (
              <div className="fc-search">
                <Search size={16} aria-hidden="true" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search #${channel.name}`} aria-label="Search messages" autoFocus />
                {q && <button type="button" onClick={() => setQ('')} aria-label="Clear"><X size={15} /></button>}
                <span>{results ? `${results.length} found` : q.trim().length === 1 ? 'Keep typing' : ''}</span>
              </div>
            )}

            {showPins && (
              <div className="fc-pins">
                {pinned.length === 0 ? <p>No pinned messages yet. Admins and officers can pin important ones.</p> : pinned.map((p) => (
                  <button type="button" key={p.id} onClick={() => { setShowPins(false); jump(p.id) }}>
                    <Pin size={14} aria-hidden="true" /><b>{p.title || p.name}</b><span>{p.body.slice(0, 90) || 'Photo'}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="fc-list" ref={list} onScroll={onScroll} role="log" aria-live="polite">
              {hasMore && !results && <button type="button" className="fc-more" onClick={loadOlder}>Load earlier messages</button>}
              {loading && <div className="fc-skel" aria-busy="true">{[70, 45, 85, 55].map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}</div>}
              {!loading && shown.length === 0 && (
                <div className="fc-empty">
                  {results ? <><Search size={28} /><b>No matches</b><p>Try another word.</p></> : <><Hash size={28} /><b>Start of #{channel.name}</b><p>{readonlyForMe ? 'Nothing has been announced yet.' : 'Be the first to say something.'}</p></>}
                </div>
              )}
              {groups.map((g) => {
                if (g.type === 'day') return <div className="fc-day" key={g.key}><span>{g.label}</span></div>
                if (g.type === 'new') return <div className="fc-new" key={g.key}><span>New messages</span></div>
                return (
                  <Message
                    key={g.key} m={g.m} joined={g.joined} mine={g.m.user_id === me?.id} me={me} canPost={canPost}
                    picked={picked === g.m.id} onPick={() => setPicked(picked === g.m.id ? null : g.m.id)}
                    onProfile={() => setProfileId(g.m.user_id)} onReact={react} onReply={startReply} onEdit={startEdit}
                    onPin={pin} onDelete={remove} onAck={ack} onJump={jump} onImage={setLightbox}
                  />
                )
              })}
            </div>

            {pendingNew > 0 && (
              <button type="button" className="fc-jump" onClick={() => { stick.current = true; setPendingNew(0); scrollDown(true) }}>
                <ArrowDown size={16} aria-hidden="true" /> {pendingNew} new message{pendingNew > 1 ? 's' : ''}
              </button>
            )}

            {/* ---------- composer ---------- */}
            {readonlyForMe ? (
              <div className="fc-note"><Megaphone size={16} aria-hidden="true" /> Only admins and officers post here. You can react and tap “Got it”.</div>
            ) : !canPost ? (
              <div className="fc-note is-warn"><VolumeX size={16} aria-hidden="true" />
                {me?.reason === 'muted' ? `You are muted until ${parse(me.muted_until).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. You can still read.` : 'This admin login has no member profile. Sign in with your member account or Google to chat.'}
              </div>
            ) : (
              <form className="fc-compose" onSubmit={send}>
                {(draft.reply || draft.edit) && (
                  <div className="fc-ctx">
                    {draft.edit ? <Pencil size={14} aria-hidden="true" /> : <Reply size={14} aria-hidden="true" />}
                    <span>{draft.edit ? 'Editing your message' : <>Replying to <b>{draft.reply.name}</b></>}</span>
                    <button type="button" onClick={() => set({ reply: null, edit: null, text: draft.edit ? '' : draft.text })} aria-label="Cancel"><X size={15} /></button>
                  </div>
                )}
                {me?.staff && !draft.edit && !channel.readonly && (
                  <label className="fc-toggle">
                    <input type="checkbox" checked={draft.announce} onChange={(e) => set({ announce: e.target.checked })} />
                    <span><Megaphone size={14} aria-hidden="true" /> Post as announcement</span>
                  </label>
                )}
                {(channel.readonly || draft.announce) && !draft.edit && (
                  <div className="fc-ann-fields">
                    <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Announcement title" maxLength={160} aria-label="Announcement title" />
                    <label className="fc-toggle"><input type="checkbox" checked={draft.important} onChange={(e) => set({ important: e.target.checked })} /><span><BellRing size={14} aria-hidden="true" /> Mark as important</span></label>
                  </div>
                )}
                {draft.preview && (
                  <div className="fc-prev"><img src={draft.preview} alt="Selected photo" /><button type="button" onClick={clearImage} aria-label="Remove photo"><X size={14} /></button></div>
                )}
                {suggestions.length > 0 && (
                  <ul className="fc-suggest" role="listbox" aria-label="Mention someone">
                    {suggestions.map((m) => (
                      <li key={m.id}><button type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(m)}>
                        <Avatar name={m.name} src={m.avatar} size={26} online={m.online} /><span>{m.name}</span><small>{[m.ministry, m.dgroup].filter(Boolean).join(' · ')}</small>
                      </button></li>
                    ))}
                  </ul>
                )}
                <div className="fc-row">
                  {!draft.edit && (
                    <label className="fc-iconbtn" aria-label="Attach a photo" title="Attach a photo">
                      <ImagePlus size={20} />
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} />
                    </label>
                  )}
                  <button type="button" className="fc-iconbtn" aria-label="Mention someone" onClick={() => { set({ text: `${draft.text}${draft.text && !/\s$/.test(draft.text) ? ' ' : ''}@` }); area.current?.focus() }}><AtSign size={19} /></button>
                  <textarea ref={area} rows={1} value={draft.text} maxLength={2000} onChange={(e) => set({ text: e.target.value })} onKeyDown={onKey}
                    placeholder={channel.readonly || draft.announce ? 'Write the announcement…' : `Message #${channel.name}`} aria-label="Message" />
                  <button type="submit" className="fc-send" disabled={sending || (!draft.text.trim() && !draft.image)} aria-label={draft.edit ? 'Save edit' : 'Send'}>
                    {draft.edit ? <Check size={19} /> : <Send size={19} />}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      {/* ---------- members / activity ---------- */}
      {side && channel && (
        <>
          <div className="fc-scrim" onClick={() => setSide(null)} aria-hidden="true" />
          <aside className="fc-side" aria-label={side === 'sessions' ? 'Online sessions' : side === 'members' ? 'Members' : 'Activity'}>
            <header>
              <div className="fc-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={side === 'sessions'} className={side === 'sessions' ? 'is-on' : ''} onClick={() => setSide('sessions')}><Video size={15} /> Sessions</button>
                <button type="button" role="tab" aria-selected={side === 'members'} className={side === 'members' ? 'is-on' : ''} onClick={() => setSide('members')}><Users size={15} /> Members</button>
                <button type="button" role="tab" aria-selected={side === 'activity'} className={side === 'activity' ? 'is-on' : ''} onClick={() => setSide('activity')}><Activity size={15} /> Activity</button>
              </div>
              <button type="button" className="fc-iconbtn" onClick={() => setSide(null)} aria-label="Close panel"><X size={18} /></button>
            </header>
            {side === 'sessions' ? <SessionsPanel me={me} channels={channels} data={sessions} reload={loadSessions} toast={toast} /> : side === 'members' ? <MemberList members={members} setMembers={setMembers} onOpen={setProfileId} /> : <ActivityPanel me={me} onOpen={setProfileId} />}
          </aside>
        </>
      )}

      {profileId && <Profile id={profileId} me={me} onClose={() => setProfileId(null)} onMention={mention} canMention={canPost && !readonlyForMe} toast={toast} />}
      {lightbox && createPortal(
        <div className="fc-lightbox" role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setLightbox(null)}>
          <button type="button" aria-label="Close" onClick={() => setLightbox(null)}><X size={22} /></button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>, document.body)}
    </div>
  )
}

/* ====================================================================== */
function Message({ m, joined, mine, me, canPost, picked, onPick, onProfile, onReact, onReply, onEdit, onPin, onDelete, onAck, onJump, onImage }) {
  const [who, setWho] = useState(null)
  const rn = roleName(m.role)

  if (m.deleted) {
    return <div className="fc-msg is-gone" data-mid={m.id}><span /><p><X size={13} aria-hidden="true" /> This message was deleted.</p></div>
  }

  async function showWho() {
    if (who) return setWho(null)
    try { setWho(await apiGet(`/api/chat/messages/${m.id}/acks`)) } catch { setWho([]) }
  }

  const tools = (
    <div className="fc-tools" onClick={(e) => e.stopPropagation()}>
      {REACTIONS.map(({ key, label, Icon }) => (
        <button key={key} type="button" className={m.reactions[key]?.mine ? 'is-on' : ''} onClick={() => onReact(m, key)} aria-label={label} title={label}><Icon size={16} /></button>
      ))}
      <i aria-hidden="true" />
      {canPost && <button type="button" onClick={() => onReply(m)} aria-label="Reply" title="Reply"><Reply size={16} /></button>}
      {mine && canPost && <button type="button" onClick={() => onEdit(m)} aria-label="Edit" title="Edit"><Pencil size={16} /></button>}
      {me?.staff && <button type="button" onClick={() => onPin(m)} aria-label={m.pinned ? 'Unpin' : 'Pin'} title={m.pinned ? 'Unpin' : 'Pin'}>{m.pinned ? <PinOff size={16} /> : <Pin size={16} />}</button>}
      {(mine || me?.staff) && <button type="button" className="is-danger" onClick={() => onDelete(m)} aria-label="Delete" title="Delete"><Trash2 size={16} /></button>}
    </div>
  )

  const reactions = Object.entries(m.reactions || {})
  const rx = reactions.length > 0 && (
    <div className="fc-rx">
      {reactions.map(([k, v]) => {
        const R = REACTIONS.find((x) => x.key === k)
        if (!R) return null
        return <button key={k} type="button" className={v.mine ? 'is-on' : ''} onClick={(e) => { e.stopPropagation(); onReact(m, k) }} aria-label={`${R.label}, ${v.n}`} aria-pressed={v.mine}><R.Icon size={13} />{v.n}</button>
      })}
    </div>
  )

  if (m.kind === 'announcement') {
    return (
      <article className={`fc-ann${m.important ? ' is-important' : ''}${picked ? ' is-picked' : ''}`} data-mid={m.id} onClick={onPick}>
        <header>
          <span className="fc-ann-tag"><Megaphone size={14} aria-hidden="true" /> {m.important ? 'Important announcement' : 'Announcement'}</span>
          {m.pinned && <span className="fc-ann-pin"><Pin size={13} aria-hidden="true" /> Pinned</span>}
        </header>
        <h3>{m.title}</h3>
        {m.body && <p><RichText text={m.body} mentions={m.mentions} /></p>}
        {m.image && <button type="button" className="fc-img" onClick={(e) => { e.stopPropagation(); onImage(resolveImageUrl(m.image)) }}><img src={resolveImageUrl(m.image)} alt="Announcement photo" loading="lazy" decoding="async" /></button>}
        <footer onClick={(e) => e.stopPropagation()}>
          <button type="button" className="fc-by" onClick={onProfile}>{m.name}{rn && <small>{rn}</small>}</button>
          <time>{hhmm(m.created_at)}</time>
          <span className="fc-grow" />
          {me?.staff && <button type="button" className="fc-link" onClick={showWho}><ShieldCheck size={14} /> {m.acks.n} read</button>}
          <button type="button" className={`fc-got${m.acks?.mine ? ' is-done' : ''}`} disabled={m.acks?.mine || !canPost} onClick={() => onAck(m)}>
            <Check size={15} aria-hidden="true" /> {m.acks?.mine ? 'Got it' : 'Got it?'}
          </button>
        </footer>
        {who && <p className="fc-who">{who.length ? who.map((w) => w.name).join(', ') : 'Nobody has acknowledged yet.'}</p>}
        {rx}
        {tools}
      </article>
    )
  }

  const mentioned = m.mentions?.some((x) => x.id === me?.id)
  return (
    <div className={`fc-msg${joined ? ' is-joined' : ''}${mine ? ' is-mine' : ''}${mentioned ? ' is-mentioned' : ''}${picked ? ' is-picked' : ''}`} data-mid={m.id} onClick={onPick}>
      {joined ? <time className="fc-t" aria-hidden="true">{hhmm(m.created_at)}</time> : (
        <button type="button" className="fc-av-btn" onClick={(e) => { e.stopPropagation(); onProfile() }} aria-label={`Open ${m.name}'s profile`}><Avatar name={m.name} src={m.avatar} size={38} /></button>
      )}
      <div className="fc-body">
        {!joined && (
          <div className="fc-head">
            <button type="button" className="fc-name" onClick={(e) => { e.stopPropagation(); onProfile() }}>{m.name}</button>
            {rn && <span className={`fc-role is-${m.role}`}>{rn}</span>}
            {m.ministry && <span className="fc-chip"><HeartHandshake size={12} aria-hidden="true" />{m.ministry}</span>}
            {m.dgroup && <span className="fc-chip"><Network size={12} aria-hidden="true" />{m.dgroup}</span>}
            <time>{hhmm(m.created_at)}</time>
          </div>
        )}
        {m.reply && (
          <button type="button" className="fc-quote" onClick={(e) => { e.stopPropagation(); onJump(m.reply.id) }}><Reply size={12} aria-hidden="true" /><b>{m.reply.name}</b><span>{m.reply.snippet}</span></button>
        )}
        {m.body && <p className="fc-text"><RichText text={m.body} mentions={m.mentions} />{m.edited && <small className="fc-edited"> (edited)</small>}</p>}
        {m.image && <button type="button" className="fc-img" onClick={(e) => { e.stopPropagation(); onImage(resolveImageUrl(m.image)) }}><img src={resolveImageUrl(m.image)} alt={`Photo from ${m.name}`} loading="lazy" decoding="async" /></button>}
        {m.pinned && <span className="fc-pinned"><Pin size={12} aria-hidden="true" /> Pinned</span>}
        {rx}
      </div>
      {tools}
    </div>
  )
}

/* ---------- members ---------- */
function MemberList({ members, setMembers, onOpen }) {
  const [q, setQ] = useState('')
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && apiGet('/api/chat/members').then((m) => Array.isArray(m) && setMembers(m)).catch(() => {}), 30000)
    return () => clearInterval(t)
  }, [setMembers])
  const f = members.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))
  const on = f.filter((m) => m.online)
  const off = f.filter((m) => !m.online)
  const row = (m) => (
    <li key={m.id}>
      <button type="button" onClick={() => onOpen(m.id)}>
        <Avatar name={m.name} src={m.avatar} size={34} online={m.online} />
        <span><b>{m.name}</b>{roleName(m.role) && <em className={`fc-role is-${m.role}`}>{roleName(m.role)}</em>}
          <small>{[m.ministry, m.dgroup].filter(Boolean).join(' · ') || 'No ministry or D-Group yet'}</small></span>
      </button>
    </li>
  )
  return (
    <div className="fc-pane">
      <label className="fc-find"><Search size={15} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a member" aria-label="Find a member" /></label>
      {on.length > 0 && <><h4>Online · {on.length}</h4><ul className="fc-people">{on.map(row)}</ul></>}
      <h4>Offline · {off.length}</h4>
      <ul className="fc-people">{off.map(row)}</ul>
      {f.length === 0 && <p className="fc-muted">No one matches “{q}”.</p>}
    </div>
  )
}

/* ---------- engagement ---------- */
function ActivityPanel({ me, onOpen }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [level, setLevel] = useState('all')
  useEffect(() => { apiGet('/api/chat/activity').then(setData).catch((e) => setErr(e.message)) }, [])
  if (err) return <div className="fc-pane"><p className="fc-muted">{err}</p></div>
  if (!data) return <div className="fc-pane"><div className="fc-skel"><i style={{ width: '80%' }} /><i style={{ width: '60%' }} /><i style={{ width: '70%' }} /></div></div>
  const everyone = (data.everyone || []).filter((x) => level === 'all' || x.level === level)
  return (
    <div className="fc-pane">
      <h4><Trophy size={14} aria-hidden="true" /> Most active this month</h4>
      {data.top.length === 0 ? <p className="fc-muted">No activity yet. Start a conversation.</p> : (
        <ol className="fc-top">
          {data.top.map((p, i) => (
            <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}>
              <span className="fc-rank">{i + 1}</span><Avatar name={p.name} src={p.avatar} size={32} />
              <span><b>{p.name}</b><small>{p.messages} messages · {p.active_days} active days</small></span>
            </button></li>
          ))}
        </ol>
      )}
      {me?.staff && data.summary && (
        <>
          <h4>Engagement overview</h4>
          <div className="fc-sum">
            {['active', 'casual', 'quiet'].map((k) => (
              <button type="button" key={k} className={level === k ? 'is-on' : ''} onClick={() => setLevel(level === k ? 'all' : k)}>
                <strong>{data.summary[k]}</strong><span>{LEVEL[k]}</span>
              </button>
            ))}
          </div>
          <p className="fc-muted">Active: 4+ days or 12+ messages in 30 days. Quiet: no messages. Tap a card to filter.</p>
          <ul className="fc-people">
            {everyone.slice(0, 80).map((p) => (
              <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}>
                <Avatar name={p.name} src={p.avatar} size={34} />
                <span><b>{p.name}</b><em className={`fc-level is-${p.level}`}>{LEVEL[p.level]}</em>
                  <small>{p.messages} msgs · {p.reactions_received} reactions · {p.last_message ? `last ${ago(p.last_message)}` : 'no messages'}</small>
                  <small>{[p.ministry, p.dgroup].filter(Boolean).join(' · ') || 'No ministry or D-Group'}</small></span>
              </button></li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* ---------- profile ---------- */
function Profile({ id, me, onClose, onMention, canMention, toast }) {
  const [p, setP] = useState(null)
  const [err, setErr] = useState('')
  const [mins, setMins] = useState(60)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => apiGet(`/api/chat/profile/${id}`).then(setP).catch((e) => setErr(e.message)), [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  async function mute(minutes) {
    setBusy(true)
    try { const r = await apiPost('/api/chat/mute', { user_id: id, minutes, reason }); toast(r.message); setReason(''); await load() } catch (e) { toast(e.message, 'bad') } finally { setBusy(false) }
  }

  return createPortal(
    <div className="fc-modal" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fc-card" role="dialog" aria-modal="true" aria-label="Member profile">
        <button type="button" className="fc-iconbtn fc-card-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {err ? <p className="fc-muted">{err}</p> : !p ? <div className="fc-skel"><i style={{ width: '60%' }} /><i style={{ width: '40%' }} /></div> : (
          <>
            <div className="fc-card-top">
              <Avatar name={p.name} src={p.avatar} size={76} online={p.online} />
              <div>
                <h3>{p.name}</h3>
                <p>{roleName(p.role) ? <span className={`fc-role is-${p.role}`}>{roleName(p.role)}</span> : <span className="fc-role">Member</span>}
                  <span className="fc-seen"><Clock size={12} aria-hidden="true" /> {p.online ? 'Online now' : `Seen ${ago(p.last_seen)}`}</span></p>
              </div>
            </div>
            <dl className="fc-facts">
              <div><dt><HeartHandshake size={14} aria-hidden="true" /> Ministry</dt><dd>{p.ministry || 'Not in a ministry yet'}</dd></div>
              <div><dt><Network size={14} aria-hidden="true" /> D-Group</dt><dd>{p.dgroup || 'Not in a D-Group yet'}</dd></div>
              {p.joined_at && <div><dt>Joined</dt><dd>{new Date(String(p.joined_at).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</dd></div>}
            </dl>
            <div className="fc-stats">
              <div><strong>{p.stats.messages}</strong><span>Messages</span></div>
              <div><strong>{p.stats.active_days}</strong><span>Active days</span></div>
              <div><strong>{p.stats.reactions_received}</strong><span>Reactions</span></div>
              <div><strong className={`fc-level is-${p.stats.level}`}>{LEVEL[p.stats.level]}</strong><span>30 days</span></div>
            </div>
            {canMention && p.id !== me?.id && <button type="button" className="fc-btn" onClick={() => onMention({ id: p.id, name: p.name })}><AtSign size={16} aria-hidden="true" /> Mention in chat</button>}
            {p.can_mute && (
              <div className="fc-mod">
                <h4><ShieldCheck size={14} aria-hidden="true" /> Moderation</h4>
                {p.muted_until ? (
                  <>
                    <p className="fc-muted">Muted until {new Date(String(p.muted_until).replace(' ', 'T')).toLocaleString('en-PH')}.</p>
                    <button type="button" className="fc-btn is-line" disabled={busy} onClick={() => mute(0)}><Volume2 size={16} aria-hidden="true" /> Lift mute</button>
                  </>
                ) : (
                  <>
                    <div className="fc-mod-row">
                      <select value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Mute length">{MUTES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={120} aria-label="Reason" />
                    </div>
                    <button type="button" className="fc-btn is-danger" disabled={busy} onClick={() => mute(mins)}><VolumeX size={16} aria-hidden="true" /> Mute</button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>, document.body)
}

/* ====================================================================== */
/* Online sessions (Google Meet)                                           */
/* ====================================================================== */
const SESSION_KINDS = [
  ['fellowship', 'Fellowship', Users],
  ['bible_study', 'Bible study', BookOpen],
  ['prayer', 'Prayer', HandHeart],
  ['meeting', 'Meeting', CalendarDays],
]
const kindOf = (k) => SESSION_KINDS.find((x) => x[0] === k) || SESSION_KINDS[0]
const MEET_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?[A-Za-z0-9=&_%.-]*)?$/
const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

function whenText(s) {
  const a = parse(s.starts_at)
  return `${a.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })} · ${hhmm(s.starts_at)} – ${hhmm(s.ends_at)}`
}
function countdown(s) {
  if (s.cancelled) return 'Cancelled'
  if (s.over) return 'Ended'
  if (s.live) return 'Live now'
  const m = s.starts_in
  if (m <= 1) return 'Starting now'
  if (m < 60) return `Starts in ${m} min`
  if (m < 1440) return `Starts in ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim()
  return `In ${Math.round(m / 1440)} d`
}
function calendarUrl(s) {
  const a = parse(s.starts_at), b = parse(s.ends_at)
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: `${s.title} (Life Generation)`, dates: `${stamp(a)}/${stamp(b)}`,
    details: `${kindOf(s.kind)[1]} on Google Meet.\nOpen Fellowship Chat > Sessions to join.${s.description ? `\n\n${s.description}` : ''}`,
    location: 'Google Meet', ctz: 'Asia/Manila',
  })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

/** Appears over the conversation when a session is live or about to start, in any room. */
function SessionStrip({ s, onOpen, onClose }) {
  return (
    <div className={`fc-strip${s.live ? ' is-live' : ''}`} role="status">
      <Video size={18} aria-hidden="true" />
      <button type="button" className="fc-strip-main" onClick={onOpen}>
        <b>{s.title}</b>
        <span>{countdown(s)}{s.my_rsvp === 'going' ? ' · You are going' : ''}</span>
      </button>
      <button type="button" className="fc-strip-join" onClick={onOpen}>Open</button>
      <button type="button" className="fc-iconbtn fc-strip-x" onClick={onClose} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}

function SessionsPanel({ me, channels, data, reload, toast }) {
  const [form, setForm] = useState(false)
  const [tab, setTab] = useState('upcoming')
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState(null)
  const [g, setG] = useState(null)
  const loadG = useCallback(() => { if (me?.staff) apiGet('/api/chat/google/status').then(setG).catch(() => setG(null)) }, [me?.staff])
  useEffect(() => { loadG() }, [loadG])
  const connectG = async () => {
    try { const r = await apiGet('/api/chat/google/connect'); window.location.href = r.url } catch (e) { toast(e.message || 'Could not start the Google connection.', 'bad') }
  }
  const disconnectG = async () => {
    if (!window.confirm('Disconnect Google? New sessions will need a pasted Meet link.')) return
    try { await apiPost('/api/chat/google/disconnect', {}); await loadG(); toast('Google disconnected.') } catch (e) { toast(e.message || 'Could not disconnect.', 'bad') }
  }
  const list = tab === 'upcoming' ? data.upcoming : data.past

  const rsvp = async (s, value) => {
    setBusy(s.id)
    try { await apiPost(`/api/chat/sessions/${s.id}/rsvp`, { rsvp: value }); await reload(); toast(value === 'none' ? 'RSVP removed.' : value === 'going' ? 'You are going.' : 'Marked as maybe.') }
    catch (e) { toast(e.message || 'Could not save your RSVP.', 'bad') } finally { setBusy(null) }
  }
  const join = async (s) => {
    setBusy(s.id)
    try {
      const r = await apiPost(`/api/chat/sessions/${s.id}/join`, {})
      window.open(r.url, '_blank', 'noopener,noreferrer')
      toast('Opening Google Meet. Your attendance is logged.')
      reload()
    } catch (e) { toast(e.message || 'Could not join.', 'bad') } finally { setBusy(null) }
  }
  const cancel = async (s) => {
    if (!window.confirm(`Cancel "${s.title}"? Everyone in the room will be notified.`)) return
    setBusy(s.id)
    try { await apiPost(`/api/chat/sessions/${s.id}/cancel`, {}); await reload(); toast('Session cancelled.') }
    catch (e) { toast(e.message || 'Could not cancel.', 'bad') } finally { setBusy(null) }
  }
  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s.meet_url); toast('Meet link copied.') } catch { toast('Copy failed. Select the link instead.', 'bad') }
  }

  return (
    <div className="fc-pane fc-sessions">
      {me?.staff && me.id > 0 && !form && (
        <button type="button" className="fc-newsess" onClick={() => setForm(true)}><Plus size={18} aria-hidden="true" /> Schedule an online session</button>
      )}
      {me?.staff && g && !form && (
        <div className={`fc-gcard${g.connected ? ' is-on' : ''}`}>
          <Video size={18} aria-hidden="true" />
          <div>
            {g.connected ? <><b>Google Meet is connected</b><small>{g.email || 'Meet links are created automatically.'}</small></>
              : !g.configured ? <><b>One step left on the server</b><small>Add {g.missing.join(', ')} to backend/.env.</small></>
              : <><b>Create Meet links automatically</b><small>{g.can_connect ? 'Connect the ministry Google account once.' : 'Ask an admin to connect Google once.'}</small>{g.can_connect && <small className="fc-uri">Redirect URI: {g.redirect_uri}</small>}</>}
          </div>
          {g.can_connect && g.configured && (g.connected
            ? <button type="button" onClick={disconnectG}>Disconnect</button>
            : <button type="button" className="is-primary" onClick={connectG}>Connect</button>)}
        </div>
      )}
      {form && <SessionForm google={g} channels={channels} onCancel={() => setForm(false)} onDone={async () => { setForm(false); setTab('upcoming'); await reload(); toast('Session scheduled and announced.') }} toast={toast} />}

      <div className="fc-seg" role="tablist" aria-label="Sessions">
        <button type="button" role="tab" aria-selected={tab === 'upcoming'} className={tab === 'upcoming' ? 'is-on' : ''} onClick={() => setTab('upcoming')}>Upcoming{data.upcoming.length > 0 && <i>{data.upcoming.length}</i>}</button>
        <button type="button" role="tab" aria-selected={tab === 'past'} className={tab === 'past' ? 'is-on' : ''} onClick={() => setTab('past')}>Past</button>
      </div>

      {list.length === 0 ? (
        <div className="fc-nosess">
          <Video size={26} aria-hidden="true" />
          <b>{tab === 'upcoming' ? 'No online sessions yet' : 'Nothing in the last 2 weeks'}</b>
          <p>{tab === 'upcoming' ? (me?.staff ? 'Schedule a Google Meet fellowship or Bible study and it shows up here for everyone.' : 'When an officer schedules an online fellowship or Bible study, it appears here.') : 'Finished sessions and their notes show up here.'}</p>
        </div>
      ) : (
        <ul className="fc-sesslist">
          {list.map((s) => {
            const [, kindLabel, KindIcon] = kindOf(s.kind)
            const isOpen = open === s.id
            return (
              <li key={s.id} className={`fc-sess${s.live ? ' is-live' : ''}${s.cancelled ? ' is-off' : ''}`}>
                <div className="fc-sess-top">
                  <span className="fc-sess-ico"><KindIcon size={18} aria-hidden="true" /></span>
                  <div>
                    <b>{s.title}</b>
                    <small>{kindLabel}{s.channel_name ? ` · #${s.channel_name}` : ' · Everyone'}</small>
                  </div>
                  <span className={`fc-badge${s.live ? ' is-live' : s.cancelled ? ' is-off' : ''}`}>{countdown(s)}</span>
                </div>
                <p className="fc-sess-when"><Clock size={14} aria-hidden="true" /> {whenText(s)}</p>
                <p className="fc-sess-meta"><UserCheck size={14} aria-hidden="true" /> Hosted by {s.host_name || 'an officer'} · {s.going} going{s.joined > 0 ? ` · ${s.joined} joined` : ''}</p>
                {s.description && <p className="fc-sess-desc">{s.description}</p>}
                {s.notes && <div className="fc-sess-notes"><b>Notes</b><p>{s.notes}</p></div>}

                {!s.cancelled && !s.over && (
                  <div className="fc-sess-actions">
                    {s.can_join ? (
                      <button type="button" className="fc-btn is-join" disabled={busy === s.id} onClick={() => join(s)}><Video size={16} aria-hidden="true" /> {s.my_joined ? 'Rejoin Meet' : 'Join on Google Meet'}</button>
                    ) : (
                      <>
                        <button type="button" className={`fc-btn${s.my_rsvp === 'going' ? ' is-on' : ''}`} disabled={busy === s.id || me?.id <= 0} aria-pressed={s.my_rsvp === 'going'} onClick={() => rsvp(s, s.my_rsvp === 'going' ? 'none' : 'going')}>
                          {s.my_rsvp === 'going' ? <><Check size={16} aria-hidden="true" /> Going</> : 'I will join'}
                        </button>
                        <button type="button" className={`fc-btn${s.my_rsvp === 'maybe' ? ' is-on' : ''}`} disabled={busy === s.id || me?.id <= 0} aria-pressed={s.my_rsvp === 'maybe'} onClick={() => rsvp(s, s.my_rsvp === 'maybe' ? 'none' : 'maybe')}>Maybe</button>
                      </>
                    )}
                    <a className="fc-btn is-ghost" href={calendarUrl(s)} target="_blank" rel="noopener noreferrer"><CalendarPlus size={16} aria-hidden="true" /> Calendar</a>
                  </div>
                )}
                {!s.can_join && !s.cancelled && !s.over && <p className="fc-sess-hint">The Join button opens 15 minutes before the start.</p>}

                {s.can_manage && (
                  <div className="fc-sess-host">
                    {s.meet_url && !s.cancelled && <button type="button" onClick={() => copy(s)}><Copy size={14} aria-hidden="true" /> Copy link</button>}
                    <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}><UserCheck size={14} aria-hidden="true" /> Attendance</button>
                    {!s.over && !s.cancelled && <button type="button" className="is-danger" disabled={busy === s.id} onClick={() => cancel(s)}><X size={14} aria-hidden="true" /> Cancel</button>}
                  </div>
                )}
                {s.can_manage && s.over && <NotesEditor s={s} reload={reload} toast={toast} />}
                {isOpen && <SessionPeople id={s.id} />}
                {!s.can_manage && me?.staff && <button type="button" className="fc-sess-peoplebtn" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}><UserCheck size={14} aria-hidden="true" /> Attendance</button>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SessionPeople({ id }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { apiGet(`/api/chat/sessions/${id}/people`).then(setRows).catch(() => setRows([])) }, [id])
  if (!rows) return <div className="fc-skel"><i style={{ width: '70%' }} /><i style={{ width: '50%' }} /></div>
  if (!rows.length) return <p className="fc-muted">Nobody has RSVPed yet.</p>
  return (
    <ul className="fc-attend">
      {rows.map((r) => (
        <li key={r.id}>
          <span>{r.name}{r.dgroup ? <small> · {r.dgroup}</small> : null}</span>
          <em className={r.joined_at ? 'is-in' : ''}>{r.joined_at ? `Joined ${hhmm(r.joined_at)}` : r.rsvp === 'maybe' ? 'Maybe' : 'Going'}</em>
        </li>
      ))}
    </ul>
  )
}

function NotesEditor({ s, reload, toast }) {
  const [v, setV] = useState(s.notes || '')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try { await apiPost(`/api/chat/sessions/${s.id}/notes`, { notes: v }); await reload(); toast('Notes saved.') }
    catch (e) { toast(e.message || 'Could not save.', 'bad') } finally { setBusy(false) }
  }
  return (
    <div className="fc-notes">
      <label htmlFor={`n${s.id}`}>Recap, passage or takeaways</label>
      <textarea id={`n${s.id}`} rows={3} maxLength={3000} value={v} onChange={(e) => setV(e.target.value)} placeholder="What did you cover? Members can read this afterwards." />
      <button type="button" className="fc-btn" disabled={busy || v === (s.notes || '')} onClick={save}>{busy ? 'Saving' : 'Save notes'}</button>
    </div>
  )
}

function SessionForm({ google, channels, onCancel, onDone, toast }) {
  const soon = new Date(Date.now() + 60 * 60000)
  soon.setMinutes(0, 0, 0)
  const [f, setF] = useState({ title: '', kind: 'fellowship', date: toLocalInput(soon), time: `${pad(soon.getHours())}:00`, duration: 60, channel_id: '', meet_url: '', description: '', announce: true, auto: !!google?.connected })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const urlOk = MEET_RE.test(f.meet_url.trim())
  const rooms = channels.filter((c) => c.kind !== 'announcement' && !c.staff_only)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!f.title.trim()) return setErr('Give the session a title.')
    if (!f.auto && !urlOk) return setErr('Paste a Google Meet link, like https://meet.google.com/abc-defg-hij')
    setBusy(true)
    try {
      await apiPost('/api/chat/sessions', {
        title: f.title.trim(), kind: f.kind, description: f.description.trim(), meet_url: f.auto ? '' : f.meet_url.trim(), auto_meet: f.auto,
        starts_at: `${f.date} ${f.time}:00`, duration: Number(f.duration), channel_id: f.channel_id || 0, announce: f.announce,
      })
      onDone()
    } catch (e2) { setErr(e2.message || 'Could not schedule the session.'); toast(e2.message || 'Could not schedule the session.', 'bad') } finally { setBusy(false) }
  }

  return (
    <form className="fc-form" onSubmit={submit} noValidate>
      <div className="fc-form-head"><h4><Video size={15} aria-hidden="true" /> New online session</h4><button type="button" className="fc-iconbtn" onClick={onCancel} aria-label="Close form"><X size={18} /></button></div>

      <div className="fc-chips" role="radiogroup" aria-label="Session type">
        {SESSION_KINDS.map(([k, label, Icon]) => (
          <button type="button" role="radio" aria-checked={f.kind === k} key={k} className={f.kind === k ? 'is-on' : ''} onClick={() => set({ kind: k })}><Icon size={15} aria-hidden="true" /> {label}</button>
        ))}
      </div>

      <label className="fc-field"><span>Title</span>
        <input value={f.title} maxLength={160} onChange={(e) => set({ title: e.target.value })} placeholder="Friday night Bible study" autoComplete="off" />
      </label>

      <div className="fc-row2">
        <label className="fc-field"><span>Date</span><input type="date" value={f.date} min={toLocalInput(new Date())} onChange={(e) => set({ date: e.target.value })} /></label>
        <label className="fc-field"><span>Time</span><input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} /></label>
      </div>
      <div className="fc-row2">
        <label className="fc-field"><span>Length</span>
          <select value={f.duration} onChange={(e) => set({ duration: e.target.value })}>
            {[[30, '30 minutes'], [60, '1 hour'], [90, '1.5 hours'], [120, '2 hours'], [180, '3 hours']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="fc-field"><span>Who can see it</span>
          <select value={f.channel_id} onChange={(e) => set({ channel_id: e.target.value })}>
            <option value="">Everyone</option>
            {rooms.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
        </label>
      </div>

      {google?.connected && (
        <label className="fc-check"><input type="checkbox" checked={f.auto} onChange={(e) => set({ auto: e.target.checked })} /><span>Create the Meet link automatically</span></label>
      )}
      {f.auto ? (
        <p className="fc-autonote"><Video size={15} aria-hidden="true" /> Google will generate the Meet link when you schedule. It is also added to the ministry calendar.</p>
      ) : (
        <div className="fc-field">
          <span>Google Meet link</span>
          <div className={`fc-meet${f.meet_url && (urlOk ? ' is-ok' : ' is-bad')}`}>
            <Link2 size={16} aria-hidden="true" />
            <input value={f.meet_url} onChange={(e) => set({ meet_url: e.target.value })} placeholder="https://meet.google.com/abc-defg-hij" inputMode="url" autoComplete="off" spellCheck={false} aria-label="Google Meet link" />
            {urlOk && <Check size={16} aria-hidden="true" />}
          </div>
          <a className="fc-createmeet" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Create a new Meet, then paste its link here</a>
        </div>
      )}

      <label className="fc-field"><span>Agenda or passage <em>(optional)</em></span>
        <textarea rows={3} maxLength={1500} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Reading: John 15:1-8. Bring one question." />
      </label>

      <label className="fc-check"><input type="checkbox" checked={f.announce} onChange={(e) => set({ announce: e.target.checked })} /><span>Post an announcement in the room</span></label>

      {err && <p className="fc-err" role="alert"><CircleAlert size={14} aria-hidden="true" /> {err}</p>}
      <div className="fc-form-actions">
        <button type="button" className="fc-btn is-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="fc-btn is-join" disabled={busy}>{busy ? 'Scheduling' : 'Schedule session'}</button>
      </div>
    </form>
  )
}
