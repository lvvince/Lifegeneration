import { useState, useEffect } from 'react'
import { X, Share } from 'lucide-react'

const STORAGE_KEY = 'lifegen-ios-banner-dismissed'

function detectIOSSafari() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iP(ad|od|hone)/i.test(ua)
  // Chrome on iOS has CriOS, Firefox has FxiOS — exclude those
  const isSafari = isIOS && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua)
  // Already installed as a PWA
  const isStandalone = window.navigator.standalone === true
  return isSafari && !isStandalone
}

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on iOS Safari, not already installed, not already dismissed
    if (!detectIOSSafari()) return
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed) return
    } catch (_) {}
    // Small delay so it doesn't flash on first paint
    const t = setTimeout(() => setVisible(true), 1800)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch (_) {}
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Install LifeGen"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(18, 18, 18, 0.97)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '18px 20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        animation: 'lgSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <style>{`
        @keyframes lgSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/icon-192.png"
            alt="LifeGen"
            style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
          />
          <div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Install LifeGen
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              Add to your home screen for the best experience
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Step 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#e85d04',
            display: 'grid', placeItems: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>1</span>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            Tap the{' '}
            <strong style={{ color: '#fff' }}>Share</strong>{' '}
            <Share size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
            button at the bottom of your Safari browser
          </p>
        </div>
        {/* Step 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#e85d04',
            display: 'grid', placeItems: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>2</span>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            Scroll down and tap{' '}
            <strong style={{ color: '#fff' }}>"Add to Home Screen"</strong>
          </p>
        </div>
        {/* Step 3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#e85d04',
            display: 'grid', placeItems: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>3</span>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            Tap <strong style={{ color: '#fff' }}>"Add"</strong> — LifeGen will appear on your home screen
          </p>
        </div>
      </div>

      {/* Dismiss text */}
      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '12px', color: 'rgba(255,255,255,0.4)',
          textAlign: 'center', padding: '4px 0',
        }}
      >
        Not now
      </button>
    </div>
  )
}
