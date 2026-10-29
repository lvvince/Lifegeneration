import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Gift, Zap, Wrench, Calendar, Star, Compass, Heart,
  Music, Monitor, Globe, BookOpen, Mic2, Camera,
  HandHeart, Users, MessageCircle, Brush, ClipboardList,
  Sun, Sunrise, Sunset, Moon, RefreshCw, Settings, Target,
  Briefcase, User, UserPlus, Shield, Award,
  ChevronLeft, ChevronRight, Check, ArrowRight, Loader2,
  HeartHandshake, Sparkles, Crown, GraduationCap,
  Navigation, UsersRound, Cpu, Rocket, Handshake,
  Flame, Building2
} from 'lucide-react'
import { apiGet, apiPost } from '../api.js'
import '../styles/pages.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const STEP_QUIZ    = 'quiz'
const STEP_LOADING = 'loading'
const STEP_RESULT  = 'result'

// Question key → Lucide icon component
const QUESTION_ICONS = {
  gift:             Gift,
  serve_style:      Zap,
  skills:           Wrench,
  availability:     Calendar,
  personality:      Star,
  life_stage:       Compass,
  community_desire: Heart,
}

// Option key → Lucide icon component
const OPTION_ICONS = {
  // Gift options
  worship_arts:       Music,
  technology:         Monitor,
  hospitality:        HandHeart,
  evangelism:         Globe,
  teaching:           BookOpen,
  encouragement:      Heart,

  // Serve style
  on_stage:           Mic2,
  behind_camera:      Camera,
  greet_people:       Users,
  street_outreach:    Navigation,
  small_groups:       UsersRound,
  one_on_one:         MessageCircle,

  // Skills
  singing_playing:    Music,
  video_sound_tech:   Monitor,
  public_speaking:    Mic2,
  graphic_design:     Brush,
  people_skills:      Handshake,
  organizing:         ClipboardList,

  // Availability
  saturday_afternoon: Sun,
  saturday_morning:   Sunrise,
  friday_evening:     Sunset,
  sunday_after:       Star,
  weekday_evening:    Moon,
  flexible:           RefreshCw,

  // Personality
  creative_expressive: Brush,
  tech_builder:        Cpu,
  people_lover:        Heart,
  mission_driven:      Target,
  quiet_faithful:      BookOpen,
  natural_leader:      Crown,

  // Life stage
  high_school:         GraduationCap,
  college:             BookOpen,
  early_career:        Briefcase,
  single_professional: User,
  married:             Heart,
  married_kids:        Users,

  // Community desire
  grow_in_faith:       BookOpen,
  meet_new_friends:    UserPlus,
  use_my_gifts:        Sparkles,
  get_accountability:  Shield,
  serve_community:     Globe,
  grow_as_couple:      Heart,
}

// Personality key → icon + accent color
const PERSONALITY_META = {
  creative_expressive: { icon: Brush,     color: '#e85d04' },
  tech_builder:        { icon: Cpu,       color: '#2563eb' },
  people_lover:        { icon: Heart,     color: '#db2777' },
  mission_driven:      { icon: Rocket,    color: '#16a34a' },
  quiet_faithful:      { icon: BookOpen,  color: '#7c3aed' },
  natural_leader:      { icon: Crown,     color: '#d97706' },
}

// Fallback icon for unknown keys
const DEFAULT_ICON = Sparkles

function getOptionIcon(key) {
  return OPTION_ICONS[key] || DEFAULT_ICON
}
function getQuestionIcon(key) {
  return QUESTION_ICONS[key] || Gift
}

