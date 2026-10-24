import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Bell, User, ArrowUp } from 'lucide-react'
import { getUser, logout } from '../../api.js'
import { useTheme } from '../../useTheme.js'
import { initials, resolveImageUrl } from '../../lib/format.js'
import { on, emit } from '../../lib/bus.js'
import { startMotion } from '../../lib/motion.js'
import { MEMBER_NAV } from '../../lib/memberNav.js'
import { ToastProvider, ConfirmDialog, useToast } from './ui.jsx'
import MemberPopup from './MemberPopup.jsx'
import { useFeed } from './panels.jsx'
import { NotificationsPanel, SearchPanel, ProfilePanel, SectionPanel } from './MemberPanels.jsx'

const typingIn = (el) => !!el?.closest?.('input, textarea, select, [contenteditable="true"]')
const asElement = (n) => (n && n.nodeType === 3 ? n.parentElement : n)

function Logo({ className }) {
  const [bad, setBad] = useState(false)
  return bad ? (
    <span className={className}>LG</span>
  ) : (
    <img className={className} src="/logo.png" alt="" draggable="false" onError={() => setBad(true)} />
  )
}

function Avatar({ user, name }) {
  const src = user?.avatar || user?.member?.avatar
  return (
    <span className="sk-avatar" aria-hidden="true">
      {src ? <img src={resolveImageUrl(src)} alt="" draggable="false" /> : initials(name)}
    </span>
  )
}

const TITLES = { search: 'Search', bell: 'Notifications', user: 'Account' }

