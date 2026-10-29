import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Share2, Check, RefreshCw, MessageCircleHeart, ArrowRight, Search, X, Quote, ChevronDown, HeartHandshake, BookOpen } from 'lucide-react'
import { apiGet } from '../../api.js'
import '../../styles/verse.css'

const QUICK_SEARCHES = ['John 3:16', 'Jeremiah 29:11', 'Philippians 4:6', 'Psalm 23', 'Romans 8:28', 'Joshua 1:9', '1 Corinthians 13:4-7']
const TRANSLATIONS = [
  ['niv', 'NIV'],
  ['tl', 'Tagalog (MBB)'],
  ['nkjv', 'NKJV'],
  ['kjv', 'KJV'],
  ['web', 'WEB'],
]
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/* Ang ibang verse ay may sariling “ ” na sa data; huwag nang dagdagan. */
const quoted = (t) => (/^[“"‘']/.test(String(t || '').trim()) ? t : `“${t}”`)

const readLang = () => {
  try { return localStorage.getItem('lg-verse-lang') === 'tl' ? 'tl' : 'en' } catch { return 'en' }
}

export default function DailyDevotional() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchingNew, setFetchingNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState(readLang)
  const [open, setOpen] = useState(false) // reflection
  const [tick, setTick] = useState(0) // para mag-replay ang fade kapag nagbago ang verse/lang

  const [showSearch, setShowSearch] = useState(false)
  const [q, setQ] = useState('')
  const [translation, setTranslation] = useState('niv')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [resCopied, setResCopied] = useState(false)
  const inputRef = useRef(null)
  const timers = useRef([])

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const loadToday = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiGet('/api/devotional/today'))
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load the verse.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { loadToday() }, [loadToday])

  const loadRandom = async () => {
    setFetchingNew(true)
    try {
      setData(await apiGet('/api/devotional/random'))
      setCopied(false)
      setOpen(false)
      setTick((t) => t + 1)
    } catch {
      /* keep current verse */
    } finally {
      setFetchingNew(false)
    }
  }

  const pickLang = (l) => {
    if (l === lang) return
    setLang(l)
    setTick((t) => t + 1)
    try { localStorage.setItem('lg-verse-lang', l) } catch { /* private mode */ }
  }

  // Search: i-focus ang input pagbukas, Esc para isara
  useEffect(() => {
    if (!showSearch) return undefined
    inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setShowSearch(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSearch])

  const tl = lang === 'tl'
  const pick = (en, fil) => (tl && data?.[fil]) || data?.[en]
  const verse = pick('verse', 'verse_tl')
  const ref = pick('reference', 'reference_tl')
  const title = pick('title', 'title_tl')
  const theme = pick('theme', 'theme_tl')
  const reflection = pick('reflection', 'reflection_tl')
  const prayer = pick('prayer_prompt', 'prayer_prompt_tl')
  const tag = tl ? 'Tagalog (MBB)' : data?.translation || 'NIV'

  const now = new Date()
  const dateObj = data?.date ? new Date(`${String(data.date).slice(0, 10)}T00:00:00`) : now
  const valid = !isNaN(dateObj)
  const day = (valid ? dateObj : now).getDate()
  const mon = MONTHS[(valid ? dateObj : now).getMonth()]

  const share = async (text, title0, setDone) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title0, text })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return
      }
    }
    try { await navigator.clipboard?.writeText(text) } catch { return }
    setDone(true)
    later(() => setDone(false), 2200)
  }

  const shareVerse = () => data && share(`${quoted(verse)}\n— ${ref} (${tag})\n\nShared via Life Generation`, `Verse: ${ref}`, setCopied)
  const shareResult = () => result && share(`${quoted(result.text)}\n— ${result.reference} (${result.translation_name})\n\nShared via Life Generation`, result.reference, setResCopied)

  const toPrayer = (title0, body) => navigate(`/prayer?compose=1&title=${encodeURIComponent(title0)}&body=${encodeURIComponent(body)}`)
  const prayFromVerse = () => data && toPrayer(`${tl ? 'Panalangin' : 'Prayer'}: ${ref}`, `${tl ? 'Hango sa' : 'Inspired by'} ${ref} (“${verse}”):\n\n${prayer}`)
  const prayFromResult = () => result && toPrayer(`Prayer on ${result.reference}`, `Scripture: ${result.reference} (${result.translation_name})\n“${result.text}”\n\nLord, teach me how to live out this truth today...`)

  const doSearch = async (query = q, trans = translation) => {
    const term = query.trim()
    if (!term) return
    setSearching(true)
    setSearchError('')
    try {
      const res = await apiGet(`/api/bible/lookup?q=${encodeURIComponent(term)}&translation=${encodeURIComponent(trans)}`)
      if (res.success) setResult(res)
      else {
        setSearchError(res.error || 'Passage not found.')
        setResult(null)
      }
    } catch (err) {
      setSearchError(err.message || 'Passage not found. Try "John 3:16", "Awit 23" or "Romans 8:28".')
      setResult(null)
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
    return (
      <section className="hm-band vd" aria-busy="true" aria-label="Loading verse of the day">
        <div className="hm-wrap">
          <div className="vd-card">
            <div className="vd-skel vd-skel-d" />
            <div className="vd-skel-lines"><i /><i /><i /></div>
          </div>
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="hm-band vd">
        <div className="hm-wrap">
          <div className="vd-card vd-fail">
            <p>{error || 'The verse of the day is unavailable right now.'}</p>
            <button type="button" className="sk-btn is-ink" onClick={loadToday}><RefreshCw size={16} /> Try again</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="hm-band vd" aria-labelledby="vd-h">
      <div className="hm-wrap">
        <div className="vd-card" data-reveal>
          <Quote className="vd-mark" size={220} strokeWidth={1.2} aria-hidden="true" data-depth="0.1" />

          {/* top bar */}
          <div className="vd-bar">
            <h2 id="vd-h" className="vd-label"><BookOpen size={15} aria-hidden="true" /> {tl ? 'Talata ngayong araw' : 'Verse of the day'}</h2>
            <div className="vd-seg" role="group" aria-label="Language">
              {[['en', 'EN'], ['tl', 'TL']].map(([v, l]) => (
                <button key={v} type="button" className={lang === v ? 'is-on' : ''} aria-pressed={lang === v} onClick={() => pickLang(v)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="vd-body">
            <div className="vd-date" aria-label={data.formatted_date || ''}>
              <b>{day}</b>
              <span>{mon}</span>
            </div>

            <div className="vd-main">
              {showSearch ? (
                <div className="vd-search">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      doSearch()
                    }}
                    role="search"
                  >
                    <label className="vd-field">
                      <Search size={17} aria-hidden="true" />
                      <input
                        ref={inputRef}
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={tl ? 'Hal. Juan 3:16, Awit 23' : 'e.g. John 3:16, Psalm 23'}
                        aria-label="Bible passage"
                        enterKeyHint="search"
                      />
                    </label>
                    <select
                      value={translation}
                      onChange={(e) => {
                        setTranslation(e.target.value)
                        if (q.trim()) doSearch(q, e.target.value)
                      }}
                      aria-label="Translation"
                    >
                      {TRANSLATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button type="submit" className="sk-btn" disabled={searching || !q.trim()}>
                      {searching ? (tl ? 'Hinahanap…' : 'Searching…') : (tl ? 'Hanapin' : 'Look up')}
                    </button>
                  </form>

                  <div className="vd-chips">
                    {QUICK_SEARCHES.map((c) => (
                      <button key={c} type="button" className={q === c ? 'is-on' : ''} onClick={() => { setQ(c); doSearch(c) }}>{c}</button>
                    ))}
                  </div>

                  {searchError && <p className="vd-err" role="alert">{searchError}</p>}

                  {result && (
                    <div className="vd-res" key={result.reference + result.translation_name}>
                      <p className="vd-ref"><b>{result.reference}</b> <span className="vd-tag">{result.translation_name}</span></p>
                      <blockquote className="vd-quote is-sm">{quoted(result.text)}</blockquote>
                      <div className="vd-actions">
                        <button type="button" className="sk-btn is-ink" onClick={shareResult}>
                          {resCopied ? <Check size={16} /> : <Share2 size={16} />} {resCopied ? (tl ? 'Nakopya' : 'Copied') : (tl ? 'Ibahagi' : 'Share')}
                        </button>
                        <button type="button" className="sk-btn is-line" onClick={prayFromResult}>
                          <MessageCircleHeart size={16} /> {tl ? 'Magsulat ng panalangin' : 'Write a prayer'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div key={tick} className="vd-swap">
                  {theme && <span className="vd-theme">{theme}</span>}
                  <blockquote className="vd-quote">{quoted(verse)}</blockquote>
                  <p className="vd-ref"><b>{ref}</b> <span className="vd-tag">{tag}</span></p>

                  <div className={`vd-refl${open ? ' is-open' : ''}`}>
                    <button type="button" className="vd-refl-btn" aria-expanded={open} aria-controls="vd-refl-body" onClick={() => setOpen((o) => !o)}>
                      <span>{title}</span>
                      <small>{tl ? '1 minutong pagbasa' : data.reading_time || '1 min read'}</small>
                      <ChevronDown size={18} aria-hidden="true" />
                    </button>
                    <div id="vd-refl-body" className="vd-refl-body" role="region" aria-label={title}>
                      <div>
                        <p>{reflection}</p>
                        {prayer && (
                          <p className="vd-pray">
                            <HeartHandshake size={16} aria-hidden="true" />
                            <span><b>{tl ? 'Panalangin' : 'Pray'}:</b> {prayer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="vd-actions">
                    <button type="button" className="sk-btn is-ink" onClick={shareVerse}>
                      {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? (tl ? 'Nakopya' : 'Copied') : (tl ? 'Ibahagi' : 'Share')}
                    </button>
                    <button type="button" className="sk-btn" onClick={prayFromVerse}>
                      <MessageCircleHeart size={16} /> {tl ? 'Magsulat ng panalangin' : 'Write a prayer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* footer tools */}
          <div className="vd-foot">
            <button type="button" className="vd-tool" aria-expanded={showSearch} onClick={() => { setShowSearch((s) => !s); setResult(null); setSearchError('') }}>
              {showSearch ? <X size={16} /> : <Search size={16} />}
              {showSearch ? (tl ? 'Bumalik sa talata ngayon' : "Back to today's verse") : (tl ? 'Maghanap sa Bibliya' : 'Search the Bible')}
            </button>
            {!showSearch && (
              <button type="button" className="vd-tool" onClick={loadRandom} disabled={fetchingNew}>
                <RefreshCw size={16} className={fetchingNew ? 'p-spin' : ''} /> {tl ? 'Iba pang talata' : 'Another verse'}
              </button>
            )}
            <Link to="/prayer" className="vd-tool vd-end">
              {tl ? 'Prayer Wall' : 'Prayer wall'} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
