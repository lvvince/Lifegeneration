import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  MapPin,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  Zap
} from 'lucide-react'
import { apiGet, apiPost, apiRequest, API_URL, getUser } from '../api.js'
import { useToast } from '../components/portal/ui.jsx'
import '../styles/social.css'

/* ─── Helpers ─────────────────────────────────────────────── */
const photoUrl = (p) => {
  if (!p) return ''
  const str = String(p).trim()
  if (/^(https?:|data:|blob:)/i.test(str)) return str
  return `${API_URL.replace(/\/+$/, '')}/${str.replace(/^\/+/, '')}`
}

const parseManilaDate = (dt) => {
  if (!dt) return null
  let s = String(dt).trim().replace(' ', 'T')
  if (!/[Z+-]\d*(:?\d*)?$/i.test(s) && !s.endsWith('Z')) {
    s += '+08:00'
  }
  const d = new Date(s)
  return isNaN(d) ? null : d
}

const formatDateTime = (dt) => {
  if (!dt) return ''
  const d = parseManilaDate(dt)
  if (!d) return dt
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  })
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const d = parseManilaDate(dateStr)
  if (!d) return dateStr
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Resize and compress large mobile photos client-side before upload.
 * Animated GIFs are kept untouched.
 */
const compressImageFile = (file, maxDim = 1600, quality = 0.82) => new Promise((resolve) => {
  if (!file || file.type === 'image/gif' || file.size <= 400 * 1024) {
    return resolve(file)
  }
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    URL.revokeObjectURL(url)
    let { width, height } = img
    if (width <= maxDim && height <= maxDim && file.size <= 1.2 * 1024 * 1024) {
      return resolve(file)
    }
    const scale = Math.min(1, maxDim / Math.max(width, height))
    width = Math.round(width * scale)
    height = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return resolve(file)
    ctx.drawImage(img, 0, 0, width, height)

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    canvas.toBlob((blob) => {
      if (!blob || blob.size >= file.size) return resolve(file)
      const ext = outType === 'image/png' ? '.png' : '.jpg'
      const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '')
      resolve(new File([blob], `${baseName}${ext}`, { type: outType, lastModified: Date.now() }))
    }, outType, quality)
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    resolve(file)
  }
  img.src = url
})

const CATEGORY_META = {
  event:   { label: 'Fellowship', Icon: CalendarDays, color: 'is-event' },
  verse:   { label: 'Scripture',  Icon: BookOpen,     color: 'is-verse' },
  general: { label: 'Community',  Icon: Zap,          color: 'is-general' }
}

