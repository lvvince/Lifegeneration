import { useEffect } from 'react'

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '464887399568-1fpv2kl0l9r37gb5mtpg2553k8dg0j9j.apps.googleusercontent.com'

/** Checks if the user is in an embedded webview like Facebook Messenger or Instagram */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  return /FBAN|FBAV|Instagram|Messenger|Line|MicroMessenger/i.test(ua)
}

/* Ilalagay ang opisyal na Google button sa loob ng ref. Hinihintay muna na ma-load ang script. */
export function useGoogleButton(ref, { text = 'continue_with', onCredential }) {
  useEffect(() => {
    let timer
    let stopped = false
    const draw = () => {
      const el = ref.current
      if (stopped || !el || !window.google?.accounts?.id) return false
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => r?.credential && onCredential(r.credential),
          itp_support: true,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
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
      timer = setInterval(() => draw() && clearInterval(timer), 250)
    }
    return () => {
      stopped = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
