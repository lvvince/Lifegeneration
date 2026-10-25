/* Event-driven na motion: reveal-on-scroll at parallax.
   Walang polling. Gumagana lang kapag may scroll / resize / bagong element.

   Markup:
     <div data-reveal>                      -> fade + angat pagpasok sa screen
     <div data-reveal="left" data-delay="2">-> ibang direksyon / stagger (x80ms)
     <div data-depth="0.12">                -> parallax (positibo = mas mabagal, negatibo = mas mabilis)
   (Ang parent ng data-depth ang ginagamit na sukatan, kaya hindi nag-iiba-iba ang posisyon.) */
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function startMotion(root) {
  if (!root) return () => {}
  const still = reduced()
  const seen = new WeakSet()
  let layers = []
  let queued = false

  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('is-in')
                io.unobserve(e.target)
              }
            })
          },
          { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
        )
      : null

  const scan = () => {
    root.querySelectorAll('[data-reveal]').forEach((el) => {
      if (seen.has(el)) return
      seen.add(el)
      if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay)
      if (still || !io) el.classList.add('is-in')
      else io.observe(el)
    })
    layers = still ? [] : [...root.querySelectorAll('[data-depth]')]
  }

  const paint = () => {
    queued = false
    const vh = window.innerHeight
    for (const el of layers) {
      const box = (el.parentElement || el).getBoundingClientRect()
      if (box.bottom < -240 || box.top > vh + 240) continue
      const depth = parseFloat(el.dataset.depth) || 0
      const raw = (box.top + box.height / 2 - vh / 2) * depth
      const off = Math.max(-140, Math.min(140, raw))
      el.style.setProperty('--py', `${off.toFixed(1)}px`)
    }
  }
  const queue = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(paint)
  }

  const mo = new MutationObserver(() => {
    scan()
    queue()
  })
  mo.observe(root, { childList: true, subtree: true })

  scan()
  queue()
  window.addEventListener('scroll', queue, { passive: true })
  window.addEventListener('resize', queue)
  window.addEventListener('load', queue)

  return () => {
    mo.disconnect()
    io?.disconnect()
    window.removeEventListener('scroll', queue)
    window.removeEventListener('resize', queue)
    window.removeEventListener('load', queue)
  }
}
