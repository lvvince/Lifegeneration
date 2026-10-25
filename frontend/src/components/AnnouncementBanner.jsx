import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Calendar, Users, Megaphone, X, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react'
import { apiGet } from '../api.js'

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    let isMounted = true
    apiGet('/api/announcements')
      .then((data) => {
        if (!isMounted) return
        if (Array.isArray(data)) {
          setAnnouncements(data)
        }
      })
      .catch((err) => {
        // Silently fail on network/backend offline
        console.warn('Failed to load announcements:', err)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Filter out dismissed announcements
  const activeList = announcements.filter((a) => !dismissed.includes(a.id))

  if (activeList.length === 0) return null

  const current = activeList[currentIndex] || activeList[0]

  const handleDismiss = () => {
    if (!current) return
    const nextDismissed = [...dismissed, current.id]
    setDismissed(nextDismissed)
    try {
      sessionStorage.setItem('dismissed_announcements', JSON.stringify(nextDismissed))
    } catch {}

    if (currentIndex >= activeList.length - 1) {
      setCurrentIndex(0)
    }
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeList.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeList.length) % activeList.length)
  }

  // Category styles & icon
  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'urgent':
        return {
          bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          text: '#ffffff',
          badgeBg: 'rgba(255, 255, 255, 0.25)',
          badgeText: '#ffffff',
          icon: AlertCircle,
          pulse: true,
        }
      case 'event':
        return {
          bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          text: '#ffffff',
          badgeBg: 'rgba(255, 255, 255, 0.22)',
          badgeText: '#ffffff',
          icon: Calendar,
          pulse: false,
        }
      case 'ministry':
        return {
          bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          text: '#ffffff',
          badgeBg: 'rgba(255, 255, 255, 0.22)',
          badgeText: '#ffffff',
          icon: Users,
          pulse: false,
        }
      case 'general':
      default:
        return {
          bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          text: '#f8fafc',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeText: '#93c5fd',
          icon: Megaphone,
          pulse: false,
        }
    }
  }

  const theme = getCategoryTheme(current.category)
  const Icon = theme.icon

  return (
    <div
      role="alert"
      style={{
        position: 'relative',
        zIndex: 50,
        background: theme.bg,
        color: theme.text,
        padding: '10px 16px',
        fontSize: '0.88rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 300px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          >
            <Icon size={16} color="#fff" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: theme.badgeBg,
                color: theme.badgeText,
                padding: '2px 8px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {theme.pulse && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              )}
              {current.badge_text || current.category}
            </span>

            <strong style={{ fontWeight: 600 }}>{current.title}</strong>
            <span style={{ opacity: 0.9, fontSize: '0.84rem' }}>— {current.content}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {current.link_url && (
            current.link_url.startsWith('http') ? (
              <a
                href={current.link_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              >
                {current.link_text || 'Learn more'} <ArrowRight size={13} />
              </a>
            ) : (
              <Link
                to={current.link_url}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              >
                {current.link_text || 'Learn more'} <ArrowRight size={13} />
              </Link>
            )
          )}

          {activeList.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous announcement"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.75rem' }}>
                {currentIndex + 1}/{activeList.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next announcement"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            title="Dismiss announcement"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 22,
              height: 22,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
