import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, MessageCircleHeart, Share2, Check,
  RefreshCw, Heart, ArrowRight, SunMedium, Search, Languages
} from 'lucide-react'
import { apiGet } from '../../api.js'

const QUICK_SEARCHES = [
  'John 3:16',
  'Jeremiah 29:11',
  'Philippians 4:6',
  'Psalm 23',
  'Romans 8:28',
  'Joshua 1:9',
  '1 Corinthians 13:4-7'
]

export default function DailyDevotional() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingNew, setFetchingNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Language Mode: 'en' (English) | 'tl' (Tagalog / Filipino)
  const [lang, setLang] = useState('en')

  // Live Bible Lookup State
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [translation, setTranslation] = useState('niv') // 'niv' | 'tl' | 'nkjv' | 'kjv' | 'web'
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

  // Dynamic values depending on selected language
  const isTl = lang === 'tl'
  const currentVerse = (isTl && data?.verse_tl) ? data.verse_tl : data?.verse
  const currentRef = (isTl && data?.reference_tl) ? data.reference_tl : data?.reference
  const currentTitle = (isTl && data?.title_tl) ? data.title_tl : data?.title
  const currentTheme = (isTl && data?.theme_tl) ? data.theme_tl : data?.theme
  const currentReflection = (isTl && data?.reflection_tl) ? data.reflection_tl : data?.reflection
  const currentPrayer = (isTl && data?.prayer_prompt_tl) ? data.prayer_prompt_tl : data?.prayer_prompt
  const currentTransTag = isTl ? 'Tagalog (MBB)' : (data?.translation || 'NIV')

  const handleShare = async () => {
    if (!data) return

    const label = isTl ? 'Pagninilay Ngayong Araw' : "Today's Reflection"
    const shareText = `“${currentVerse}”\n— ${currentRef} (${currentTransTag})\n\n${label}: ${currentReflection}\n\nShared via LifeGen Portal`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `LifeGen Verse: ${currentRef}`,
          text: shareText,
        })
        return
      } catch (e) {
        // Fallback to clipboard if cancelled
      }
    }

    navigator.clipboard?.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleWritePrayer = () => {
    if (!data) return
    const title = isTl ? `Panalangin: ${currentRef}` : `Prayer: ${currentRef}`
    const promptIntro = isTl ? 'Hango sa' : 'Inspired by'
    const body = `${promptIntro} ${currentRef} (“${currentVerse}”):\n\n${currentPrayer}`
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
      setSearchError(err.message || 'Passage not found. Try standard formats like "John 3:16", "Awit 23", or "Romans 8:28".')
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
    const body = `Scripture: ${searchResult.reference} (${searchResult.translation_name})\n“${searchResult.text}”\n\nLord, teach me how to live out this truth today...`
    navigate(`/prayer?compose=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`)
  }

  if (loading) {
    return (
      <section className="p-section" style={{ marginBottom: 24 }}>
        <div className="p-card" style={{ padding: 28, textAlign: 'center', opacity: 0.7 }}>
          <Sparkles size={20} className="p-spin" style={{ margin: '0 auto 8px', color: 'var(--p-accent, #c2410c)' }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--p-text-2, #586079)' }}>
            Loading today's devotional verse...
          </p>
        </div>
      </section>
    )
  }

  if (error || !data) {
    return null // Graceful hide if backend unavailable
  }

  return (
    <section className="p-section" style={{ marginBottom: 24 }}>
      <div
        className="p-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 0,
          background: 'linear-gradient(145deg, rgba(255, 247, 237, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%)',
          borderColor: 'rgba(251, 146, 60, 0.3)',
          boxShadow: '0 10px 30px -10px rgba(194, 65, 12, 0.12)'
        }}
      >
        {/* Subtle decorative glow accents */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ padding: '24px 26px' }}>
          {/* Top Header Bar */}
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
                <SunMedium size={14} /> {isTl ? 'Talata Ngayong Araw' : 'Verse of the Day'}
              </span>

              <span style={{ fontSize: 13, color: 'var(--p-text-2, #586079)', fontWeight: 500 }}>
                {data.formatted_date}
              </span>

              {/* Language Switcher Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 999,
                  padding: 2,
                  background: 'rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  alignItems: 'center'
                }}
                title="Switch Language (English / Tagalog)"
              >
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  style={{
                    border: 0,
                    background: !isTl ? '#ffffff' : 'transparent',
                    color: !isTl ? '#c2410c' : '#586079',
                    fontWeight: 700,
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    boxShadow: !isTl ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('tl')}
                  style={{
                    border: 0,
                    background: isTl ? '#ffffff' : 'transparent',
                    color: isTl ? '#c2410c' : '#586079',
                    fontWeight: 700,
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    boxShadow: isTl ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🇵🇭 TL
                </button>
              </div>

              {currentTheme && !showSearch && (
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
                  {currentTheme}
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
                  background: showSearch ? 'var(--p-accent, #c2410c)' : 'rgba(0,0,0,0.06)',
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
                <span>{showSearch ? (isTl ? 'Isara ang Search' : 'Close Search') : (isTl ? 'Maghanap sa Bibliya' : 'Search Bible')}</span>
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
                    opacity: 0.85,
                    padding: '4px 8px',
                    borderRadius: 8
                  }}
                  title="Read another scripture verse"
                >
                  <RefreshCw size={13} className={fetchingNew ? 'p-spin' : ''} />
                  <span>{isTl ? 'Iba Pang Talata' : 'Inspire Me'}</span>
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
                    placeholder={isTl ? "I-type ang talata (hal. Juan 3:16, Awit 23, Roma 8:28)..." : "Search any passage (e.g. John 3:16, Psalm 23, Romans 8:28)..."}
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
                  style={{ height: 40, borderRadius: 12, padding: '0 10px', fontSize: 13, minWidth: 130 }}
                  title="Select Bible Translation"
                >
                  <option value="niv">NIV (New International)</option>
                  <option value="tl">Tagalog (Magandang Balita)</option>
                  <option value="nkjv">NKJV (New King James)</option>
                  <option value="kjv">KJV (King James Version)</option>
                  <option value="web">WEB (World English)</option>
                </select>

                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="p-btn p-btn-primary p-btn-sm"
                  style={{ borderRadius: 12, padding: '0 18px', height: 40 }}
                >
                  {searching ? (isTl ? 'Hinahanap...' : 'Searching...') : (isTl ? 'Hanapin' : 'Lookup')}
                </button>
              </form>

              {/* Quick suggestions chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--p-text-3)', textTransform: 'uppercase' }}>
                  {isTl ? 'Mungkahi:' : 'Popular:'}
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

              {/* Search Results Display */}
              {searchResult && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--p-border, #e5e8f1)',
                    borderRadius: 16,
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
                      Live Scripture
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
                      <span>{searchCopied ? (isTl ? 'Nakopya!' : 'Copied!') : (isTl ? 'Kopyahin' : 'Copy Verse')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWriteSearchPrayer}
                      className="p-btn p-btn-primary p-btn-sm"
                      style={{ borderRadius: 10 }}
                    >
                      <MessageCircleHeart size={13} />
                      <span>{isTl ? 'Magsulat ng Panalangin' : 'Write Prayer Request'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSearch(false)}
                      style={{ border: 0, background: 'transparent', color: 'var(--p-text-2)', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      {isTl ? 'Bumalik sa Pagninilay Ngayong Araw' : "Back to Today's Devotional"}
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
                  &ldquo;{currentVerse}&rdquo;
                </blockquote>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--p-accent, #c2410c)' }}>
                    {currentRef}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.06)', opacity: 0.85 }}>
                    {currentTransTag}
                  </span>
                </div>
              </div>

              {/* 1-Minute Daily Reflection */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid var(--p-border, #e5e8f1)',
                  borderRadius: 18,
                  padding: '16px 20px',
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Sparkles size={15} color="var(--p-accent, #c2410c)" />
                  <strong style={{ fontSize: 14, color: 'var(--p-text, #1a1f2e)' }}>
                    {currentTitle}
                  </strong>
                  <small style={{ fontSize: 11, color: 'var(--p-text-3, #8a92a8)', marginLeft: 'auto' }}>
                    {isTl ? '1 minutong pagbasa' : (data.reading_time || '1 min read')}
                  </small>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--p-text-2, #586079)' }}>
                  {currentReflection}
                </p>

                {currentPrayer && (
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
                    <span><b>{isTl ? 'Panalangin Ngayong Araw:' : 'Today’s Prayer:'}</b> {currentPrayer}</span>
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
                    title={isTl ? 'Ibahagi ang talatang ito' : 'Share this verse'}
                  >
                    {copied ? <Check size={14} color="#16a34a" /> : <Share2 size={14} />}
                    <span>{copied ? (isTl ? 'Nakopya sa Clipboard!' : 'Copied to Clipboard!') : (isTl ? 'Ibahagi ang Talata' : 'Share Verse')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWritePrayer}
                    className="p-btn p-btn-primary p-btn-sm"
                    style={{ borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title={isTl ? 'Dalhin ang pagninilay na ito sa Prayer Wall' : 'Bring this reflection to the Prayer Wall'}
                  >
                    <MessageCircleHeart size={14} />
                    <span>{isTl ? 'Magsulat ng Panalangin' : 'Write Prayer Request'}</span>
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
                  <span>{isTl ? 'Pumunta sa Prayer Wall' : 'Visit Prayer Wall'}</span>
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
