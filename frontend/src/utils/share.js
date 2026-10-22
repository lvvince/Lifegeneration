// Facebook & Social Share Helpers

/**
 * Open Facebook Sharer dialog for an event
 * @param {string|number} eventId - ID of the event
 * @param {string} [title] - Optional title for the event
 */
export function shareEventOnFacebook(eventId, title = 'Life Generation Event') {
  const origin = window.location.origin
  const eventUrl = `${origin}/events/${eventId}`
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}&quote=${encodeURIComponent(title)}`

  // Open popup window in center
  const width = 620
  const height = 520
  const left = window.screen.width / 2 - width / 2
  const top = window.screen.height / 2 - height / 2

  window.open(
    shareUrl,
    'fb_share_dialog',
    `width=${width},height=${height},top=${top},left=${left},toolbar=0,status=0,menubar=0`
  )
}
