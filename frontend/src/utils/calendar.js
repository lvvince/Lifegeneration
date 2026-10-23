// Google Calendar URL Generator & Share Helpers for Life Generation Events

/**
 * Parses time string (e.g. '10:00 AM', '2:30 PM', '18:00', '7:00pm') into 24-hr { hr, min }
 * @param {string} timeStr
 * @returns {{ hr: number, min: number } | null}
 */
export function parseEventTime(timeStr) {
  if (!timeStr) return null
  const cleaned = String(timeStr).trim()
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/i)
  if (!match) return null

  let hr = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  const meridiem = match[3] ? match[3].toUpperCase() : null

  if (meridiem === 'PM' && hr < 12) hr += 12
  if (meridiem === 'AM' && hr === 12) hr = 0

  return { hr, min }
}

/**
 * Builds a direct, free Google Calendar template URL for an event
 * Works with zero API keys or server credentials.
 * @param {Object} event
 * @param {string|number} event.id
 * @param {string} event.title
 * @param {string} event.event_date - YYYY-MM-DD
 * @param {string} [event.event_time] - e.g. '14:30' or '2:30 PM'
 * @param {string} [event.location]
 * @param {string} [event.description]
 * @returns {string} Google Calendar render URL
 */
export function getGoogleCalendarUrl(event) {
  if (!event || !event.event_date) return ''

  const dateStr = String(event.event_date).slice(0, 10)
  const parts = dateStr.split('-')
  if (parts.length < 3) return ''

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  const timeParsed = parseEventTime(event.event_time)
  let datesParam = ''

  if (timeParsed) {
    const start = new Date(year, month - 1, day, timeParsed.hr, timeParsed.min, 0)
    // Default duration is 2 hours for youth gatherings & services
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const formatGCal = (d) => {
      const yr = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      const hr = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      const sc = String(d.getSeconds()).padStart(2, '0')
      return `${yr}${mo}${da}T${hr}${mi}${sc}`
    }

    datesParam = `${formatGCal(start)}/${formatGCal(end)}`
  } else {
    // All-day event format: YYYYMMDD/YYYYMMDD (end date is day + 1)
    const startDay = new Date(year, month - 1, day)
    const nextDay = new Date(year, month - 1, day + 1)

    const formatDay = (d) => {
      const yr = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      return `${yr}${mo}${da}`
    }

    datesParam = `${formatDay(startDay)}/${formatDay(nextDay)}`
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const eventLink = event.id ? `${origin}/events/${event.id}` : ''

  const detailsArray = []
  if (event.description) detailsArray.push(event.description.trim())
  if (eventLink) detailsArray.push(`\n🔗 Event details & check-in: ${eventLink}`)
  detailsArray.push('\nLife Generation Calapan Youth Ministry')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title ? `Life Generation: ${event.title}` : 'Life Generation Gathering',
    dates: datesParam,
    details: detailsArray.join('\n'),
    location: event.location || 'Life Generation Church, Calapan City'
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Opens Google Calendar event creator in a new browser tab
 * @param {Object} event
 */
export function addToGoogleCalendar(event) {
  const url = getGoogleCalendarUrl(event)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
