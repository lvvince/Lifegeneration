// Isang shared na fetch ng /api/events para hindi paulit-ulit tumawag ang search, notifications at pages.
import { apiGet } from '../api.js'
import { emit } from './bus.js'

let cache = null
let at = 0
let pending = null

export const peekEvents = () => cache || []

export function getEvents(force = false) {
  if (!force && cache && Date.now() - at < 60000) return Promise.resolve(cache)
  if (pending) return pending
  pending = apiGet('/api/events')
    .then((d) => {
      cache = Array.isArray(d) ? d : []
      at = Date.now()
      emit('events:loaded', cache)
      return cache
    })
    .catch(() => cache || [])
    .finally(() => {
      pending = null
    })
  return pending
}
