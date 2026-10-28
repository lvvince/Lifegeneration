/**
 * Google Maps Integration Utility for Life Generation Events
 * Zero-API key embed and navigation generator.
 */

/**
 * Checks if a location string indicates an online-only event.
 * @param {string} location
 * @returns {boolean}
 */
export function isOnlineOnly(location = '') {
  if (!location) return false
  const lower = location.toLowerCase().trim()
  const onlineKeywords = ['zoom only', 'online only', 'google meet only', 'virtual event', 'zoom meeting']
  return onlineKeywords.some((k) => lower.includes(k)) || (lower.startsWith('http') && lower.includes('zoom.us'))
}

/**
 * Cleans location text for query usage (removes Zoom mentions if mixed, e.g. "Room 1 & Zoom")
 * @param {string} location
 * @returns {string}
 */
export function cleanLocationQuery(location = '') {
  if (!location) return ''
  return location
    .replace(/\s*(&|\+|,)?\s*(zoom|google meet|online)(\s*link)?/gi, '')
    .trim() || location.trim()
}

/**
 * Extracts a valid Google Maps embed URL from either an explicit map URL,
 * an iframe embed code, or a text location/address.
 *
 * @param {string} location - Text location (e.g. "CCF Center, Pasig" or "Calapan City Hall")
 * @param {string} [mapUrl] - Optional Google Maps link or iframe embed code provided by admin
 * @returns {string|null} The URL suitable for an <iframe src="...">
 */
export function getGoogleMapEmbedUrl(location = '', mapUrl = '') {
  const custom = (mapUrl || '').trim()

  if (custom) {
    // 1. If user pasted full iframe tag: <iframe src="https://..."></iframe>
    const iframeMatch = custom.match(/src=["'](https:\/\/[^"']+)["']/i)
    if (iframeMatch && iframeMatch[1]) {
      return iframeMatch[1]
    }

    // 2. If it's already an official Google Maps embed URL
    if (custom.startsWith('https://www.google.com/maps/embed') || custom.includes('output=embed')) {
      return custom
    }

    // 3. If it contains coordinates @14.582,121.05
    const coordMatch = custom.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) {
      const lat = coordMatch[1]
      const lng = coordMatch[2]
      return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    }

    // 4. If it has /place/Place+Name in URL
    const placeMatch = custom.match(/\/place\/([^/?#]+)/)
    if (placeMatch && placeMatch[1]) {
      const placeQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
      return `https://maps.google.com/maps?q=${encodeURIComponent(placeQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    }

    // 5. If it contains q= or query= parameter
    try {
      const parsed = new URL(custom)
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query')
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
      }
    } catch (_) {}
  }

  // Fallback to location address string
  const query = cleanLocationQuery(location)
  if (!query) return null

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
}

/**
 * Returns a direct URL to open Google Maps / Get Directions on web or mobile app.
 *
 * @param {string} location
 * @param {string} [mapUrl]
 * @returns {string}
 */
export function getGoogleMapsDirectionsUrl(location = '', mapUrl = '') {
  const custom = (mapUrl || '').trim()

  if (custom) {
    // If it was an iframe string, extract the URL
    const iframeMatch = custom.match(/src=["'](https:\/\/[^"']+)["']/i)
    const targetUrl = iframeMatch ? iframeMatch[1] : custom

    // If it's a direct Google Maps or maps.app.goo.gl link, open it directly!
    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps)/i.test(targetUrl)) {
      // If it's an embed URL, convert it to a regular search URL
      if (targetUrl.includes('output=embed')) {
        try {
          const parsed = new URL(targetUrl)
          const q = parsed.searchParams.get('q')
          if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
        } catch (_) {}
      }
      return targetUrl
    }
  }

  const query = cleanLocationQuery(location) || location.trim()
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
