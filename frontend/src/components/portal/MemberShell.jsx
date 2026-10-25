import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Bell, User, ArrowUp, Menu } from 'lucide-react'
import { getUser, logout } from '../../api.js'
import { useTheme } from '../../useTheme.js'
import { initials, resolveImageUrl } from '../../lib/format.js'
import { on, emit } from '../../lib/bus.js'
import { startMotion } from '../../lib/motion.js'
import { MEMBER_NAV, ADMIN_NAV } from '../../lib/memberNav.js'
import { ToastProvider, ConfirmDialog, useToast } from './ui.jsx'
import MemberPopup from './MemberPopup.jsx'
import PortalLoader from './PortalLoader.jsx'
import { useFeed } from './panels.jsx'
import { NotificationsPanel, SearchPanel, ProfilePanel, SectionPanel, MenuPanel } from './MemberPanels.jsx'

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

const TITLES = { search: 'Search', bell: 'Notifications', user: 'Account', menu: 'Menu' }

function Shell({ children }) {
  const user = getUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const NAV = isAdmin ? ADMIN_NAV : MEMBER_NAV
  const feed = useFeed(!isAdmin)
  const [panel, setPanel] = useState(null) // 'menu' | 'search' | 'bell' | 'user' | id ng page
  const [confirmOut, setConfirmOut] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [ready, setReady] = useState(false)
  const [tip, setTip] = useState(null)
  const drawer = useRef(null)
  const opener = useRef(null)
  const lastPanel = useRef(null)
  const panelRef = useRef(null)
  const swipe = useRef(null)
  const [dx, setDx] = useState(0)

  panelRef.current = panel
  if (panel) lastPanel.current = panel
  const content = panel || lastPanel.current
  const open = !!panel

  const name = user?.full_name || user?.username || 'Member'
  const role = isAdmin ? 'Admin' : user?.role === 'moderator' ? 'Moderator' : 'Member'
  const memberId = user?.member_id || user?.member?.member_id
  const home = isAdmin ? '/admin' : '/dashboard'
  const isOn = (n) =>
    n.match
      ? n.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
      : n.end
        ? pathname === n.to || pathname === `${n.to}/overview`
        : pathname === n.to || pathname.startsWith(`${n.to}/`)
  const activeIdx = NAV.findIndex(isOn)
  const onProfile = pathname.startsWith('/dashboard/profile')
  const navItem = NAV.find((n) => n.id === content)
  const current = NAV[activeIdx]

  const close = useCallback(() => {
    setPanel(null)
    setDx(0)
    const el = opener.current
    opener.current = null
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus({ preventScroll: true }))
  }, [])

  const pick = useCallback((id, el) => {
    setTip(null)
    if (panelRef.current === id) return close()
    opener.current = el || document.activeElement
    setPanel(id)
  }, [close])

  /* ---- mga event ---- */
  useEffect(() => {
    setPanel(null)
    setDx(0)
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    document.documentElement.classList.toggle('sk-loading', !ready)
    if (!ready) return undefined
    return startMotion(document.getElementById('sk-main'))
  }, [ready])
  useEffect(() => () => document.documentElement.classList.remove('sk-loading', 'sk-lock'), [])

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if (e.key === 'Escape') {
        if (panelRef.current) close()
      } else if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
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
    const t = setTimeout(() => (drawer.current?.querySelector('input:not([type=hidden])') || drawer.current)?.focus({ preventScroll: true }), 120)
    return () => clearTimeout(t)
  }, [open, content])

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
    if (pathname === '/dashboard') document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else navigate('/dashboard#faq')
  }

  // tooltip ng rail (isang element lang, hindi naco-clip kapag nag-scroll ang rail)
  const showTip = (e, label) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ label, top: r.top + r.height / 2, left: r.right + 12 })
  }

  const avatar = <Avatar user={user} name={name} />
  const railBtn = ({ id, label, children, badge, currentPage }) => (
    <button
      key={id}
      type="button"
      className={`sk-rb${panel === id ? ' is-open' : ''}${currentPage ? ' is-current' : ''}`}
      aria-label={label}
      aria-expanded={panel === id}
      aria-current={currentPage ? 'page' : undefined}
      onClick={(e) => pick(id, e.currentTarget)}
      onPointerEnter={(e) => showTip(e, label)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && showTip(e, label)}
      onBlur={() => setTip(null)}
    >
      {children}
      {badge > 0 && <i className="sk-badge">{badge > 9 ? '9+' : badge}</i>}
    </button>
  )

  return (
    <>
      {!ready && <PortalLoader onDone={() => setReady(true)} />}
      <div className="sk-progress" aria-hidden="true" />

      {/* ===== phone: top bar + menu button ===== */}
      <header className="sk-bar">
        <button type="button" className="sk-bar-btn" onClick={(e) => pick('menu', e.currentTarget)} aria-label="Open menu" aria-expanded={panel === 'menu'}>
          <Menu size={22} strokeWidth={2} />
        </button>
        <Link to={home} className="sk-bar-brand" aria-label="Life Generation home">
          <Logo className="sk-logo" />
          <span>
            LIFE <b>GEN</b>
          </span>
        </Link>
        <span className="sk-bar-page">{current?.label || (onProfile ? 'Profile' : '')}</span>
        <button type="button" className="sk-bar-btn" onClick={(e) => pick('bell', e.currentTarget)} aria-label="Notifications">
          <Bell size={21} strokeWidth={2} />
          {feed.unread > 0 && <i className="sk-badge">{feed.unread > 9 ? '9+' : feed.unread}</i>}
        </button>
      </header>

      {/* ===== laptop/tablet: icon rail ===== */}
      <aside className="sk-rail" aria-label="Quick menu">
        <Link to={home} className="sk-brand" aria-label="Life Generation home">
          <Logo className="sk-logo" />
        </Link>

        <div className="sk-rg">
          {railBtn({ id: 'search', label: 'Search pages', children: <Search size={21} strokeWidth={1.9} /> })}
          {railBtn({ id: 'bell', label: 'Notifications', badge: feed.unread, children: <Bell size={21} strokeWidth={1.9} /> })}
          {railBtn({
            id: 'user',
            label: 'Profile',
            currentPage: onProfile,
            children: user?.avatar || user?.member?.avatar ? avatar : <User size={21} strokeWidth={1.9} />,
          })}
        </div>

        <span className="sk-sep" aria-hidden="true" />

        <div role="navigation" className="sk-rg sk-rnav" aria-label="Pages" style={{ '--i': Math.max(activeIdx, 0) }}>
          <i className={`sk-ind${activeIdx < 0 ? ' is-off' : ''}`} aria-hidden="true" />
          {NAV.map(({ id, label, icon: Icon }, i) => railBtn({ id, label, currentPage: i === activeIdx, children: <Icon size={21} strokeWidth={1.9} /> }))}
        </div>
      </aside>
      {tip && (
        <div className="sk-tip" style={{ top: tip.top, left: tip.left }} role="presentation">
          {tip.label}
        </div>
      )}

      {/* ===== sidebar: nakatago, lalabas lang kapag may pinindot na icon ===== */}
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
          {content === 'menu' && (
            <MenuPanel
              nav={NAV}
              activeIdx={activeIdx}
              avatar={avatar}
              name={name}
              role={role}
              memberId={memberId}
              unread={feed.unread}
              theme={theme}
              onToggleTheme={toggle}
              onGo={(id) => setPanel(id)}
              onSignOut={() => (close(), setConfirmOut(true))}
              onClose={close}
            />
          )}
          {content === 'search' && <SearchPanel nav={NAV} onClose={close} />}
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
          {navItem && <SectionPanel item={navItem} nav={NAV} user={user} onClose={close} onOpenFaq={openFaq} />}
        </div>
      </aside>

      <div role="main" className={`sk-main${isAdmin ? ' is-admin' : ''}`} id="sk-main">
        <div className="sk-page" key={pathname}>
          {children}
        </div>
      </div>

      {ready && !isAdmin && <MemberPopup />}

      <button
        type="button"
        className={`sk-top${showTop ? ' is-on' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp size={20} strokeWidth={2.2} />
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
