import { useState, useEffect, useRef, useCallback } from 'react'
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
import '../styles/findplace.css'

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
  worship_arts:        Music,
  technology:          Monitor,
  hospitality:         HandHeart,
  evangelism:          Globe,
  children_care:       HeartHandshake,
  teaching:            BookOpen,
  encouragement:       Heart,

  // Serve style
  on_stage:            Mic2,
  behind_camera:       Camera,
  greet_people:        Users,
  community_hands:     Globe,
  kids_teaching:       BookOpen,
  street_outreach:     Navigation,
  small_groups:        UsersRound,
  one_on_one:          MessageCircle,

  // Life stage
  high_school_college: GraduationCap,
  minsu_student:       Building2,
  young_professional:  Briefcase,
  young_men:           Shield,
  young_women:         Heart,
  high_school:         GraduationCap,
  college:             BookOpen,
  early_career:        Briefcase,
  single_professional: User,
  married:             Heart,
  married_kids:        Users,

  // Availability
  sat_afternoon:       Sun,
  sat_evening:         Sunset,
  fri_evening:         Moon,
  mon_morning:         Sunrise,
  saturday_afternoon:  Sun,
  saturday_morning:    Sunrise,
  sunday_after:        Star,
  weekday_evening:     Moon,
  flexible:            RefreshCw,

  // Community desire
  grow_in_faith:          BookOpen,
  brotherhood_sisterhood: UsersRound,
  campus_impact:          Rocket,
  use_gifts:              Sparkles,
  mentor_others:          Crown,
  meet_new_friends:       UserPlus,
  get_accountability:     Shield,
  serve_community:        Globe,
  grow_as_couple:         Heart,
}

// Personality key → icon + accent color
const PERSONALITY_META = {
  worship:             { icon: Music,          color: '#e85d04' },
  media:               { icon: Monitor,        color: '#2563eb' },
  hospitality:         { icon: HandHeart,      color: '#db2777' },
  outreach:            { icon: Globe,          color: '#16a34a' },
  children:            { icon: HeartHandshake, color: '#7c3aed' },
  creative_expressive: { icon: Brush,          color: '#e85d04' },
  tech_builder:        { icon: Cpu,            color: '#2563eb' },
  people_lover:        { icon: Heart,          color: '#db2777' },
  mission_driven:      { icon: Rocket,         color: '#16a34a' },
  quiet_faithful:      { icon: BookOpen,       color: '#7c3aed' },
  natural_leader:      { icon: Crown,          color: '#d97706' },
}

// Fallback icon for unknown keys
const DEFAULT_ICON = Sparkles

