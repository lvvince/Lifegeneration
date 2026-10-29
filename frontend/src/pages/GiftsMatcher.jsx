import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, ChevronRight, ChevronLeft, Check, ArrowRight,
  RefreshCw, HeartHandshake, Users, Loader2, Trophy
} from 'lucide-react'
import { apiGet, apiPost } from '../api.js'
import '../styles/pages.css'

const STEP_QUIZ     = 'quiz'
const STEP_LOADING  = 'loading'
const STEP_RESULT   = 'result'

export default function GiftsMatcher() {
  const navigate = useNavigate()
  const [step, setStep]           = useState(STEP_QUIZ)
  const [config, setConfig]       = useState(null)
  const [configErr, setConfigErr] = useState('')
  const [answers, setAnswers]     = useState({})
  const [currentQ, setCurrentQ]   = useState(0)
  const [result, setResult]       = useState(null)
  const [submitErr, setSubmitErr] = useState('')

  // Fetch quiz config on mount
  useEffect(() => {
    apiGet('/api/matcher/config')
      .then(setConfig)
      .catch(e => setConfigErr(e.message || 'Could not load quiz.'))
  }, [])

  const questions = config?.questions || []
  const totalQ    = questions.length
  const question  = questions[currentQ] || null

  const handleSelect = (optionKey) => {
    const qKey = question?.key
    if (!qKey) return
    setAnswers(prev => ({ ...prev, [qKey]: optionKey }))
  }

  const canGoNext  = () => question && answers[question.key]
  const isLastQ    = currentQ === totalQ - 1

  const handleNext = () => {
    if (!canGoNext()) return
    if (isLastQ) {
      submitAnswers()
    } else {
      setCurrentQ(q => q + 1)
    }
  }

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(q => q - 1)
  }

  const submitAnswers = async () => {
    setStep(STEP_LOADING)
    setSubmitErr('')
    try {
      const res = await apiPost('/api/matcher/suggest', { answers })
      setResult(res)
      setStep(STEP_RESULT)
    } catch (e) {
      setSubmitErr(e.message || 'Failed to process results.')
      setStep(STEP_QUIZ)
    }
  }

  const handleReset = () => {
    setStep(STEP_QUIZ)
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
    setSubmitErr('')
  }

  // ─── Progress bar
  const progressPct = totalQ > 0 ? Math.round(((currentQ + (answers[question?.key] ? 1 : 0)) / totalQ) * 100) : 0

  // ─── Loading screen
  if (step === STEP_LOADING) {
    return (
      <div className="pg-root" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #ff5a0a, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,90,10,0.3)' }}>
            <Sparkles size={36} color="#fff" />
          </div>
        </div>
        <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, margin: 0 }}>
          Discovering your gifts…
        </h2>
        <p style={{ fontSize: 14, color: 'var(--p-text-2, #586079)', maxWidth: 340, margin: 0 }}>
          We're matching your answers with the best ministry and discipleship group for you. This only takes a second.
        </p>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#ff5a0a' }} />
      </div>
    )
  }

  // ─── Results Screen
  if (step === STEP_RESULT && result) {
    const { personality, top_ministry, top_dgroup, all_ministry_scores, all_dgroup_scores } = result
    return (
      <div className="pg-root" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

        {/* Personality Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ff5a0a 0%, #fb923c 100%)',
            borderRadius: 24,
            padding: '32px 28px',
            color: '#fff',
            textAlign: 'center',
            marginBottom: 28,
            boxShadow: '0 12px 40px rgba(255, 90, 10, 0.3)'
          }}
        >
          <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 12 }}>🎉</div>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
            You are…
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900 }}>
            {personality?.label}
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, opacity: 0.92, maxWidth: 520, marginInline: 'auto' }}>
            {personality?.description}
          </p>
        </div>

        {/* Top picks grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 28 }}>

          {/* Best Ministry Match */}
          {top_ministry && (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: '22px 22px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                border: '2px solid #ff5a0a'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,90,10,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartHandshake size={20} color="#ff5a0a" />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ff5a0a' }}>
                    🏆 Best Ministry Match
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1f2e' }}>
                    {top_ministry.name}
                  </div>
                </div>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--p-text-2, #586079)', lineHeight: 1.5 }}>
                {top_ministry.description?.slice(0, 120)}{top_ministry.description?.length > 120 ? '…' : ''}
              </p>

              {/* All ministry scores mini bar */}
              <div style={{ marginBottom: 14 }}>
                {all_ministry_scores?.slice(0, 4).map((m, i) => {
                  const maxScore = all_ministry_scores[0]?.score || 1
                  const pct = Math.round((m.score / maxScore) * 100)
                  return (
                    <div key={m.id} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#ff5a0a' : '#586079', marginBottom: 2 }}>
                        <span>{m.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: '#f1f1f1', overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: i === 0 ? '#ff5a0a' : '#d1d5db', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <Link
                to="/ministries"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 12,
                  background: '#ff5a0a',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none'
                }}
              >
                <HeartHandshake size={14} />
                <span>Apply to {top_ministry.name}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Best D-Group Match */}
          {top_dgroup && (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: '22px 22px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                border: '2px solid #6366f1'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366f1' }}>
                    🏆 Best D-Group Match
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1f2e' }}>
                    {top_dgroup.name}
                  </div>
                </div>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--p-text-2, #586079)', lineHeight: 1.5 }}>
                {top_dgroup.description?.slice(0, 120)}{top_dgroup.description?.length > 120 ? '…' : ''}
              </p>

              {/* All dgroup scores mini bar */}
              <div style={{ marginBottom: 14 }}>
                {all_dgroup_scores?.slice(0, 4).map((g, i) => {
                  const maxScore = all_dgroup_scores[0]?.score || 1
                  const pct = maxScore > 0 ? Math.round((g.score / maxScore) * 100) : 0
                  return (
                    <div key={g.id} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#6366f1' : '#586079', marginBottom: 2 }}>
                        <span>{g.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: '#f1f1f1', overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: i === 0 ? '#6366f1' : '#d1d5db', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <Link
                to="/dgroups"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 12,
                  background: '#6366f1',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none'
                }}
              >
                <Users size={14} />
                <span>Join {top_dgroup.name}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 12,
              border: '1px solid var(--p-border, #e5e8f1)',
              background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}
          >
            <RefreshCw size={14} />
            <span>Retake Quiz</span>
          </button>

          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 12,
              background: 'var(--p-text, #1a1f2e)',
              color: '#fff', fontWeight: 600, fontSize: 13,
              textDecoration: 'none'
            }}
          >
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  // ─── Quiz Screen
  if (configErr) {
    return (
      <div className="pg-root" style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#dc2626' }}>{configErr}</p>
        <button onClick={() => window.location.reload()} className="p-btn p-btn-primary p-btn-sm" style={{ marginTop: 16 }}>Retry</button>
      </div>
    )
  }

  if (!config || !question) {
    return (
      <div className="pg-root" style={{ textAlign: 'center', padding: 60 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#ff5a0a' }} />
        <p style={{ marginTop: 12, color: 'var(--p-text-2)' }}>Loading quiz…</p>
      </div>
    )
  }

  return (
    <div className="pg-root" style={{ maxWidth: 660, margin: '0 auto', padding: '32px 20px' }}>

      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            background: 'rgba(255, 90, 10, 0.1)',
            color: '#ff5a0a', fontWeight: 800, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 14
          }}
        >
          <Sparkles size={13} />
          Spiritual Gifts &amp; Community Matcher
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, lineHeight: 1.2 }}>
          Find where you <em style={{ color: '#ff5a0a', fontStyle: 'normal' }}>belong</em> &amp; <em style={{ color: '#ff5a0a', fontStyle: 'normal' }}>thrive</em>
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--p-text-2, #586079)', maxWidth: 480, marginInline: 'auto', lineHeight: 1.5 }}>
          Answer {totalQ} quick questions and we'll recommend the perfect Volunteer Team and D-Group where your gifts will shine.
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-text-2)' }}>
            Question {currentQ + 1} of {totalQ}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ff5a0a' }}>
            {progressPct}% done
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div
            style={{
              width: progressPct + '%',
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(90deg, #ff5a0a, #fb923c)',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '28px 26px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid var(--p-border, #e5e8f1)',
          marginBottom: 20
        }}
      >
        {/* Question */}
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{question.icon}</div>
          <h2 style={{ margin: 0, fontSize: 'clamp(17px, 2.5vw, 21px)', fontWeight: 800, lineHeight: 1.3, color: '#1a1f2e' }}>
            {question.question}
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gap: 10 }}>
          {question.options?.map(opt => {
            const selected = answers[question.key] === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 16px',
                  borderRadius: 14,
                  border: selected
                    ? '2px solid #ff5a0a'
                    : '1.5px solid var(--p-border, #e5e8f1)',
                  background: selected
                    ? 'linear-gradient(135deg, rgba(255,90,10,0.07) 0%, rgba(251,146,60,0.06) 100%)'
                    : '#fafafa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  boxShadow: selected ? '0 4px 14px rgba(255,90,10,0.15)' : 'none'
                }}
              >
                {/* Emoji badge */}
                <div
                  style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: selected ? 'rgba(255,90,10,0.12)' : 'rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, transition: 'background 0.15s'
                  }}
                >
                  {opt.emoji}
                </div>

                {/* Label + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: selected ? '#ff5a0a' : '#1a1f2e' }}>
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div style={{ fontSize: 12, color: 'var(--p-text-2, #586079)', marginTop: 2, lineHeight: 1.4 }}>
                      {opt.description}
                    </div>
                  )}
                </div>

                {/* Check indicator */}
                {selected && (
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#ff5a0a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {submitErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {submitErr}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={handleBack}
          disabled={currentQ === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '11px 20px', borderRadius: 12,
            border: '1px solid var(--p-border, #e5e8f1)',
            background: '#fff', cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: 13,
            opacity: currentQ === 0 ? 0.4 : 1
          }}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 28px', borderRadius: 12,
            background: canGoNext() ? '#ff5a0a' : '#d1d5db',
            color: '#fff', cursor: canGoNext() ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: 14, border: 0,
            boxShadow: canGoNext() ? '0 4px 14px rgba(255,90,10,0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {isLastQ ? (
            <>
              <Sparkles size={15} />
              See My Matches
            </>
          ) : (
            <>
              Next
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
        {questions.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentQ ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i < currentQ ? '#fb923c' : i === currentQ ? '#ff5a0a' : '#e5e7eb',
              transition: 'all 0.25s ease'
            }}
          />
        ))}
      </div>
    </div>
  )
}

