// Maliit na event bus para mag-usap ang mga component nang hindi magkakabit.
// emit('announcements:seen', ids)  |  const off = on('announcements:seen', fn)
const bus = new EventTarget()

export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }))

export const on = (name, fn) => {
  const handler = (e) => fn(e.detail)
  bus.addEventListener(name, handler)
  return () => bus.removeEventListener(name, handler)
}