// ─── Shared style helpers ──────────────────────────────────────────────────────
const card = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--p-border, #e5e8f1)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GiftsMatcher() {
  const [step, setStep]           = useState(STEP_QUIZ)
  const [config, setConfig]       = useState(null)
  const [configErr, setConfigErr] = useState('')
  const [answers, setAnswers]     = useState({})
  const [currentQ, setCurrentQ]   = useState(0)
  const [result, setResult]       = useState(null)
  const [submitErr, setSubmitErr] = useState('')

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

  const canGoNext = () => question && answers[question.key]
  const isLastQ   = currentQ === totalQ - 1

  const handleNext = () => {
    if (!canGoNext()) return
    if (isLastQ) submitAnswers()
    else setCurrentQ(q => q + 1)
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

  const progressPct = totalQ > 0
    ? Math.round(((currentQ + (answers[question?.key] ? 1 : 0)) / totalQ) * 100)
    : 0

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === STEP_LOADING) {
    return (
      <div
        className="pg-root"
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          textAlign: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'rgba(255, 90, 10, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={30} color="#ff5a0a" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1a1f2e' }}>
            Finding your place…
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--p-text-2, #586079)', maxWidth: 320 }}>
            Matching your answers with the best ministry team and discipleship group for you.
          </p>
        </div>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (step === STEP_RESULT && result) {
    const { personality, top_ministry, top_dgroup, all_ministry_scores, all_dgroup_scores } = result

    // Pick personality icon + color
    const pMeta = personality?.key
      ? (PERSONALITY_META[personality.key] || { icon: Star, color: '#ff5a0a' })
      : { icon: Star, color: '#ff5a0a' }
    const PersonalityIcon = pMeta.icon

    return (
      <div className="pg-root" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 48px' }}>

        {/* ── Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,90,10,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color="#ff5a0a" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ff5a0a' }}>
            Your Results
          </span>
        </div>

        {/* ── Personality card */}
        {personality && (
          <div
            style={{
              ...card,
              padding: '28px 26px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: pMeta.color + '18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PersonalityIcon size={26} color={pMeta.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--p-text-2, #586079)',
                }}
              >
                Your personality type
              </p>
              <h2
                style={{
                  margin: '0 0 8px',
                  fontSize: 'clamp(20px, 3vw, 26px)',
                  fontWeight: 900,
                  color: '#1a1f2e',
                  lineHeight: 1.2,
                }}
              >
                {personality.label}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--p-text-2, #586079)',
                  lineHeight: 1.6,
                }}
              >
                {personality.description}
              </p>
            </div>
          </div>
        )}

        {/* ── Matches grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Ministry match */}
          {top_ministry && (
            <div style={{ ...card, padding: '22px 22px', borderLeft: '3px solid #ff5a0a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(255,90,10,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <HeartHandshake size={19} color="#ff5a0a" />
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10.5,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#ff5a0a',
                    }}
                  >
                    Best Ministry Match
                  </p>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#1a1f2e',
                      lineHeight: 1.3,
                    }}
                  >
                    {top_ministry.name}
                  </h3>
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 13,
                  color: 'var(--p-text-2, #586079)',
                  lineHeight: 1.55,
                }}
              >
                {top_ministry.description?.slice(0, 120)}
                {top_ministry.description?.length > 120 ? '…' : ''}
              </p>

              {/* Score bars */}
              <div style={{ marginBottom: 16 }}>
                {all_ministry_scores?.slice(0, 4).map((m, i) => {
                  const maxScore = all_ministry_scores[0]?.score || 1
                  const pct = Math.round((m.score / maxScore) * 100)
                  return (
                    <div key={m.id} style={{ marginBottom: 7 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          fontWeight: i === 0 ? 700 : 500,
                          color: i === 0 ? '#ff5a0a' : '#586079',
                          marginBottom: 3,
                        }}
                      >
                        <span>{m.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: '#f1f3f7', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: pct + '%',
                            height: '100%',
                            borderRadius: 4,
                            background: i === 0 ? '#ff5a0a' : '#d1d5db',
                            transition: 'width 0.6s ease',
                          }}
                        />
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
                  borderRadius: 10,
                  background: '#ff5a0a',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                <HeartHandshake size={14} />
                <span>Apply to {top_ministry.name}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* D-Group match */}
          {top_dgroup && (
            <div style={{ ...card, padding: '22px 22px', borderLeft: '3px solid #6366f1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(99,102,241,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Users size={19} color="#6366f1" />
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10.5,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#6366f1',
                    }}
                  >
                    Best D-Group Match
                  </p>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#1a1f2e',
                      lineHeight: 1.3,
                    }}
                  >
                    {top_dgroup.name}
                  </h3>
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 13,
                  color: 'var(--p-text-2, #586079)',
                  lineHeight: 1.55,
                }}
              >
                {top_dgroup.description?.slice(0, 120)}
                {top_dgroup.description?.length > 120 ? '…' : ''}
              </p>

              {/* Score bars */}
              <div style={{ marginBottom: 16 }}>
                {all_dgroup_scores?.slice(0, 4).map((g, i) => {
                  const maxScore = all_dgroup_scores[0]?.score || 1
                  const pct = maxScore > 0 ? Math.round((g.score / maxScore) * 100) : 0
                  return (
                    <div key={g.id} style={{ marginBottom: 7 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          fontWeight: i === 0 ? 700 : 500,
                          color: i === 0 ? '#6366f1' : '#586079',
                          marginBottom: 3,
                        }}
                      >
                        <span>{g.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: '#f1f3f7', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: pct + '%',
                            height: '100%',
                            borderRadius: 4,
                            background: i === 0 ? '#6366f1' : '#d1d5db',
                            transition: 'width 0.6s ease',
                          }}
                        />
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
                  borderRadius: 10,
                  background: '#6366f1',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                <Users size={14} />
                <span>Join {top_dgroup.name}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* ── Action row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid var(--p-border, #e5e8f1)',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              color: '#1a1f2e',
            }}
          >
            <RefreshCw size={14} />
            Retake Quiz
          </button>

          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: 10,
              background: 'var(--p-text, #1a1f2e)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Quiz: error / loading states ───────────────────────────────────────────
  if (configErr) {
    return (
      <div className="pg-root" style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#dc2626', fontSize: 14 }}>{configErr}</p>
        <button
          onClick={() => window.location.reload()}
          className="p-btn p-btn-primary p-btn-sm"
          style={{ marginTop: 16 }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!config || !question) {
    return (
      <div className="pg-root" style={{ textAlign: 'center', padding: 60 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#ff5a0a' }} />
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--p-text-2)' }}>Loading quiz…</p>
      </div>
    )
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────
  const QuestionIcon = getQuestionIcon(question.key)

  return (
    <div className="pg-root" style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,90,10,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={17} color="#ff5a0a" />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#ff5a0a',
            }}
          >
            Spiritual Gifts Matcher
          </span>
        </div>

        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 'clamp(22px, 4vw, 28px)',
            fontWeight: 900,
            color: '#1a1f2e',
            lineHeight: 1.2,
          }}
        >
          Find where you{' '}
          <span style={{ color: '#ff5a0a' }}>belong</span>
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--p-text-2, #586079)',
            lineHeight: 1.55,
          }}
        >
          Answer {totalQ} quick questions and we'll recommend the right Volunteer Team and D-Group for you.
        </p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-text-2)' }}>
            Question {currentQ + 1} of {totalQ}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ff5a0a' }}>
            {progressPct}%
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 4, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div
            style={{
              width: progressPct + '%',
              height: '100%',
              borderRadius: 4,
              background: '#ff5a0a',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        style={{
          ...card,
          padding: '26px 24px',
          marginBottom: 16,
        }}
      >
        {/* Question label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255,90,10,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <QuestionIcon size={22} color="#ff5a0a" />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(16px, 2.5vw, 19px)',
              fontWeight: 800,
              color: '#1a1f2e',
              lineHeight: 1.3,
            }}
          >
            {question.question}
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gap: 8 }}>
          {question.options?.map(opt => {
            const selected    = answers[question.key] === opt.key
            const OptionIcon  = getOptionIcon(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: selected
                    ? '1.5px solid #ff5a0a'
                    : '1.5px solid var(--p-border, #e5e8f1)',
                  background: selected ? 'rgba(255,90,10,0.04)' : '#fafbfd',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'border-color 0.15s, background 0.15s',
                  outline: 'none',
                }}
              >
                {/* Icon badge */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: selected ? 'rgba(255,90,10,0.12)' : 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  <OptionIcon size={17} color={selected ? '#ff5a0a' : '#586079'} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: selected ? '#ff5a0a' : '#1a1f2e',
                      transition: 'color 0.15s',
                    }}
                  >
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--p-text-2, #586079)',
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {opt.description}
                    </div>
                  )}
                </div>

                {/* Check dot */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: selected ? 'none' : '1.5px solid #d1d5db',
                    background: selected ? '#ff5a0a' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Submit error */}
      {submitErr && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(220,38,38,0.07)',
            color: '#dc2626',
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {submitErr}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={handleBack}
          disabled={currentQ === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid var(--p-border, #e5e8f1)',
            background: '#fff',
            cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 13,
            color: '#1a1f2e',
            opacity: currentQ === 0 ? 0.4 : 1,
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 26px',
            borderRadius: 10,
            background: canGoNext() ? '#ff5a0a' : '#d1d5db',
            color: '#fff',
            cursor: canGoNext() ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: 14,
            border: 0,
            transition: 'background 0.15s',
          }}
        >
          {isLastQ ? (
            <>
              <Award size={15} />
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

      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 22 }}>
        {questions.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentQ ? 18 : 7,
              height: 7,
              borderRadius: 4,
              background: i < currentQ ? '#fb923c' : i === currentQ ? '#ff5a0a' : '#e5e7eb',
              transition: 'all 0.25s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}
