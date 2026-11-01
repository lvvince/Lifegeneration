import { useEffect, useRef, useState } from 'react'
import { prefersReduced } from '../../lib/fx.js'

/* Number rolling: nagbibilang paakyat kapag nakita na sa screen. Pinapanatili ang prefix/suffix (₱, %). */
export function Roll({ value, duration = 900 }) {
  const str = String(value ?? '')
  const m = str.match(/^(\D*?)(-?[\d,]+(?:\.\d+)?)(.*)$/)
  const ref = useRef(null)
  const [shown, setShown] = useState(m && !prefersReduced() ? 0 : null)
  const target = m ? Number(m[2].replace(/,/g, '')) : 0
  const dec = m && m[2].includes('.') ? m[2].split('.')[1].length : 0

  useEffect(() => {
    if (!m || prefersReduced() || !Number.isFinite(target)) { setShown(null); return undefined }
    let raf = 0
    const go = () => {
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p) // easeOutExpo
        setShown(target * e)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); go() } })
    if (ref.current) io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [str]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!m || shown === null) return <span ref={ref}>{str}</span>
  const n = shown.toLocaleString('en-PH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return <span ref={ref} aria-label={str}><span aria-hidden="true">{m[1]}{n}{m[3]}</span></span>
}

export default Roll
