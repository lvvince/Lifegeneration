import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Film, Play, Pause } from 'lucide-react'
import { MEDIA } from '../../lib/mediaSlots.js'

/* Picture / video slot na may placeholder.
   <MediaSlot slot="hero" />                 -> kinukuha ang path sa lib/mediaSlots.js
   <MediaSlot src="/uploads/x.webp" />       -> sariling path (hal. banner ng event)
   Kapag walang file o hindi nag-load, placeholder ang ipinapakita (hindi nabibitak ang layout).
   Video: may poster + play button. Awtomatikong humihinto kapag wala na sa screen o nakatago ang tab. */
export default function MediaSlot({ slot, src, poster, kind, label, ratio, hint, alt = '', className = '', children }) {
  const cfg = (slot && MEDIA[slot]) || {}
  const type = kind || cfg.kind || 'image'
  const file = src || cfg.src
  const cover = poster || cfg.poster
  const name = label || cfg.label || 'media.webp'
  const [ok, setOk] = useState(false)
  const [bad, setBad] = useState(!file)
  const [playing, setPlaying] = useState(false)
  const vid = useRef(null)
  const box = useRef(null)

  useEffect(() => {
    setOk(false)
    setBad(!file)
    setPlaying(false)
  }, [file])

  // video: huminto kapag lumabas sa screen o nag-hide ang tab
  useEffect(() => {
    if (type !== 'video' || !box.current) return undefined
    const stop = () => vid.current && !vid.current.paused && vid.current.pause()
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && stop(), { threshold: 0.25 })
    io.observe(box.current)
    const onVis = () => document.visibilityState !== 'visible' && stop()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [type])

  const toggle = () => {
    const v = vid.current
    if (!v) return
    if (v.paused) v.play().catch(() => setBad(true))
    else v.pause()
  }

  const showPlaceholder = bad || (type === 'image' && !ok)
  const Icon = type === 'video' ? Film : ImageIcon

  return (
    <div
      ref={box}
      className={`sk-media is-${type}${ok ? ' is-ready' : ''}${bad ? ' is-empty' : ''}${playing ? ' is-playing' : ''} ${className}`}
      style={{ '--ratio': ratio || cfg.ratio || '16 / 10' }}
    >
      {showPlaceholder && (
        <div className="sk-media-ph" aria-hidden={!bad}>
          <span className="sk-media-ico">
            <Icon size={22} strokeWidth={1.6} />
          </span>
          {bad && (
            <>
              <b>{name}</b>
              <small>{hint || cfg.hint || (type === 'video' ? 'Drop your .mp4 in public/media' : 'Drop your .webp in public/media')}</small>
            </>
          )}
        </div>
      )}

      {!bad && type === 'image' && (
        <img src={file} alt={alt} loading="lazy" draggable="false" onLoad={() => setOk(true)} onError={() => setBad(true)} />
      )}

      {!bad && type === 'video' && (
        <>
          <video
            ref={vid}
            src={file}
            poster={cover}
            playsInline
            loop
            muted
            preload="metadata"
            disablePictureInPicture
            controlsList="nodownload noplaybackrate noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
            onLoadedData={() => setOk(true)}
            onError={() => setBad(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {ok && (
            <button type="button" className="sk-media-play" onClick={toggle} aria-label={playing ? 'Pause video' : 'Play video'}>
              <span>{playing ? <Pause size={22} /> : <Play size={22} />}</span>
            </button>
          )}
        </>
      )}
      {children}
    </div>
  )
}