function Shell({ children }) {
  const user = getUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const feed = useFeed(true)
  const [panel, setPanel] = useState(null) // 'search' | 'bell' | 'user' | id ng page
  const [confirmOut, setConfirmOut] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const drawer = useRef(null)
  const opener = useRef(null)
  const lastPanel = useRef(null)
  const swipe = useRef(null)
  const [dx, setDx] = useState(0)

  const panelRef = useRef(null)
  panelRef.current = panel
  if (panel) lastPanel.current = panel
  const content = panel || lastPanel.current
  const open = !!panel

  const name = user?.full_name || user?.username || 'Member'
  const role = user?.role === 'moderator' ? 'Moderator' : 'Member'
  const memberId = user?.member_id || user?.member?.member_id
  const activeIdx = MEMBER_NAV.findIndex((n) => (n.end ? pathname === n.to || pathname === '/dashboard/overview' : pathname === n.to || pathname.startsWith(`${n.to}/`)))
  const onProfile = pathname.startsWith('/dashboard/profile')
  const navItem = MEMBER_NAV.find((n) => n.id === content)

  const close = useCallback(() => {
    setPanel(null)
    setDx(0)
    const el = opener.current
    opener.current = null
    // ibalik ang focus sa icon na pinindot (keyboard friendly)
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus({ preventScroll: true }))
  }, [])

  const pick = useCallback((id, el) => {
    setPanel((cur) => {
      if (cur === id) return null
      opener.current = el || document.activeElement
      return id
    })
  }, [])

  /* ---- mga event ---- */
  useEffect(() => {
    setPanel(null)
    setDx(0)
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => startMotion(document.getElementById('sk-main')), [])

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if (e.key === 'Escape') {
        if (panelRef.current) close()
      }
      else if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setPanel('search')
      } else if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'x'].includes(e.key.toLowerCase()) && !typing) {
        e.preventDefault() // bawal i-select all / kopyahin ang text
      }
    }
    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        const max = document.documentElement.scrollHeight - window.innerHeight
        const y = window.scrollY
        document.documentElement.style.setProperty('--sk-scroll', max > 0 ? Math.min(1, y / max).toFixed(4) : '0')
        setShowTop(y > 700)
      })
    }
    const onOffline = () => toast('You are offline. Some actions will not work.', 'bad')
    const onOnline = () => toast('You are back online.')
    onScroll()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    const off = on('portal:open', (id) => setPanel(id || null)) // emit('portal:open', 'search') kahit saang page
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      off()
    }
  }, [toast, close])

  // lock ang scroll ng page habang bukas ang sidebar + focus sa loob
  useEffect(() => {
    document.documentElement.classList.toggle('sk-lock', open)
    emit('portal:panel', open)
    if (!open) return undefined
    const t = setTimeout(() => (drawer.current?.querySelector('input:not([type=hidden])') || drawer.current)?.focus({ preventScroll: true }), 90)
    return () => clearTimeout(t)
  }, [open, content])
  useEffect(() => () => document.documentElement.classList.remove('sk-lock'), [])

  // swipe pakaliwa para isara ang sidebar (touch/pen lang, hindi sagabal sa click)
  const sDown = (e) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY, on: false }
  }
  const sMove = (e) => {
    const s = swipe.current
    if (!s) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (!s.on) {
      if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.6) {
        s.on = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } else if (Math.abs(my) > 12) swipe.current = null
    }
    if (s.on) setDx(Math.min(0, mx))
  }
  const sUp = () => {
    const s = swipe.current
    swipe.current = null
    if (s?.on && dx < -70) close()
    else setDx(0)
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const openFaq = () => {
    close()
    if (pathname === '/dashboard') {
      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate('/dashboard#faq')
    }
  }

  const avatar = <Avatar user={user} name={name} />
  const railBtn = ({ id, label, children, badge, current }) => (
    <button
      key={id}
      type="button"
      className={`sk-rb${panel === id ? ' is-open' : ''}${current ? ' is-current' : ''}`}
      data-tip={label}
      aria-label={label}
      aria-expanded={panel === id}
      aria-current={current ? 'page' : undefined}
      onClick={(e) => pick(id, e.currentTarget)}
    >
      {children}
      {badge > 0 && <i className="sk-badge">{badge > 9 ? '9+' : badge}</i>}
    </button>
  )

  return (
    <>
      <div className="sk-progress" aria-hidden="true" />

      {/* ===== icon rail (laging nasa kaliwa) ===== */}
      <aside className="sk-rail" aria-label="Quick menu">
        <Link to="/dashboard" className="sk-brand" aria-label="Life Generation home">
          <Logo className="sk-logo" />
        </Link>

        <div className="sk-rg">
          {railBtn({ id: 'search', label: 'Search pages', children: <Search size={21} strokeWidth={1.8} /> })}
          {railBtn({ id: 'bell', label: 'Notifications', badge: feed.unread, children: <Bell size={21} strokeWidth={1.8} /> })}
          {railBtn({
            id: 'user',
            label: 'Profile',
            current: onProfile,
            children: user?.avatar || user?.member?.avatar ? avatar : <User size={21} strokeWidth={1.8} />,
          })}
        </div>

        <span className="sk-sep" aria-hidden="true" />

        <div role="navigation" className="sk-rg sk-rnav" aria-label="Pages" style={{ '--i': Math.max(activeIdx, 0) }}>
          <i className={`sk-ind${activeIdx < 0 ? ' is-off' : ''}`} aria-hidden="true" />
          {MEMBER_NAV.map(({ id, label, icon: Icon }, i) =>
            railBtn({ id, label, current: i === activeIdx, children: <Icon size={21} strokeWidth={1.8} /> })
          )}
        </div>
      </aside>

      {/* ===== sidebar na lumalabas lang kapag may pinindot na icon ===== */}
      <div className={`sk-scrim${open ? ' is-on' : ''}`} onPointerDown={close} aria-hidden="true" />
      <aside
        ref={drawer}
        tabIndex={-1}
        className={`sk-drawer${open ? ' is-open' : ''}${dx ? ' is-drag' : ''}`}
        style={dx ? { transform: `translate3d(${dx}px,0,0)` } : undefined}
        role="dialog"
        aria-label={TITLES[content] || navItem?.label || 'Menu'}
        aria-hidden={!open}
        inert={!open}
        onPointerDown={sDown}
        onPointerMove={sMove}
        onPointerUp={sUp}
        onPointerCancel={sUp}
      >
        <div className="sk-drawer-in" key={content}>
          {content === 'search' && <SearchPanel nav={MEMBER_NAV} onClose={close} />}
          {content === 'bell' && <NotificationsPanel feed={feed} onClose={close} />}
          {content === 'user' && (
            <ProfilePanel
              avatar={avatar}
              name={name}
              role={role}
              email={user?.email}
              memberId={memberId}
              tier={user?.membership_tier}
              theme={theme}
              onToggleTheme={toggle}
              onSignOut={() => (close(), setConfirmOut(true))}
              onClose={close}
            />
          )}
          {navItem && <SectionPanel item={navItem} user={user} onClose={close} onOpenFaq={openFaq} />}
        </div>
      </aside>

      <div role="main" className="sk-main" id="sk-main">
        <div className="sk-page" key={pathname}>
          {children}
        </div>
      </div>

      <MemberPopup />

      <button
        type="button"
        className={`sk-top${showTop ? ' is-on' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp size={19} strokeWidth={2} />
      </button>

      {confirmOut && (
        <ConfirmDialog title="Sign out?" message="You will be returned to the login page." confirmLabel="Sign out" onConfirm={signOut} onCancel={() => setConfirmOut(false)} />
      )}
    </>
  )
}

/* Wrapper: bawal i-copy / i-select / i-drag ang text at picture (maliban sa input fields). */
export default function MemberShell({ children }) {
  const root = useRef(null)

  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    const stop = (e) => {
      if (!typingIn(asElement(e.target))) e.preventDefault()
    }
    const noDrag = (e) => e.preventDefault()
    const events = ['selectstart', 'copy', 'cut', 'contextmenu']
    events.forEach((n) => el.addEventListener(n, stop))
    el.addEventListener('dragstart', noDrag)
    return () => {
      events.forEach((n) => el.removeEventListener(n, stop))
      el.removeEventListener('dragstart', noDrag)
    }
  }, [])

  return (
    <div className="portal px lgx" ref={root}>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </div>
  )
}

