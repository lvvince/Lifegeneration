import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Shield, User, LogOut } from 'lucide-react'
import { getUser, logout } from '../api.js'
import { useTheme } from '../useTheme.js'
import { useAuthModal } from '../context/AuthModal.jsx'
import { FacebookIcon, InstagramIcon, TikTokIcon, SOCIALS } from './home/SocialIcons.jsx'
import '../styles/home.css'

const LINKS = [
  { to: '/events', label: 'Events' },
  { to: '/dgroups', label: 'D-Groups' },
  { to: '/ministries', label: 'Ministries' },
  { to: '/prayer', label: 'Prayer Wall' },
  { to: '/give', label: 'Give' },
]

function LogoutDialog({ onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div className="lg-dialog-wrap" onClick={onCancel}>
      <div className="lg-dialog" role="dialog" aria-modal="true" aria-labelledby="lg-out-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="lg-out-title">Sign out?</h2>
        <p>You will be returned to the login page.</p>
        <div className="lg-dialog-row">
          <button type="button" className="lg-btn lg-btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="lg-btn lg-btn-danger" onClick={onConfirm} autoFocus>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getUser()
  const { theme, toggle } = useTheme()
  const { openRegister } = useAuthModal()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [askOut, setAskOut] = useState(false)

  const onHome = pathname === '/'
  const solid = !onHome || scrolled || open
  const memberId = user?.member_id || user?.member?.member_id
  const firstName = user?.full_name?.split(' ')[0] || user?.username

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const confirmLogout = () => {
    logout()
    setAskOut(false)
    setOpen(false)
    navigate('/login')
  }

  return (
    <>
      <header className={`lg-nav${solid ? ' is-solid' : ''}${open ? ' is-open' : ''}`}>
        <div className="lg-nav-bar">
          <Link to="/" className="lg-brand" aria-label="Life Generation home">
            <img src="/logo.png" alt="" />
            <span>
              Life<b>Gen</b>
            </span>
          </Link>

          <div className="lg-links" role="navigation" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={`lg-link${pathname === l.to ? ' is-active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="lg-actions">
            <button
              type="button"
              className="lg-icon-btn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="lg-chip-user">
                    <Shield size={15} /> Admin
                  </Link>
                )}
                <Link to="/dashboard" className="lg-chip-user">
                  <User size={15} /> {firstName}
                  {memberId && <small>{memberId}</small>}
                </Link>
                <button type="button" className="lg-icon-btn lg-signin" onClick={() => setAskOut(true)} aria-label="Sign out">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="lg-link lg-signin">
                  Sign in
                </Link>
                <button type="button" className="lg-btn lg-btn-primary lg-nav-join" onClick={openRegister}>
                  Join LifeGen
                </button>
              </>
            )}

            <button
              type="button"
              className="lg-menu-btn"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="lg-menu"
            >
              <span>{open ? 'Close' : 'Menu'}</span>
              <span className="lg-burger" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      {createPortal(
        <div id="lg-menu" className={`lg-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
          <div className="lg-menu-links">
            {LINKS.map((l, i) => (
              <Link key={l.to} to={l.to} style={{ '--i': i }}>
                <span>0{i + 1}</span>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="lg-menu-cta">
            {user ? (
              <>
                <Link to="/dashboard" className="lg-btn lg-btn-primary">
                  <User size={16} /> My profile {memberId ? `· ${memberId}` : ''}
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="lg-btn lg-btn-outline">
                    <Shield size={16} /> Admin
                  </Link>
                )}
                <button
                  type="button"
                  className="lg-btn lg-btn-outline"
                  onClick={() => {
                    setOpen(false)
                    setAskOut(true)
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="lg-btn lg-btn-primary"
                  onClick={() => {
                    setOpen(false)
                    openRegister()
                  }}
                >
                  Join Life Generation
                </button>
                <Link to="/login" className="lg-btn lg-btn-outline">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <div className="lg-menu-social">
            <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href={SOCIALS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <TikTokIcon />
            </a>
          </div>
        </div>,
        document.body
      )}

      {askOut && <LogoutDialog onCancel={() => setAskOut(false)} onConfirm={confirmLogout} />}
    </>
  )
}