function getOptionIcon(key) {
  return OPTION_ICONS[key] || DEFAULT_ICON
}
function getQuestionIcon(key) {
  return QUESTION_ICONS[key] || Gift
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

  // ── Card flip animation state ──────────────────────────────────────────────
  // flipPhase: 'idle' | 'out' | 'in'
  // flipDir: 'forward' | 'back'
  const [flipPhase, setFlipPhase]   = useState('idle')
  const [flipDir, setFlipDir]       = useState('forward')
  const [displayQ, setDisplayQ]     = useState(0)   // the question index SHOWN (may lag during flip)
  const flipTimerRef                = useRef(null)

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

  // ── Flip helpers ────────────────────────────────────────────────────────────
  const triggerFlip = useCallback((dir, afterFlip) => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
    setFlipDir(dir)
    setFlipPhase('out')
    // After out animation (320ms), swap question then flip in
    flipTimerRef.current = setTimeout(() => {
      afterFlip()
      setFlipPhase('in')
      flipTimerRef.current = setTimeout(() => {
        setFlipPhase('idle')
      }, 350)
    }, 320)
  }, [])

  const handleNext = () => {
    if (!canGoNext()) return
    if (isLastQ) {
      triggerFlip('forward', () => submitAnswers())
    } else {
      triggerFlip('forward', () => {
        setCurrentQ(q => q + 1)
        setDisplayQ(q => q + 1)
      })
    }
  }

  const handleBack = () => {
    if (currentQ === 0) return
    triggerFlip('back', () => {
      setCurrentQ(q => q - 1)
      setDisplayQ(q => q - 1)
    })
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
    setDisplayQ(0)
    setResult(null)
    setSubmitErr('')
    setFlipPhase('idle')
  }

  const progressPct = totalQ > 0
    ? Math.round(((currentQ + (answers[question?.key] ? 1 : 0)) / totalQ) * 100)
    : 0

  // Determine CSS class for the card
  const cardFlipClass = flipPhase === 'out'
    ? (flipDir === 'forward' ? 'gm-card--flip-out' : 'gm-card--flip-out-back')
    : flipPhase === 'in'
    ? (flipDir === 'forward' ? 'gm-card--flip-in' : 'gm-card--flip-in-back')
    : ''


  const pad = (n) => String(n).padStart(2, '0')
  const clip = (t, n = 160) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : t || '')

  // ── Loading ──────────────────────────────────────────────────────────────
  if (step === STEP_LOADING) {
    return (
      <div className="pg-root fm fm-center" role="status" aria-live="polite">
        <div className="fm-scan" aria-hidden="true"><span /><span /><span /><span /></div>
        <h2 className="fm-load-title">Finding your place</h2>
        <p className="fm-load-copy">Matching your answers with the ministry team and D-Group that fit you best.</p>
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (step === STEP_RESULT && result) {
    const { personality, top_ministry, top_dgroup, all_ministry_scores, all_dgroup_scores } = result
    const pMeta = personality?.key ? (PERSONALITY_META[personality.key] || { icon: Star }) : { icon: Star }
    const PersonalityIcon = pMeta.icon

    const Match = ({ kind, item, scores, to, cta, Icon }) => {
      const top = scores?.[0]?.score || 1
      return (
        <article className="fm-match">
          <header className="fm-match-head">
            <span className="fm-match-ico" aria-hidden="true"><Icon size={20} /></span>
            <p className="fm-eyebrow">{kind}</p>
          </header>
          <h3 className="fm-match-name">{item.name}</h3>
          {item.description && <p className="fm-match-desc">{clip(item.description, 180)}</p>}
          <ol className="fm-bars" aria-label={`${kind} ranking`}>
            {scores?.slice(0, 4).map((s, i) => {
              const pct = top > 0 ? Math.round((s.score / top) * 100) : 0
              return (
                <li key={s.id} className={i === 0 ? 'is-top' : ''} style={{ '--d': `${i * 90}ms` }}>
                  <span className="fm-bar-name">{s.name}</span>
                  <span className="fm-bar-pct">{pct}%</span>
                  <span className="fm-bar-track"><i style={{ width: `${pct}%` }} /></span>
                </li>
              )
            })}
          </ol>
          <Link to={to} className="fm-btn fm-btn-solid">
            <span>{cta}</span><ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
      )
    }

    return (
      <div className="pg-root fm fm-results">
        <header className="fm-res-hero">
          <p className="fm-eyebrow"><Sparkles size={14} aria-hidden="true" /> Your result</p>
          {personality && (
            <div className="fm-persona">
              <span className="fm-persona-ico" aria-hidden="true"><PersonalityIcon size={30} /></span>
              <div>
                <h1 className="fm-persona-name">{personality.label}</h1>
                {personality.description && <p className="fm-persona-desc">{personality.description}</p>}
              </div>
            </div>
          )}
        </header>

        <div className="fm-matches">
          {top_ministry && <Match kind="Best ministry match" item={top_ministry} scores={all_ministry_scores} to="/ministries" cta={`Apply to ${top_ministry.name}`} Icon={HeartHandshake} />}
          {top_dgroup && <Match kind="Best D-Group match" item={top_dgroup} scores={all_dgroup_scores} to="/dgroups" cta={`Join ${top_dgroup.name}`} Icon={Users} />}
        </div>

        <div className="fm-actions">
          <button type="button" className="fm-btn" onClick={handleReset}><RefreshCw size={16} aria-hidden="true" /> Retake quiz</button>
          <Link to="/dashboard" className="fm-btn fm-btn-ghost">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  // ── Quiz: error / loading ────────────────────────────────────────────────
  if (configErr) {
    return (
      <div className="pg-root fm fm-center">
        <p className="fm-err" role="alert">{configErr}</p>
        <button type="button" className="fm-btn fm-btn-solid" onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }
  if (!config || !question) {
    return (
      <div className="pg-root fm fm-center" role="status">
        <div className="fm-scan" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="fm-load-copy">Loading quiz…</p>
      </div>
    )
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const QuestionIcon = getQuestionIcon(question.key)
  const phaseClass = flipPhase === 'idle' ? '' : `fm-${flipPhase}-${flipDir}`

  return (
    <div className="pg-root fm">
      <aside className="fm-rail">
        <p className="fm-eyebrow">Discover your fit</p>
        <h1 className="fm-title"><span>Find</span> <span>my</span> <em>place</em></h1>
        <p className="fm-lede">Answer {totalQ} quick questions to find your best-fit volunteer team and D-Group.</p>

        <ol className="fm-steps" aria-label="Progress">
          {questions.map((q, i) => (
            <li key={q.key} className={i < currentQ || (i === currentQ && answers[q.key]) ? 'is-done' : i === currentQ ? 'is-now' : ''} aria-current={i === currentQ ? 'step' : undefined}>
              <b>{pad(i + 1)}</b><span>{(q.title || q.label || q.key).toString().replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ol>
      </aside>

      <section className="fm-stage" aria-labelledby="fm-q">
        <div className="fm-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct} aria-label="Quiz progress">
          <i style={{ width: `${progressPct}%` }} />
        </div>
        <div className="fm-count"><span><b>{pad(currentQ + 1)}</b> / {pad(totalQ)}</span><span>{progressPct}%</span></div>

        <div className={`fm-panel ${phaseClass}`}>
          <div className="fm-q-head">
            <span className="fm-q-ico" aria-hidden="true"><QuestionIcon size={22} /></span>
            <h2 id="fm-q" className="fm-q">{question.question}</h2>
          </div>

          <div className="fm-opts" role="radiogroup" aria-labelledby="fm-q">
            {question.options?.map((opt, i) => {
              const selected = answers[question.key] === opt.key
              const OptionIcon = getOptionIcon(opt.key)
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`fm-opt${selected ? ' is-on' : ''}`}
                  style={{ '--i': i }}
                  onClick={() => flipPhase === 'idle' && handleSelect(opt.key)}
                >
                  <span className="fm-opt-key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="fm-opt-ico" aria-hidden="true"><OptionIcon size={18} /></span>
                  <span className="fm-opt-txt">
                    <strong>{opt.label}</strong>
                    {opt.description && <small>{opt.description}</small>}
                  </span>
                  <span className="fm-opt-tick" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                </button>
              )
            })}
          </div>
        </div>

        {submitErr && <p className="fm-err" role="alert">{submitErr}</p>}

        <div className="fm-nav" role="group" aria-label="Quiz navigation">
          <button type="button" className="fm-btn" onClick={handleBack} disabled={currentQ === 0 || flipPhase !== 'idle'}>
            <ChevronLeft size={16} aria-hidden="true" /> Back
          </button>
          <button type="button" className="fm-btn fm-btn-solid" onClick={handleNext} disabled={!canGoNext() || flipPhase !== 'idle'}>
            <span>{isLastQ ? 'See my results' : 'Next'}</span>
            {isLastQ ? <Sparkles size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </section>
    </div>
  )
}
