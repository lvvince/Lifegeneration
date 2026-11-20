import { useEffect } from 'react'

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '464887399568-1fpv2kl0l9r37gb5mtpg2553k8dg0j9j.apps.googleusercontent.com'

/** Checks if the user is in an embedded webview like Facebook Messenger or Instagram */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  return /FBAN|FBAV|Instagram|Messenger|Line|MicroMessenger/i.test(ua)
}

/** Checks if the app is running as an installed PWA (standalone mode) */
export function isStandalonePWA() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari standalone
  )
}

/** Checks if the user is on iOS Safari (not Chrome/Firefox on iOS) */
export function isIOSSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iP(ad|od|hone)/i.test(ua) &&
    /WebKit/i.test(ua) &&
    !/(CriOS|FxiOS|OPiOS|mercury)/i.test(ua)
  )
}

/* Render the official Google Sign-In button into ref. Polls until the GIS script loads. */
export function useGoogleButton(ref, { text = 'continue_with', onCredential }) {
  useEffect(() => {
    let timer
    let attempts = 0
    const MAX_WAIT = 80 // ~20 seconds at 250ms intervals before giving up
    let stopped = false

    const draw = () => {
      const el = ref.current
      if (stopped || !el) return true // stopped — bail out cleanly

      if (!window.google?.accounts?.id) {
        attempts++
        // After ~20s the script likely failed (blocked by adblocker, etc.)
        if (attempts >= MAX_WAIT) return true
        return false
      }

      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => r?.credential && onCredential(r.credential),
          itp_support: true,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          // Disable FedCM to avoid blank popup in some Chrome versions
          use_fedcm_for_prompt: false,
        })
        const w = Math.max(200, Math.min(400, Math.round(el.getBoundingClientRect().width) || 320))
        el.innerHTML = ''
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          locale: 'en',
          width: w,
        })
      } catch (e) {
        console.error('Google init error:', e)
      }
      return true
    }

    if (!draw()) {
      timer = setInterval(() => { if (draw()) clearInterval(timer) }, 250)
    }

    return () => {
      stopped = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
