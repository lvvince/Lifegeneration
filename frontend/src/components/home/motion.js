import { useEffect, useLayoutEffect } from 'react'

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

/**
 * Lahat ng galaw ng Home page sa iisang lugar:
 *  - reveal habang nag-i-scroll   -> [data-reveal]
 *  - parallax                      -> [data-parallax="0.2"]  (bilis; negative = kabaligtaran)
 *  - hero na nawawala sa scroll    -> [data-hero-fade]
 *  - statement na lumiliwanag      -> [data-statement] .lg-w
 *  - galaw ng hero sa cursor       -> [data-hero] (desktop na may mouse lang)
 * Hindi gumagalaw kung naka-on ang "reduce motion" sa device.
 * `key` ay palitan mo kapag may bagong content na dumating (hal. events).
 */
export function useHomeMotion(rootRef, key) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add('lg-js')
    return () => root.classList.remove('lg-js', 'is-ready')
  }, [rootRef])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reveals = [...root.querySelectorAll('[data-reveal]')]
    const words = [...root.querySelectorAll('[data-statement] .lg-w')]

    if (reduce) {
      root.classList.add('is-ready')
      reveals.forEach((el) => el.classList.add('is-in'))
      words.forEach((w) => w.classList.add('on'))
      return
    }

    const raf0 = requestAnimationFrame(() => root.classList.add('is-ready'))

    /* ---- reveal ---- */
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in')
            io.unobserve(en.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    )
    reveals.filter((el) => !el.classList.contains('is-in')).forEach((el) => io.observe(el))

    /* ---- parallax + hero + statement (isang rAF loop) ---- */
    const layers = [...root.querySelectorAll('[data-parallax]')]
    const hero = root.querySelector('[data-hero]')
    const fade = root.querySelector('[data-hero-fade]')
    const statement = root.querySelector('[data-statement]')
    let lastOn = -1
    let queued = false

    const frame = () => {
      queued = false
      const vh = window.innerHeight
      const small = window.innerWidth < 700

      layers.forEach((el) => {
        const box = el.parentElement.getBoundingClientRect()
        if (box.bottom < -250 || box.top > vh + 250) return
        const speed = parseFloat(el.dataset.parallax || '0') * (small ? 0.6 : 1)
        const offset = box.top + box.height / 2 - vh / 2
        el.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`
      })

      if (hero && fade) {
        const y = Math.max(0, -hero.getBoundingClientRect().top)
        if (y < vh * 1.2) {
          fade.style.transform = `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0)`
          fade.style.opacity = String(clamp(1 - y / (vh * 0.65), 0, 1))
        }
      }

      if (statement && words.length) {
        const r = statement.getBoundingClientRect()
        const p = clamp((vh * 0.88 - r.top) / (vh * 0.5 + r.height * 0.35), 0, 1)
        const on = Math.round(p * words.length)
        if (on !== lastOn) {
          words.forEach((w, i) => w.classList.toggle('on', i < on))
          lastOn = on
        }
      }
    }

    const request = () => {
      if (!queued) {
        queued = true
        requestAnimationFrame(frame)
      }
    }
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    request()

    /* ---- galaw sa cursor (desktop lang) ---- */
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const onMove = (e) => {
      const r = hero.getBoundingClientRect()
      hero.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
      hero.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
    }
    const onLeave = () => {
      hero.style.setProperty('--mx', '0')
      hero.style.setProperty('--my', '0')
    }
    if (hero && fine) {
      hero.addEventListener('pointermove', onMove)
      hero.addEventListener('pointerleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(raf0)
      io.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (hero && fine) {
        hero.removeEventListener('pointermove', onMove)
        hero.removeEventListener('pointerleave', onLeave)
      }
    }
  }, [rootRef, key])
}
