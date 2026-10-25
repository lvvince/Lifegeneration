import { useEffect } from 'react'

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '464887399568-1fpv2kl0l9r37gb5mtpg2553k8dg0j9j.apps.googleusercontent.com'

/* Ilalagay ang opisyal na Google button sa loob ng ref. Hinihintay muna na ma-load ang script. */
export function useGoogleButton(ref, { text = 'continue_with', onCredential }) {
  useEffect(() => {
    let timer
    let stopped = false
    const draw = () => {
      const el = ref.current
      if (stopped || !el || !window.google?.accounts?.id) return false
      try {
        window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => r?.credential && onCredential(r.credential) })
        const w = Math.max(200, Math.min(400, Math.round(el.getBoundingClientRect().width) || 320))
        el.innerHTML = ''
        window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text, locale: 'en', width: w })
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
