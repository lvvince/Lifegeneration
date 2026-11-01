/*
  Custom dropdown para sa lahat ng native <select> (walang dependency).
  - Desktop: floating menu na may animation, check mark, keyboard (↑ ↓ Enter Esc, type-ahead)
  - Phone: bottom sheet na madaling pindutin
  - Ang totoong <select> ang pinagkukunan ng value at nagpa-fire ng change, kaya gumagana ang React onChange at form.
  - Para i-skip ang isang select: data-native
*/
const SCOPE = '.portal, .px, .fc, .fc-modal, .p-modal, .au'
const CHECK = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4.5 10.5l3.6 3.6 7.4-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set

export function initSelects() {
  if (typeof document === 'undefined') return () => {}
  let menu = null, back = null, owner = null, typed = '', typedAt = 0

  const eligible = (t) => t instanceof HTMLSelectElement && !t.multiple && !t.hasAttribute('data-native') && !t.disabled && t.closest(SCOPE)

  function close(refocus = true) {
    if (!menu) return
    const m = menu, b = back, o = owner
    menu = back = owner = null
    m.classList.remove('is-in'); b?.classList.remove('is-in')
    setTimeout(() => { m.remove(); b?.remove() }, 170)
    o?.setAttribute('aria-expanded', 'false')
    if (refocus) o?.focus({ preventScroll: true })
  }

  function choose(sel, value) {
    if (sel.value !== value) {
      setter ? setter.call(sel, value) : (sel.value = value)
      sel.dispatchEvent(new Event('input', { bubbles: true }))
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    }
    close()
  }

  function open(sel) {
    if (menu && owner === sel) return close()
    close(false)
    owner = sel
    sel.setAttribute('aria-expanded', 'true')
    const sheet = window.innerWidth < 640
    const label = sel.getAttribute('aria-label') || sel.closest('label')?.textContent?.trim() || ''
    menu = document.createElement('div')
    menu.className = `fx-sel${sheet ? ' is-sheet' : ''}`
    menu.setAttribute('role', 'listbox')
    if (label) menu.setAttribute('aria-label', label)
    if (sheet) {
      back = document.createElement('div')
      back.className = 'fx-sel-back'
      back.addEventListener('pointerdown', (e) => { e.preventDefault(); close() })
      document.body.appendChild(back)
      const head = document.createElement('div')
      head.className = 'fx-sel-head'
      head.innerHTML = `<i></i>${label ? `<b></b>` : ''}`
      if (label) head.querySelector('b').textContent = label
      menu.appendChild(head)
    }
    const list = document.createElement('div')
    list.className = 'fx-sel-list'
    const add = (o, host) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'fx-opt'
      b.setAttribute('role', 'option')
      b.tabIndex = -1
      b.disabled = o.disabled
      const sel_ = o.value === sel.value
      b.setAttribute('aria-selected', sel_ ? 'true' : 'false')
      b.dataset.v = o.value
      b.innerHTML = `<span></span>${sel_ ? CHECK : ''}`
      b.firstChild.textContent = o.textContent
      b.addEventListener('click', () => choose(sel, o.value))
      host.appendChild(b)
    }
    for (const c of sel.children) {
      if (c.tagName === 'OPTGROUP') {
        const g = document.createElement('div')
        g.className = 'fx-grp'; g.textContent = c.label
        list.appendChild(g)
        for (const o of c.children) add(o, list)
      } else if (c.tagName === 'OPTION') add(c, list)
    }
    menu.appendChild(list)
    document.body.appendChild(menu)

    if (!sheet) {
      const r = sel.getBoundingClientRect()
      const below = innerHeight - r.bottom, above = r.top
      const up = below < 220 && above > below
      menu.style.minWidth = `${Math.max(r.width, 180)}px`
      menu.style.maxWidth = `${Math.min(innerWidth - 16, 380)}px`
      menu.style.left = `${Math.min(Math.max(8, r.left), innerWidth - Math.max(r.width, 180) - 8)}px`
      list.style.maxHeight = `${Math.max(140, Math.min(320, (up ? above : below) - 20))}px`
      if (up) { menu.style.bottom = `${innerHeight - r.top + 6}px`; menu.classList.add('is-up') } else menu.style.top = `${r.bottom + 6}px`
    }
    requestAnimationFrame(() => { menu?.classList.add('is-in'); back?.classList.add('is-in') })
    const cur = list.querySelector('[aria-selected="true"]') || list.querySelector('.fx-opt:not(:disabled)')
    cur?.focus({ preventScroll: true }); cur?.scrollIntoView({ block: 'nearest' })
  }

  const onMouseDown = (e) => { if (eligible(e.target)) { e.preventDefault(); e.target.focus({ preventScroll: true }) } }
  const onClick = (e) => { if (eligible(e.target)) { e.preventDefault(); open(e.target) } }
  const onKey = (e) => {
    if (menu && menu.contains(e.target)) {
      const items = [...menu.querySelectorAll('.fx-opt:not(:disabled)')]
      const i = items.indexOf(document.activeElement)
      if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)]?.focus() }
      else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
      else if (e.key === 'Tab') close(false)
      else if (e.key.length === 1) {
        const now = Date.now(); typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase(); typedAt = now
        items.find((b) => b.textContent.toLowerCase().startsWith(typed))?.focus()
      }
      return
    }
    if (eligible(e.target) && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(e.target) }
  }
  const onOutside = (e) => { if (menu && !menu.contains(e.target) && e.target !== owner) close(false) }
  const onScroll = (e) => { if (menu && !menu.contains(e.target) && !menu.classList.contains('is-sheet')) close(false) }
  const onResize = () => close(false)

  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
  return () => {
    close(false)
    document.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
  }
}
