import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen, Sparkles, MessageCircleHeart, Share2, Copy, Check,
  RefreshCw, Heart, Quote, ArrowRight, SunMedium, Search, X,
  ExternalLink, ChevronLeft
} from 'lucide-react'
import { apiGet } from '../../api.js'

const QUICK_SEARCHES = [
  'John 3:16',
  'Psalm 23',
  'Romans 8:28',
  'Philippians 4:13',
  'Proverbs 3:5-6',
  'Isaiah 40:31',
  '1 Corinthians 13:4-7'
]

export default function DailyDevotional() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingNew, setFetchingNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Live Bible Lookup State
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [translation, setTranslation] = useState('web') // 'web' | 'kjv' | 'bbe'
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [searchCopied, setSearchCopied] = useState(false)

  const loadToday = async () => {
    try {
      const res = await apiGet('/api/devotional/today')
      setData(res)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load devotional')
    } finally {
      setLoading(false)
    }
  }

  const loadRandom = async () => {
    setFetchingNew(true)
    try {
      const res = await apiGet('/api/devotional/random')
      setData(res)
      setCopied(false)
    } catch {
      // Keep existing data if random fails
    } finally {
      setFetchingNew(false)
    }
  }

  useEffect(() => {
    loadToday()
  }, [])

  const handleShare = async () => {
    if (!data) return

    const shareText = `“${data.verse}”\n— ${data.reference} (${data.translation})\n\nToday's Reflection: ${data.reflection}\n\nShared via LifeGen Portal`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `LifeGen Verse of the Day: ${data.reference}`,
          text: shareText,
        })
        return
      } catch (e) {
        // Fallback to clipboard if cancelled or not supported
      }
    }

    navigator.clipboard?.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleWritePrayer = () => {
    if (!data) return
    const title = `Prayer: ${data.reference}`
    const body = `Inspired by ${data.reference} (“${data.verse}”):\n\n${data.prayer_prompt}`
    navigate(`/prayer?compose=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`)
  }

  // Live Bible Lookup Execution
  const doSearch = async (queryToUse, transToUse = translation) => {
    const q = (queryToUse || searchQuery).trim()
    if (!q) return

    setSearching(true)
    setSearchError('')

    try {
      const res = await apiGet(`/api/bible/lookup?q=${encodeURIComponent(q)}&translation=${encodeURIComponent(transToUse)}`)
      if (res.success) {
        setSearchResult(res)
        setSearchError('')
      } else {
        setSearchError(res.error || 'Passage not found')
        setSearchResult(null)
      }
    } catch (err) {
      setSearchError(err.message || 'Passage not found. Try format like "John 3:16" or "Psalm 23".')
      setSearchResult(null)
    } finally {
      setSearching(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    doSearch()
  }

  const handleQuickChip = (chip) => {
    setSearchQuery(chip)
    doSearch(chip)
  }

  const handleShareSearchResult = async () => {
    if (!searchResult) return
    const text = `“${searchResult.text}”\n— ${searchResult.reference} (${searchResult.translation_name})\n\nShared via LifeGen Bible Lookup`

    if (navigator.share) {
      try {
        await navigator.share({
          title: searchResult.reference,
          text,
        })
        return
      } catch {}
    }

    navigator.clipboard?.writeText(text)
    setSearchCopied(true)
    setTimeout(() => setSearchCopied(false), 2500)
  }

  const handleWriteSearchPrayer = () => {
    if (!searchResult) return
    const title = `Prayer on ${searchResult.reference}`
    const body = `Reflecting on ${searchResult.reference} (${searchResult.translation_name}):\n“${searchResult.text}”\n\nLord, teach me how to live out this truth in my life today.`
    navigate(`/prayer?compose=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`)
  }

  if (loading) {
    return (
      <section className="hm-band" style={{ padding: '24px 0' }}>
        <div className="hm-wrap">
          <div style={{ background: 'var(--p-surface, #fff)', border: '1px solid var(--p-border, #e5e8f1)', borderRadius: 24, padding: 28, minHeight: 200, opacity: 0.6 }} />
        </div>
      </section>
    )
  }

  if (error || !data) return null

  return (
    <section className="hm-band" style={{ padding: '20px 0 28px' }}>
      <div className="hm-wrap">
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, var(--p-surface, #ffffff) 0%, var(--p-sunken, #f8fafc) 100%)',
            border: '1.5px solid var(--p-border, #e5e8f1)',
            borderRadius: 28,
            padding: 'clamp(20px, 3.5vw, 32px)',
            boxShadow: 'var(--p-shadow, 0 10px 30px -10px rgba(0,0,0,0.06))',
          }}
        >
          {/* Subtle decorative watermark */}
          <div
            style={{
              position: 'absolute',
              right: -15,
              top: -20,
              opacity: 0.04,
              pointerEvents: 'none',
              fontSize: 180,
              fontWeight: 900,
              fontFamily: 'serif',
              lineHeight: 1,
              userSelect: 'none'
            }}
          >
            &rdquo;
          </div>

          {/* Top Header Pill Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'rgba(194, 65, 12, 0.12)',
                  color: 'var(--p-accent, #c2410c)',
                }}
              >
                <SunMedium size={14} /> Verse of the Day
              </span>

              <span style={{ fontSize: 13, color: 'var(--p-text-2, #586079)', fontWeight: 500 }}>
                {data.formatted_date}
              </span>

              {data.theme && !showSearch && (
                <span
                  style={{
                    fontSize: 11.5,
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.05)',
                    color: 'var(--p-text-2, #586079)',
                    fontWeight: 600
                  }}
                >
                  {data.theme}
                </span>
              )}
            </div>

            {/* Header Right Actions: Search Toggle & Inspire Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowSearch(!showSearch)
                  if (!showSearch) setSearchResult(null)
                }}
                style={{
                  border: 0,
                  background: showSearch ? 'var(--p-accent, #c2410c)' : 'rgba(0,0,0,0.05)',
                  color: showSearch ? '#fff' : 'var(--p-text-2, #586079)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 999,
                  transition: 'all 0.15s ease'
                }}
                title="Search any chapter or verse live"
              >
                <Search size={13} />
                <span>{showSearch ? 'Close Search' : 'Search Bible'}</span>
              </button>

              {!showSearch && (
                <button
                  type="button"
                  onClick={loadRandom}
                  disabled={fetchingNew}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--p-text-2, #586079)',
                    opacity: 0.8,
                    padding: '4px 8px',
                    borderRadius: 8
                  }}
                  title="Read another scripture verse"
                >
                  <RefreshCw size={13} className={fetchingNew ? 'p-spin' : ''} />
                  <span>Inspire Me</span>
                </button>
              )}
            </div>
          </div>

          {/* ===== LIVE BIBLE SEARCH BOX ===== */}
          {showSearch ? (
            <div style={{ marginBottom: 16 }}>
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 12, opacity: 0.5 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any passage (e.g. John 3:16, Psalm 23, Romans 8:28)..."
                    className="p-input"
                    style={{ width: '100%', paddingLeft: 36, height: 40, borderRadius: 12, fontSize: 13.5 }}
                    autoFocus
                  />
                </div>

                <select
                  value={translation}
                  onChange={(e) => {
                    setTranslation(e.target.value)
                    if (searchQuery.trim()) doSearch(searchQuery, e.target.value)
                  }}
                  className="p-input"
                  style={{ height: 40, borderRadius: 12, padding: '0 10px', fontSize: 13, minWidth: 100 }}
                  title="Select Bible Translation"
                >
                  <option value="web">WEB (Modern)</option>
                  <option value="kjv">KJV (Classic)</option>
                  <option value="bbe">BBE (Basic English)</option>
                </select>

                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="p-btn p-btn-primary p-btn-sm"
                  style={{ borderRadius: 12, padding: '0 16px', height: 40 }}
                >
                  {searching ? 'Searching...' : 'Lookup'}
                </button>
              </form>

              {/* Quick suggestions chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--p-text-3)', textTransform: 'uppercase' }}>
                  Popular:
                </span>
                {QUICK_SEARCHES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickChip(chip)}
                    style={{
                      border: 0,
                      background: searchQuery === chip ? 'rgba(194,65,12,0.15)' : 'rgba(0,0,0,0.04)',
                      color: searchQuery === chip ? 'var(--p-accent, #c2410c)' : 'inherit',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Search Error Alert */}
              {searchError && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  {searchError}
                </div>
              )}

              {/* Live Passage Result View */}
              {searchResult && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1.5px solid var(--p-border, #e5e8f1)',
                    borderRadius: 20,
                    padding: '20px 22px',
                    marginBottom: 16,
                    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--p-accent, #c2410c)' }}>
                        {searchResult.reference}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)' }}>
                        {searchResult.translation_name}
                      </span>
                    </div>

                    <small style={{ fontSize: 11, color: 'var(--p-text-3)' }}>
                      Live Bible API
                    </small>
                  </div>

                  <blockquote
                    style={{
                      margin: '0 0 16px',
                      fontSize: 'clamp(16px, 2vw, 19px)',
                      lineHeight: 1.6,
                      color: 'var(--p-text, #1a1f2e)',
                      fontStyle: 'italic',
                      fontWeight: 500
                    }}
                  >
                    &ldquo;{searchResult.text}&rdquo;
                  </blockquote>

                  {/* Actions for searched verse */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleShareSearchResult}
                      className="p-btn p-btn-secondary p-btn-sm"
                      style={{ borderRadius: 10 }}
                    >
                      {searchCopied ? <Check size={13} color="#16a34a" /> : <Share2 size={13} />}
                      <span>{searchCopied ? 'Copied!' : 'Copy Verse'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWriteSearchPrayer}
                      className="p-btn p-btn-primary p-btn-sm"
                      style={{ borderRadius: 10 }}
                    >
                      <MessageCircleHeart size={13} />
                      <span>Write Prayer Request</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSearch(false)}
                      style={{ border: 0, background: 'transparent', color: 'var(--p-text-2)', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      Back to Today's Devotional
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ===== DEFAULT: TODAY'S DEVOTIONAL VIEW ===== */
            <>
              {/* Scripture Verse Quote */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <blockquote
                  style={{
                    margin: 0,
                    fontSize: 'clamp(17px, 2.2vw, 22px)',
                    lineHeight: 1.5,
                    fontWeight: 600,
                    color: 'var(--p-text, #1a1f2e)',
                    fontStyle: 'italic',
                    letterSpacing: '-0.01em'
                  }}
                >
                  &ldquo;{data.verse}&rdquo;
                </blockquote>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--p-accent, #c2410c)' }}>
                    {data.reference}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.06)', opacity: 0.8 }}>
                    {data.translation}
                  </span>
                </div>
              </div>

              {/* 1-Minute Daily Reflection */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid var(--p-border, #e5e8f1)',
                  borderRadius: 18,
                  padding: '16px 20px',
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Sparkles size={15} color="var(--p-accent, #c2410c)" />
                  <strong style={{ fontSize: 14, color: 'var(--p-text, #1a1f2e)' }}>
                    {data.title}
                  </strong>
                  <small style={{ fontSize: 11, color: 'var(--p-text-3, #8a92a8)', marginLeft: 'auto' }}>
                    {data.reading_time || '1 min read'}
                  </small>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--p-text-2, #586079)' }}>
                  {data.reflection}
                </p>

                {data.prayer_prompt && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      background: 'rgba(194, 65, 12, 0.05)',
                      borderLeft: '3px solid var(--p-accent, #c2410c)',
                      padding: '8px 12px',
                      borderRadius: '0 10px 10px 0',
                      fontSize: 12.5,
                      color: 'var(--p-text, #1a1f2e)',
                      lineHeight: 1.45
                    }}
                  >
                    <Heart size={14} color="var(--p-accent, #c2410c)" style={{ flex: 'none', marginTop: 2 }} />
                    <span><b>Today’s Prayer:</b> {data.prayer_prompt}</span>
                  </div>
                )}
              </div>

              {/* Action Row: Share & Prayer Wall Connection */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-btn p-btn-secondary p-btn-sm"
                    style={{ borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Share this verse"
                  >
                    {copied ? <Check size={14} color="#16a34a" /> : <Share2 size={14} />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Share Verse'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWritePrayer}
                    className="p-btn p-btn-primary p-btn-sm"
                    style={{ borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Bring this reflection to the Prayer Wall"
                  >
                    <MessageCircleHeart size={14} />
                    <span>Write Prayer Request</span>
                  </button>
                </div>

                <Link
                  to="/prayer"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--p-text-2, #586079)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>Visit Prayer Wall</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
