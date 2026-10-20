import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getUser, logout } from '../api.js'
import {
  Users, Calendar, HeartHandshake, Shield,
  LogOut, User, MessageSquare, Menu, X, Sun, Moon
} from 'lucide-react'
import { useTheme } from '../useTheme.js'

function LogoutModal({ onCancel, onConfirm }) {
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#18181f',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          padding: '24px 22px',
          width: 300,
          boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          animation: 'modalIn 0.15s ease',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', margin: '0 0 6px' }}>Sign out?</p>
        <p style={{ fontSize: '0.83rem', color: '#94a3b8', margin: '0 0 18px' }}>You'll be returned to the login page.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: 'Inter,sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '9px', borderRadius: 8,
              background: '#ef4444', border: 'none',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: 'Inter,sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const confirmLogout = () => {
    logout()
    setShowLogoutModal(false)
    setOpen(false)
    navigate('/login')
  }

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowLogoutModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const memberId = user?.member_id || user?.member?.member_id

  const navLinks = [
    { to: '/events', label: 'Events', icon: <Calendar size={15} /> },
    { to: '/dgroups', label: 'D-Groups', icon: <Users size={15} /> },
    { to: '/ministries', label: 'Ministries', icon: <HeartHandshake size={15} /> },
    { to: '/prayer', label: 'Prayer Wall', icon: <MessageSquare size={15} /> },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      height: 62,
      background: 'rgba(10,10,15,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Brand */}
      <Link to="/" style={{
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 800,
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        letterSpacing: -0.3
      }} onClick={() => setOpen(false)}>
        <img
          src="/logo.png"
          alt="Life Generation"
          style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
        />
        <span>Life<span style={{ color: '#f97316' }}>Gen</span></span>
      </Link>

      {/* Desktop Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="nav-desktop">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: isActive(link.to) ? '#fff' : '#94a3b8',
              textDecoration: 'none',
              padding: '7px 14px',
              borderRadius: 8,
              fontWeight: isActive(link.to) ? 600 : 500,
              fontSize: '0.88rem',
              background: isActive(link.to) ? 'rgba(249,115,22,0.12)' : 'transparent',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { if (!isActive(link.to)) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}}
            onMouseLeave={e => { if (!isActive(link.to)) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}

        {user?.role === 'admin' && (
          <Link to="/admin" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: isActive('/admin') ? '#f97316' : '#94a3b8',
            textDecoration: 'none',
            padding: '7px 14px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.88rem',
            background: isActive('/admin') ? 'rgba(249,115,22,0.12)' : 'transparent',
            transition: 'color 0.2s, background 0.2s',
          }}>
            <Shield size={15} /> Admin
          </Link>
        )}
      </div>

      {/* Auth / Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <Link to="/dashboard" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '6px 14px',
              borderRadius: 999,
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}>
              <User size={14} />
              {user.full_name?.split(' ')[0] || user.username}
              {memberId && (
                <span style={{
                  fontSize: '0.68rem',
                  background: 'rgba(249,115,22,0.2)',
                  color: '#fed7aa',
                  padding: '2px 7px',
                  borderRadius: 99,
                  fontFamily: 'monospace',
                  letterSpacing: '0.03em'
                }}>
                  {memberId}
                </span>
              )}
            </Link>

            <button
              onClick={() => setShowLogoutModal(true)}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                color: '#f87171',
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: 'auto',
                transition: 'background 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <LogOut size={14} /> Exit
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              padding: '7px 14px',
              transition: 'color 0.2s',
            }}>
              Sign In
            </Link>
            <Link to="/register" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #f97316, #ea6000)',
              color: '#fff',
              textDecoration: 'none',
              padding: '7px 18px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 3px 14px rgba(249,115,22,0.35)',
              transition: 'filter 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Join LifeGen
            </Link>
          </>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 999,
            background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
            color: theme === 'dark' ? '#fbbf24' : '#f97316',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'rotate(20deg) scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg) scale(1)'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="nav-hamburger"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: 6,
            width: 'auto',
          }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>


      {/* Mobile menu */}
      {open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          top: 62,
          background: 'var(--bg)',
          backdropFilter: 'blur(20px)',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          gap: 6,
        }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#fff',
                textDecoration: 'none',
                padding: '14px 16px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: '1rem',
                background: isActive(link.to) ? 'rgba(249,115,22,0.1)' : 'transparent',
                border: isActive(link.to) ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
              }}
            >
              {link.icon} {link.label}
            </Link>
          ))}
          {user ? (
            <button onClick={() => { setShowLogoutModal(true); setOpen(false) }} style={{
              marginTop: 12,
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.25)',
              color: '#f87171',
              padding: '13px 16px',
              borderRadius: 12,
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'Inter, sans-serif',
            }}>
              <LogOut size={16} /> Sign Out
            </button>
          ) : (
            <Link to="/register" onClick={() => setOpen(false)} className="btn" style={{ marginTop: 12, justifyContent: 'center', borderRadius: 12 }}>
              Join Life Generation
            </Link>
          )}
        </div>
      )}

      {/* ── LOGOUT MODAL (portal — outside nav stacking context) ── */}
      {showLogoutModal && (
        <LogoutModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}