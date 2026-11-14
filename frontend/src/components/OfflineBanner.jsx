import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true)
      setShowRestored(false)
    }

    function handleOnline() {
      setIsOffline(false)
      setShowRestored(true)
      const timer = setTimeout(() => {
        setShowRestored(false)
      }, 3500)
      return () => clearTimeout(timer)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline && !showRestored) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#ffffff',
        background: isOffline ? '#dc2626' : '#16a34a',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        textAlign: 'center',
        transition: 'all 0.3s ease',
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={16} aria-hidden="true" />
          <span>You are offline. Please check your internet connection.</span>
        </>
      ) : (
        <>
          <Wifi size={16} aria-hidden="true" />
          <span>Internet connection restored.</span>
        </>
      )}
    </div>
  )
}