/* ─── Avatar ──────────────────────────────────────────────── */
function Avatar({ src, name, size = 40, className = '' }) {
  return src ? (
    <img src={photoUrl(src)} alt={name} className={`sh-avatar ${className}`} style={{ width: size, height: size }} />
  ) : (
    <div className={`sh-avatar sh-avatar-fallback ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  )
}

/* ─── Photo Lightbox (Full-Screen Maximize Viewer) ────────── */
function PhotoLightbox({ images = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef(null)

  const handlePrev = useCallback(() => {
    setIndex(i => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setIndex(i => (i + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && images.length > 1) handlePrev()
      else if (e.key === 'ArrowRight' && images.length > 1) handleNext()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [images.length, onClose, handlePrev, handleNext])

  // Mobile swipe gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || images.length <= 1) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
    touchStartX.current = null
  }

  if (!images || images.length === 0) return null

  const current = images[index]
  const currentUrl = photoUrl(current)

  return createPortal(
    <div
      className="sh-lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="sh-lightbox-content" onClick={e => e.stopPropagation()}>
        {/* Top bar with counter & actions */}
        <div className="sh-lightbox-topbar">
          <span className="sh-lightbox-count">
            {images.length > 1 ? `${index + 1} / ${images.length}` : 'Photo View'}
          </span>
          <div className="sh-lightbox-actions">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sh-lightbox-btn"
              title="Open full size in new tab"
            >
              <ExternalLink size={18} />
            </a>
            <button
              type="button"
              className="sh-lightbox-btn"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Previous navigation button */}
        {images.length > 1 && (
          <button
            type="button"
            className="sh-lightbox-nav is-prev"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Main maximized photo */}
        <div className="sh-lightbox-img-wrap">
          <img
            src={currentUrl}
            alt={`Photo ${index + 1}`}
            className="sh-lightbox-img"
          />
        </div>

        {/* Next navigation button */}
        {images.length > 1 && (
          <button
            type="button"
            className="sh-lightbox-nav is-next"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            aria-label="Next photo"
          >
            <ChevronRight size={28} />
          </button>
        )}

        {/* Bottom thumbnail strip */}
        {images.length > 1 && (
          <div className="sh-lightbox-strip">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                className={`sh-lightbox-thumb ${i === index ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setIndex(i)
                }}
              >
                <img src={photoUrl(img)} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ─── Post Card ───────────────────────────────────────────── */
function PostCard({ post, user, highlighted, onReact, onRsvp, onEdit, onDelete, onShare, onOpenLightbox }) {
  const [commentsOpen, setCommentsOpen]       = useState(false)
  const [comments, setComments]               = useState(null)
  const [commentsCount, setCommentsCount]     = useState(post.comments_count || 0)
  const [commentText, setCommentText]         = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [menuOpen, setMenuOpen]               = useState(false)
  const toast                                 = useToast()
  const menuRef                               = useRef(null)
  const meta                                  = CATEGORY_META[post.category] || CATEGORY_META.general
  const { Icon: CatIcon } = meta

  const postImages = useMemo(() => {
    if (Array.isArray(post.images) && post.images.length > 0) return post.images
    if (post.image) return [post.image]
    return []
  }, [post.images, post.image])

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const loadComments = async () => {
    if (comments !== null) return
    try {
      const res = await apiGet(`/api/social/posts/${post.id}/comments`)
      setComments(Array.isArray(res) ? res : [])
    } catch {
      toast('Failed to load comments.', 'bad')
    }
  }

  const toggleComments = async () => {
    if (!commentsOpen) await loadComments()
    setCommentsOpen(v => !v)
  }

  const submitComment = async () => {
    const text = commentText.trim()
    if (!text || !user) return
    setSubmitting(true)
    try {
      const res = await apiPost('/api/social/comment', { id: post.id, body: text })
      setComments(prev => [...(prev || []), {
        id: res.id, author_name: res.author_name, author_avatar: res.author_avatar,
        body: res.body, created_at: res.created_at, is_mine: true
      }])
      setCommentText('')
      setCommentsCount(res.comments_count || (c => c + 1))
    } catch (err) {
      toast(err.message || 'Could not post comment.', 'bad')
    } finally { setSubmitting(false) }
  }

  const deleteComment = async (commId) => {
    try {
      await apiPost('/api/social/comments/delete', { id: commId })
      setComments(prev => prev.filter(c => c.id !== commId))
      setCommentsCount(c => Math.max(0, c - 1))
    } catch (err) { toast(err.message || 'Could not delete comment.', 'bad') }
  }

  const canManage = post.is_mine || user?.role === 'admin' || user?.role === 'officer'
  const safeEventLink = post.event_link && /^https?:\/\//i.test(post.event_link.trim()) ? post.event_link.trim() : ''

  return (
    <article id={`sh-post-${post.id}`} className={`sh-card ${highlighted ? 'is-highlighted' : ''}`}>
      {/* ── Header row ── */}
      <div className="sh-card-header">
        <div className="sh-author-row">
          <Avatar src={post.author_avatar} name={post.author_name} size={42} />
          <div className="sh-author-info">
            <span className="sh-author-name">{post.author_name}</span>
            <span className="sh-post-time">{timeAgo(post.created_at)}</span>
          </div>
        </div>

        <div className="sh-header-right">
          <span className={`sh-tag ${meta.color}`}>
            <CatIcon size={12} />
            {meta.label}
          </span>

          {canManage && (
            <div className="sh-menu-wrap" ref={menuRef}>
              <button type="button" className="sh-icon-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Post options">
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div className="sh-dropdown">
                  <button type="button" className="sh-dropdown-item" onClick={() => { setMenuOpen(false); onEdit(post) }}>
                    <Pencil size={14} /> Edit Post
                  </button>
                  <button type="button" className="sh-dropdown-item is-danger" onClick={() => { setMenuOpen(false); onDelete(post) }}>
                    <Trash2 size={14} /> Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Event block ── */}
      {post.category === 'event' && (
        <div className="sh-event-box">
          <div className="sh-event-title-row">
            <h3 className="sh-event-title">{post.event_title}</h3>
            {post.event_type && <span className="sh-event-subbadge">{post.event_type}</span>}
          </div>

          <div className="sh-event-details-grid">
            {post.event_date && (
              <div className="sh-event-detail-item">
                <Clock size={14} />
                <span>{formatDateTime(post.event_date)}</span>
              </div>
            )}
            {post.event_location && (
              <div className="sh-event-detail-item">
                <MapPin size={14} />
                <span>{post.event_location}</span>
              </div>
            )}
            {safeEventLink && (
              <div className="sh-event-detail-item">
                <Link2 size={14} />
                <a href={safeEventLink} target="_blank" rel="noreferrer" className="sh-event-link">
                  Join Online <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>

          {/* RSVP */}
          <div className="sh-rsvp-row">
            <div className="sh-rsvp-actions">
              <button type="button" className={`sh-rsvp-btn is-going ${post.my_rsvp === 'going' ? 'is-on' : ''}`} onClick={() => onRsvp(post, 'going')}>
                <CalendarCheck size={14} />
                Going {post.going_count > 0 && <span className="sh-rsvp-count">{post.going_count}</span>}
              </button>
              <button type="button" className={`sh-rsvp-btn is-interested ${post.my_rsvp === 'interested' ? 'is-on' : ''}`} onClick={() => onRsvp(post, 'interested')}>
                Interested {post.interested_count > 0 && <span className="sh-rsvp-count">{post.interested_count}</span>}
              </button>
            </div>

            {post.attendees?.length > 0 && (
              <div className="sh-attendees-strip">
                <div className="sh-attendee-stack">
                  {post.attendees.slice(0, 4).map((a, i) =>
                    <Avatar key={i} src={a.avatar} name={a.user_name} size={22} className="sh-att-av" />
                  )}
                </div>
                <span>{post.going_count} {post.going_count === 1 ? 'going' : 'going'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Verse block ── */}
      {post.category === 'verse' && (post.verse_text || post.verse_reference) && (
        <div className="sh-verse-box">
          <div className="sh-verse-mark"><BookOpen size={80} /></div>
          {post.verse_text && <blockquote className="sh-verse-quote">"{post.verse_text}"</blockquote>}
          {post.verse_reference && (
            <div className="sh-verse-ref">
              <Sparkles size={12} /> {post.verse_reference}
            </div>
          )}
        </div>
      )}

      {/* ── Body text ── */}
      {post.body && <p className="sh-post-body">{post.body}</p>}

      {/* ── Attached photo(s) & galleries with maximize support ── */}
      {postImages.length === 1 && (
        <div
          className="sh-post-img-wrap"
          onClick={() => onOpenLightbox(postImages, 0)}
          title="Click to view full photo"
        >
          <img
            src={photoUrl(postImages[0])}
            alt="Post attachment"
            className="sh-post-img"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const wrap = e.currentTarget.parentElement
              if (wrap && !wrap.querySelector('.sh-img-fallback')) {
                const msg = document.createElement('div')
                msg.className = 'sh-img-fallback'
                msg.textContent = 'Photo unavailable (external host unreachable)'
                msg.style.cssText = 'padding:18px 14px;text-align:center;font-size:12.5px;opacity:0.7;'
                wrap.appendChild(msg)
              }
            }}
          />
          <div className="sh-img-zoom-hint" aria-hidden="true">
            <Maximize2 size={16} />
          </div>
        </div>
      )}

      {postImages.length === 2 && (
        <div className="sh-post-gallery is-grid-2">
          {postImages.map((img, i) => (
            <div
              key={i}
              className="sh-gallery-item"
              onClick={() => onOpenLightbox(postImages, i)}
              title="Click to view photo"
            >
              <img src={photoUrl(img)} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <div className="sh-img-zoom-hint" aria-hidden="true"><Maximize2 size={15} /></div>
            </div>
          ))}
        </div>
      )}

      {postImages.length === 3 && (
        <div className="sh-post-gallery is-grid-3">
          {postImages.map((img, i) => (
            <div
              key={i}
              className={`sh-gallery-item is-item-${i}`}
              onClick={() => onOpenLightbox(postImages, i)}
              title="Click to view photo"
            >
              <img src={photoUrl(img)} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <div className="sh-img-zoom-hint" aria-hidden="true"><Maximize2 size={15} /></div>
            </div>
          ))}
        </div>
      )}

      {postImages.length >= 4 && (
        <div className="sh-post-gallery is-grid-4">
          {postImages.slice(0, 4).map((img, i) => {
            const isFourth = i === 3
            const extraCount = postImages.length - 4
            return (
              <div
                key={i}
                className="sh-gallery-item"
                onClick={() => onOpenLightbox(postImages, i)}
                title="Click to view photo"
              >
                <img src={photoUrl(img)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                {isFourth && extraCount > 0 ? (
                  <div className="sh-gallery-more">+{extraCount}</div>
                ) : (
                  <div className="sh-img-zoom-hint" aria-hidden="true"><Maximize2 size={15} /></div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="sh-action-bar">
        <div className="sh-action-left">
          <button type="button" className={`sh-act-btn ${post.i_liked ? 'is-on' : ''}`} onClick={() => onReact(post)}>
            <Heart size={16} fill={post.i_liked ? 'currentColor' : 'none'} />
            <span>{post.likes_count > 0 ? post.likes_count : ''} Amen</span>
          </button>
          <button type="button" className={`sh-act-btn ${commentsOpen ? 'is-on' : ''}`} onClick={toggleComments}>
            <MessageCircle size={16} />
            <span>{commentsCount > 0 ? commentsCount : ''} Comment{commentsCount !== 1 ? 's' : ''}</span>
          </button>
        </div>
        <button type="button" className="sh-act-btn is-share" onClick={() => onShare(post)}>
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>

      {/* ── Inline comments ── */}
      {commentsOpen && (
        <div className="sh-comments-section">
          {/* Input */}
          <div className="sh-comment-compose">
            <Avatar src={user?.avatar} name={user?.first_name || user?.name} size={32} />
            <div className="sh-comment-input-wrap">
              <input
                type="text"
                className="sh-comment-input"
                placeholder="Write an encouraging comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submitComment() }}
              />
              <button
                type="button"
                className="sh-comment-send"
                disabled={submitting || !commentText.trim()}
                onClick={submitComment}
                aria-label="Send comment"
                title="Send comment"
              >
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="sh-comments-list">
            {!comments ? (
              <div className="sh-comments-loading"><RefreshCw size={14} className="animate-spin" /> Loading…</div>
            ) : comments.length === 0 ? (
              <div className="sh-comments-empty">
                <MessageCircle size={15} style={{ opacity: 0.75, flexShrink: 0 }} />
                <span>No comments yet — be the first to encourage!</span>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="sh-comment-item">
                  <Avatar src={c.author_avatar} name={c.author_name} size={30} />
                  <div className="sh-comm-bubble">
                    <div className="sh-comm-meta">
                      <span className="sh-comm-name">{c.author_name}</span>
                      <span className="sh-comm-dot">•</span>
                      <span className="sh-comm-time">{timeAgo(c.created_at)}</span>
                      {(c.is_mine || post.is_mine || user?.role === 'admin' || user?.role === 'officer') && (
                        <button
                          type="button"
                          className="sh-comm-del"
                          title="Delete comment"
                          aria-label="Delete comment"
                          onClick={() => deleteComment(c.id)}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <p className="sh-comm-text">{c.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </article>
  )
}

/* ─── Custom Select Dropdown (avoids native browser arrow bugs) ─── */
const EVENT_TYPES = [
  'Fellowship Gathering',
  'Group Bible Study',
  'Youth Hangout',
  'Prayer & Worship Night',
  'Coffee & Devotion',
  'Community Outreach',
]

function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])
  return (
    <div className="sh-custom-select" ref={ref}>
      <button
        type="button"
        className="sh-custom-select-btn"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDown size={16} className={`sh-custom-select-icon ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <ul className="sh-custom-select-menu" role="listbox">
          {options.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              className={`sh-custom-select-opt ${opt === value ? 'is-on' : ''}`}
              onMouseDown={() => { onChange(opt); setOpen(false) }}
            >
              {opt === value && <Check size={13} />} {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─── Compose / Edit Modal ────────────────────────────────── */
function ComposeModal({ open, initialCategory = 'general', editingPost = null, quickVerses, onClose, onSuccess }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const isEditing = Boolean(editingPost?.id)
  const [category, setCategory]       = useState(initialCategory)
  const [submitting, setSubmitting]   = useState(false)
  const [existingImages, setExistingImages] = useState([])
  const [imageFiles, setImageFiles]   = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  const [form, setForm] = useState({
    body: '', event_title: '', event_type: 'Fellowship Gathering',
    event_date: '', event_location: '', event_link: '',
    verse_reference: '', verse_text: '', image_url: ''
  })

  useEffect(() => {
    if (!open) return
    if (editingPost) {
      setCategory(editingPost.category || 'general')
      const dtLocal = editingPost.event_date
        ? String(editingPost.event_date).replace(' ', 'T').slice(0, 16)
        : ''
      setForm({
        body: editingPost.body || '',
        event_title: editingPost.event_title || '',
        event_type: editingPost.event_type || 'Fellowship Gathering',
        event_date: dtLocal,
        event_location: editingPost.event_location || '',
        event_link: editingPost.event_link || '',
        verse_reference: editingPost.verse_reference || '',
        verse_text: editingPost.verse_text || '',
        image_url: ''
      })
      const existing = Array.isArray(editingPost.images) && editingPost.images.length > 0
        ? editingPost.images
        : (editingPost.image ? [editingPost.image] : [])
      setExistingImages(existing)
      setImageFiles([])
    } else {
      setCategory(initialCategory)
      setForm({
        body: '', event_title: '', event_type: 'Fellowship Gathering',
        event_date: '', event_location: '', event_link: '',
        verse_reference: '', verse_text: '', image_url: ''
      })
      setExistingImages([])
      setImageFiles([])
    }
  }, [open, initialCategory, editingPost])

  // Track dark mode changes
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.dataset.theme === 'dark')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Generate previews whenever imageFiles changes
  useEffect(() => {
    const urls = imageFiles.map(f => URL.createObjectURL(f))
    setImagePreviews(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [imageFiles])

  if (!open) return null

  const totalPhotosCount = existingImages.length + imageFiles.length

  const reset = () => {
    setForm({ body: '', event_title: '', event_type: 'Fellowship Gathering', event_date: '', event_location: '', event_link: '', verse_reference: '', verse_text: '', image_url: '' })
    setExistingImages([])
    setImageFiles([])
    setImagePreviews([])
  }

  const addFiles = async (files) => {
    if (!files || files.length === 0) return
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (incoming.length === 0) return toast('Please attach valid JPG, PNG, or WEBP images.', 'bad')

    const slotsLeft = Math.max(0, 10 - totalPhotosCount)
    if (slotsLeft === 0) return toast('Maximum 10 photos per post.', 'bad')

    const valid = []
    for (const f of incoming.slice(0, slotsLeft)) {
      if (f.size > 15 * 1024 * 1024) {
        toast(`"${f.name}" is over 15 MB and was skipped.`, 'bad')
      } else {
        const compressed = await compressImageFile(f)
        valid.push(compressed)
      }
    }
    if (incoming.length > slotsLeft) {
      toast('Maximum 10 photos per post.', 'bad')
    }
    if (valid.length === 0) return
    setImageFiles(prev => [...prev, ...valid].slice(0, Math.max(0, 10 - existingImages.length)))
  }

  const removeExisting = (idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  const removeFile = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const fetchRandomVerse = async () => {
    try {
      const res = await apiGet('/api/devotional/random')
      if (res?.reference) {
        setForm(p => ({ ...p, verse_reference: res.reference, verse_text: res.verse || res.text || '', body: p.body || res.reflection || `Pondering ${res.reference} today.` }))
        toast(`Inserted ${res.reference}!`, 'good')
      }
    } catch { toast('Could not fetch a random verse.', 'bad') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const endpoint = isEditing ? '/api/social/update' : '/api/social/posts'
      let opts = {}
      if (imageFiles.length > 0) {
        const fd = new FormData()
        if (isEditing) {
          fd.append('id', editingPost.id)
          fd.append('existing_images', JSON.stringify(existingImages))
        }
        fd.append('category', category)
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        imageFiles.forEach(f => fd.append('images[]', f))
        opts = { body: fd }
      } else {
        const payload = isEditing
          ? { id: editingPost.id, category, existing_images: existingImages, ...form }
          : { category, ...form }
        opts = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      }
      await apiRequest(endpoint, { method: 'POST', ...opts })
      reset()
      onClose()
      onSuccess()
      toast(isEditing ? 'Post updated!' : 'Post published to Life Hub!', 'good')
    } catch (err) {
      toast(err.message || (isEditing ? 'Failed to update post.' : 'Failed to publish post.'), 'bad')
    } finally { setSubmitting(false) }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const CATS = [
    { id: 'general', label: 'Encouragement', Icon: Zap },
    { id: 'event',   label: 'Fellowship',    Icon: CalendarDays },
    { id: 'verse',   label: 'Scripture',     Icon: BookOpen }
  ]

  return createPortal(
    <div className="sh-backdrop" onClick={onClose}>
      <div className="sh-modal" data-sh-dark={isDark ? 'true' : undefined} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="sh-modal-header">
          <h3 className="sh-modal-title"><Pencil size={18} /> {isEditing ? 'Edit Post' : 'New Post'}</h3>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sh-modal-body">
            {/* Category switcher */}
            <div className="sh-cat-tabs">
              {CATS.map(c => (
                <button key={c.id} type="button" className={`sh-cat-tab ${category === c.id ? 'is-on' : ''}`} onClick={() => setCategory(c.id)}>
                  <c.Icon size={15} /> {c.label}
                </button>
              ))}
            </div>

            {/* Event fields */}
            {category === 'event' && (
              <>
                <div className="sh-field">
                  <label className="sh-label">Event Title *</label>
                  <input className="sh-input" placeholder="e.g. Friday Youth Fellowship & Worship Night" value={form.event_title} onChange={e => setF('event_title', e.target.value)} required />
                </div>
                <div className="sh-row">
                  <div className="sh-field">
                    <label className="sh-label">Event Type</label>
                    <CustomSelect
                      value={form.event_type}
                      onChange={v => setF('event_type', v)}
                      options={EVENT_TYPES}
                    />
                  </div>
                  <div className="sh-field">
                    <label className="sh-label">Date &amp; Time</label>
                    <input type="datetime-local" className="sh-input sh-date-input" value={form.event_date} onChange={e => setF('event_date', e.target.value)} />
                  </div>
                </div>
                <div className="sh-row">
                  <div className="sh-field">
                    <label className="sh-label">Location</label>
                    <input className="sh-input" placeholder="Church Annex Room 204 or Zoom" value={form.event_location} onChange={e => setF('event_location', e.target.value)} />
                  </div>
                  <div className="sh-field">
                    <label className="sh-label">Online Link</label>
                    <input type="url" className="sh-input" placeholder="https://meet.google.com/..." value={form.event_link} onChange={e => setF('event_link', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* Verse fields */}
            {category === 'verse' && (
              <>
                <div className="sh-field">
                  <div className="sh-field-row-label">
                    <label className="sh-label" style={{ margin: 0 }}>Scripture Reference *</label>
                    <button type="button" className="sh-text-btn" onClick={fetchRandomVerse}><RefreshCw size={12} /> Random</button>
                  </div>
                  <input className="sh-input" placeholder="e.g. Philippians 4:13" value={form.verse_reference} onChange={e => setF('verse_reference', e.target.value)} required />
                </div>
                <div className="sh-field">
                  <label className="sh-label">Verse Text</label>
                  <textarea className="sh-textarea" rows={3} placeholder="Paste the verse here…" value={form.verse_text} onChange={e => setF('verse_text', e.target.value)} />
                </div>
                {quickVerses.length > 0 && (
                  <div className="sh-quick-verses">
                    <span className="sh-quick-label">Popular verses:</span>
                    <div className="sh-quick-list">
                      {quickVerses.slice(0, 6).map((qv, i) => (
                        <button key={i} type="button" className="sh-verse-chip" onClick={() => setForm(p => ({ ...p, verse_reference: qv.reference, verse_text: qv.text, body: p.body || `Reflecting on ${qv.reference}: "${qv.text}"` }))}>{qv.reference}</button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Body textarea */}
            <div className="sh-field">
              <label className="sh-label">
                {category === 'event' ? 'Invitation Message' : category === 'verse' ? 'Your Reflection / Prayer' : 'Your Message *'}
              </label>
              <textarea
                className="sh-textarea sh-textarea-main"
                rows={4}
                placeholder={
                  category === 'event' ? "What to bring, who's welcome, agenda…" :
                  category === 'verse'  ? 'What did God speak to you through this verse today?' :
                                          'Share what God has done or encourage the community…'
                }
                value={form.body}
                onChange={e => setF('body', e.target.value)}
                required={category === 'general'}
              />
            </div>

            {/* Image upload — existing + new multi-photo preview gallery */}
            {totalPhotosCount > 0 ? (
              <div className="sh-compose-gallery">
                {existingImages.map((imgPath, idx) => (
                  <div key={`ex-${idx}`} className="sh-compose-thumb">
                    <img src={photoUrl(imgPath)} alt={`Existing ${idx + 1}`} />
                    <button
                      type="button"
                      className="sh-compose-thumb-del"
                      title="Remove photo"
                      aria-label="Remove photo"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeExisting(idx)
                      }}
                    >
                      <X size={13} strokeWidth={2.8} />
                    </button>
                  </div>
                ))}
                {imagePreviews.map((previewUrl, idx) => (
                  <div key={`new-${idx}`} className="sh-compose-thumb">
                    <img src={previewUrl} alt={`Upload ${idx + 1}`} />
                    <button
                      type="button"
                      className="sh-compose-thumb-del"
                      title="Remove photo"
                      aria-label="Remove photo"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(idx)
                      }}
                    >
                      <X size={13} strokeWidth={2.8} />
                    </button>
                  </div>
                ))}
                {totalPhotosCount < 10 && (
                  <button
                    type="button"
                    className="sh-compose-add-tile"
                    onClick={() => fileRef.current?.click()}
                    title="Add more photos"
                  >
                    <Plus size={18} />
                    <span>Add photo</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                className="sh-upload-zone"
                onClick={() => fileRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
                onDragOver={e => e.preventDefault()}
              >
                <ImageIcon size={22} />
                <span>Add photos — click or drag &amp; drop</span>
                <small>JPEG / PNG / WEBP · up to 10 photos (auto-compressed for mobile)</small>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }}
            />
          </div>

          <div className="sh-modal-footer">
            <button type="button" className="sh-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sh-btn-primary" disabled={submitting}>
              {submitting
                ? <><RefreshCw size={14} className="animate-spin" /> {isEditing ? 'Saving…' : 'Publishing…'}</>
                : (isEditing ? 'Save Changes' : 'Publish Post')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ─── Share Modal ─────────────────────────────────────────── */
function ShareModal({ post, onClose, toast }) {
  const [copied, setCopied] = useState(false)
  const isEvent = post.category === 'event'
  const isVerse = post.category === 'verse'
  const shareUrl = `${window.location.origin}/social?post=${post.id}`

  const msgText = useMemo(() => {
    if (isEvent) return `You're Invited: ${post.event_title}\nDate: ${post.event_date ? formatDateTime(post.event_date) : 'TBA'}\n${post.event_location ? `Location: ${post.event_location}\n` : ''}${post.body ? `\n"${post.body}"\n` : ''}\nRSVP & Details: ${shareUrl}`
    if (isVerse) return `Verse of the Day: ${post.verse_reference}\n${post.verse_text ? `"${post.verse_text}"\n\n` : ''}${post.body ? `Reflection: ${post.body}\n\n` : ''}Shared via LifeGen Life Hub: ${shareUrl}`
    return `From LifeGen Life Hub (${post.author_name}):\n\n"${post.body}"\n\nCheck it out: ${shareUrl}`
  }, [post, isEvent, isVerse, shareUrl])

  const copy = () => {
    navigator.clipboard.writeText(msgText).then(() => { setCopied(true); toast('Copied!', 'good'); setTimeout(() => setCopied(false), 2500) })
  }

  const googleCalUrl = useMemo(() => {
    if (!isEvent || !post.event_date) return null
    const start = new Date(post.event_date.replace(' ', 'T'))
    if (isNaN(start)) return null
    const end = new Date(start.getTime() + 7200000)
    const fmt = d => d.toISOString().replace(/-|:|\.\d{3}/g, '')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(post.event_title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(post.body || '')}&location=${encodeURIComponent(post.event_location || '')}`
  }, [post, isEvent])

  const downloadIcs = () => {
    const start = new Date(post.event_date.replace(' ', 'T'))
    const end = new Date(start.getTime() + 7200000)
    const fmt = d => d.toISOString().replace(/-|:|\.\d{3}/g, '')
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${post.event_title}\nDESCRIPTION:${(post.body||'').replace(/\n/g,'\\n')}\nLOCATION:${post.event_location||''}\nDTSTART:${fmt(start)}\nDTEND:${fmt(end)}\nEND:VEVENT\nEND:VCALENDAR`
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: `${post.event_title.replace(/\s+/g,'_')}.ics` })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    toast('Downloaded .ics calendar file!', 'good')
  }

  const CHANNELS = [
    { label: copied ? 'Copied!' : 'Copy Link', Icon: copied ? Check : Copy, onClick: copy, href: null },
    { label: 'WhatsApp',  Icon: Share2, href: `https://api.whatsapp.com/send?text=${encodeURIComponent(msgText)}` },
    { label: 'Telegram',  Icon: Send,   href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(msgText)}` },
    { label: 'Facebook',  Icon: Users,  href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { label: 'X/Twitter', Icon: Zap,    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msgText)}` }
  ]

  return createPortal(
    <div className="sh-backdrop" onClick={onClose}>
      <div className="sh-modal" data-sh-dark={document.documentElement.dataset.theme === 'dark' ? 'true' : undefined} style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="sh-modal-header">
          <h3 className="sh-modal-title"><Share2 size={18} /> Share &amp; Invite</h3>
          <button type="button" className="sh-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="sh-modal-body">
          <div className="sh-share-preview">
            <p className="sh-share-text">{msgText}</p>
          </div>
          <div className="sh-share-grid">
            {CHANNELS.map(ch => ch.href ? (
              <a key={ch.label} href={ch.href} target="_blank" rel="noreferrer" className="sh-share-btn">
                <ch.Icon size={16} /> {ch.label}
              </a>
            ) : (
              <button key={ch.label} type="button" className="sh-share-btn" onClick={ch.onClick}>
                <ch.Icon size={16} /> {ch.label}
              </button>
            ))}
          </div>

          {isEvent && (
            <div className="sh-cal-row">
              <span className="sh-cal-label">Add to Calendar</span>
              <div className="sh-cal-btns">
                {googleCalUrl && <a href={googleCalUrl} target="_blank" rel="noreferrer" className="sh-btn-ghost"><ExternalLink size={14} /> Google Calendar</a>}
                {post.event_date && <button type="button" className="sh-btn-ghost" onClick={downloadIcs}><Calendar size={14} /> Download .ics</button>}
              </div>
            </div>
          )}
        </div>
        <div className="sh-modal-footer">
          <button type="button" className="sh-btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function SocialHub() {
  const user  = getUser()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetPostId = Number(searchParams.get('post') || 0)

  const [posts, setPosts]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery]     = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort]                   = useState('recent')
  const [highlightedId, setHighlightedId] = useState(0)

  const [composeOpen, setComposeOpen]     = useState(false)
  const [composeCategory, setComposeCategory] = useState('general')
  const [editingPost, setEditingPost]     = useState(null)
  const [sharePost, setSharePost]         = useState(null)
  const [toDeletePost, setToDeletePost]   = useState(null)
  const [quickVerses, setQuickVerses]     = useState([])
  const [lightboxData, setLightboxData]   = useState(null)

  // 300ms debounce for search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const mine   = activeCategory === 'mine' ? '1' : '0'
      const catP   = activeCategory === 'mine' ? 'all' : activeCategory
      const q      = encodeURIComponent(debouncedQuery.trim())
      const res    = await apiGet(`/api/social/posts?category=${catP}&sort=${sort}&mine=${mine}&q=${q}`)
      setPosts(Array.isArray(res) ? res : [])
    } catch (err) {
      toast(err.message || 'Could not load Life Hub posts.', 'bad')
    } finally { setLoading(false) }
  }, [activeCategory, sort, debouncedQuery, toast])

  useEffect(() => { loadPosts() }, [loadPosts])
  useEffect(() => { apiGet('/api/social/verses/quick').then(d => setQuickVerses(Array.isArray(d) ? d : [])).catch(() => {}) }, [])

  // Deep-link ?post=<id>: scroll to & highlight target post once loaded
  useEffect(() => {
    if (!targetPostId || loading || posts.length === 0) return
    const found = posts.find(p => p.id === targetPostId)
    if (!found) {
      if (activeCategory !== 'all' || searchQuery !== '') {
        setActiveCategory('all')
        setSearchQuery('')
        setDebouncedQuery('')
      }
      return
    }
    setHighlightedId(targetPostId)
    const timer = setTimeout(() => {
      const el = document.getElementById(`sh-post-${targetPostId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSearchParams({}, { replace: true })
    }, 120)
    const clearHi = setTimeout(() => setHighlightedId(0), 3600)
    return () => {
      clearTimeout(timer)
      clearTimeout(clearHi)
    }
  }, [targetPostId, loading, posts, activeCategory, searchQuery, setSearchParams])

  // Escape key
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== 'Escape') return
      if (toDeletePost) setToDeletePost(null)
      else if (composeOpen) { setComposeOpen(false); setEditingPost(null) }
      else if (sharePost) setSharePost(null)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [toDeletePost, composeOpen, sharePost])

  /* Optimistic react */
  const handleReact = async (post) => {
    if (!user) return toast('Sign in to react to posts.', 'bad')
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, i_liked: !p.i_liked, likes_count: !p.i_liked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1) } : p))
    try {
      const res = await apiPost('/api/social/react', { id: post.id })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, i_liked: res.on, likes_count: res.count } : p))
    } catch (err) { toast(err.message || 'Failed to react.', 'bad'); loadPosts() }
  }

  const handleRsvp = async (post, status) => {
    if (!user) return toast('Sign in to RSVP.', 'bad')
    const target = post.my_rsvp === status ? 'none' : status
    try {
      const res = await apiPost('/api/social/rsvp', { id: post.id, status: target })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, my_rsvp: res.my_rsvp, going_count: res.going_count, interested_count: res.interested_count } : p))
      toast(target === 'going' ? "You're going — Praise God!" : target === 'interested' ? "Marked as Interested!" : 'RSVP updated.', 'good')
    } catch (err) { toast(err.message || 'Could not update RSVP.', 'bad') }
  }

  const confirmDelete = async () => {
    if (!toDeletePost) return
    try {
      await apiPost('/api/social/delete', { id: toDeletePost.id })
      setPosts(prev => prev.filter(p => p.id !== toDeletePost.id))
      setToDeletePost(null)
      toast('Post deleted.', 'good')
    } catch (err) { toast(err.message || 'Could not delete post.', 'bad') }
  }

  const openCompose = (cat = 'general') => {
    if (!user) return toast('Sign in to create a post.', 'bad')
    setEditingPost(null)
    setComposeCategory(cat)
    setComposeOpen(true)
  }

  const openEdit = (post) => {
    if (!user) return toast('Sign in to edit posts.', 'bad')
    setEditingPost(post)
    setComposeCategory(post.category || 'general')
    setComposeOpen(true)
  }

  const TABS = [
    { id: 'all',     label: 'All',         Icon: LayoutGrid },
    { id: 'event',   label: 'Fellowships', Icon: CalendarDays },
    { id: 'verse',   label: 'Scripture',   Icon: BookOpen },
    { id: 'general', label: 'Community',   Icon: Zap },
    ...(user ? [{ id: 'mine', label: 'My Posts', Icon: User }] : [])
  ]

  return (
    <div className="sh-wrap">
      {/* Page header */}
      <div className="sh-page-header">
        <div className="sh-page-header-left">
          <h1 className="sh-page-title">Life Hub</h1>
          <p className="sh-page-sub">Connect, invite, and encourage one another in Christ.</p>
        </div>
        {user && (
          <button type="button" className="sh-btn-primary sh-compose-btn" onClick={() => openCompose('general')}>
            <Plus size={16} /> New Post
          </button>
        )}
      </div>

      {/* Compose bar — Twitter-style quick prompt */}
      {user && (
        <div className="sh-compose-bar">
          <div className="sh-compose-top">
            <Avatar src={user.avatar} name={user.first_name || user.name} size={38} />
            <button type="button" className="sh-compose-prompt" onClick={() => openCompose('general')}>
              What's on your heart today?
            </button>
          </div>
          <div className="sh-compose-quick">
            <button type="button" className="sh-quick-btn is-photo" title="Add a photo" onClick={() => openCompose('general')}>
              <ImageIcon size={16} /> <span className="sh-quick-btn-text">Photo</span>
            </button>
            <button type="button" className="sh-quick-btn is-event" title="Fellowship invite" onClick={() => openCompose('event')}>
              <CalendarDays size={16} /> <span className="sh-quick-btn-text">Fellowship</span>
            </button>
            <button type="button" className="sh-quick-btn is-verse" title="Share a verse" onClick={() => openCompose('verse')}>
              <BookOpen size={16} /> <span className="sh-quick-btn-text">Scripture</span>
            </button>
          </div>
        </div>
      )}

      {/* Controls: tabs + search */}
      <div className="sh-controls">
        <div className="sh-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`sh-tab ${activeCategory === t.id ? 'is-on' : ''}`}
              onClick={(e) => {
                setActiveCategory(t.id)
                try {
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                } catch {
                  /* fallback for older browsers */
                }
              }}
            >
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        <div className="sh-controls-right">
          <div className="sh-sort-toggle" role="group" aria-label="Sort posts">
            <button
              type="button"
              className={`sh-sort-btn ${sort === 'recent' ? 'is-on' : ''}`}
              onClick={() => setSort('recent')}
            >
              Recent
            </button>
            <button
              type="button"
              className={`sh-sort-btn ${sort === 'top' ? 'is-on' : ''}`}
              onClick={() => setSort('top')}
            >
              Top
            </button>
          </div>
          <div className="sh-search-box">
            <Search size={15} className="sh-search-icon" />
            <input
              type="text"
              placeholder="Search posts…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="sh-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="sh-feed">
        {loading ? (
          <div className="sh-state-box">
            <RefreshCw size={32} className="animate-spin" />
            <p>Loading posts…</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="sh-state-box">
            <Users size={40} />
            <h3>No posts yet in this section.</h3>
            <p>Be the first to invite friends to a Bible study or share an inspiring verse!</p>
            {user && <button type="button" className="sh-btn-primary" onClick={() => openCompose('event')}><Plus size={15} /> Create Post</button>}
          </div>
        ) : posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            user={user}
            highlighted={highlightedId === post.id}
            onReact={handleReact}
            onRsvp={handleRsvp}
            onEdit={openEdit}
            onDelete={setToDeletePost}
            onShare={setSharePost}
            onOpenLightbox={(images, index) => setLightboxData({ images, index })}
          />
        ))}
      </div>

      {/* Compose / Edit modal */}
      <ComposeModal
        open={composeOpen}
        initialCategory={composeCategory}
        editingPost={editingPost}
        quickVerses={quickVerses}
        onClose={() => { setComposeOpen(false); setEditingPost(null) }}
        onSuccess={loadPosts}
      />

      {/* Share modal */}
      {sharePost && (
        <ShareModal post={sharePost} onClose={() => setSharePost(null)} toast={toast} />
      )}

      {/* Delete confirm */}
      {toDeletePost && createPortal(
        <div className="sh-backdrop" onClick={() => setToDeletePost(null)}>
          <div className="sh-modal sh-modal-sm" data-sh-dark={document.documentElement.dataset.theme === 'dark' ? 'true' : undefined} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sh-modal-header">
              <h3 className="sh-modal-title" style={{ color: '#ef4444' }}><Trash2 size={18} color="#ef4444" /> Delete Post</h3>
              <button
                type="button"
                className="sh-icon-btn"
                onClick={() => setToDeletePost(null)}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>
            <div className="sh-modal-body">
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
                Are you sure you want to remove this post from the Life Hub? This cannot be undone.
              </p>
            </div>
            <div className="sh-modal-footer">
              <button type="button" className="sh-btn-ghost" onClick={() => setToDeletePost(null)}>Cancel</button>
              <button type="button" className="sh-btn-danger" onClick={confirmDelete} autoFocus>Delete Post</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox / Maximize photo modal */}
      {lightboxData && (
        <PhotoLightbox
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  )
}
