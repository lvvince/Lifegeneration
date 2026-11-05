// Facebook & Social Share Helpers

/**
 * Open Facebook Sharer dialog for an event.
 *
 * We share the backend /share/event/{id} URL instead of the frontend
 * SPA URL so that Facebook's crawler can read the server-rendered
 * Open Graph meta tags (title, description, image).
 *
 * @param {string|number} eventId - ID of the event
 * @param {string} [title]        - Fallback title (unused by FB crawler, kept for other uses)
 */
export function shareEventOnFacebook(eventId, title = 'Life Generation Event') {
  // Backend base from env, fallback to Laragon local URL
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost/LIFEGEN/backend/public').replace(/\/$/, '')

  // Backend share page — has OG meta tags + redirects browser to frontend
  const sharePageUrl = `${apiBase}/share/event/${eventId}`

  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}`

  // Open centered popup
  const width  = 620
  const height = 520
  const left   = Math.round(window.screen.width  / 2 - width  / 2)
  const top    = Math.round(window.screen.height / 2 - height / 2)

  window.open(
    shareUrl,
    'fb_share_dialog',
    `width=${width},height=${height},top=${top},left=${left},toolbar=0,status=0,menubar=0,scrollbars=0,resizable=1`
  )
}
