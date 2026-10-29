import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiGet, apiPost, getUser, setUser, API_URL } from '../../api.js'
import { resolveImageUrl, initials } from '../../lib/format.js'
import { ArrowRight, Cake, Calendar, CalendarDays, CalendarPlus, Camera, Check, CheckCircle, Clock, Download, Edit3, HeartHandshake, MapPin, QrCode, Shield, Ticket, Trash2, Upload, User, Users, X } from 'lucide-react'
import { addToGoogleCalendar } from '../../utils/calendar.js'
import '../../styles/pages.css'
import AttendanceHistory from '../../components/portal/AttendanceHistory.jsx'

// Digital Attendance Pass Modal
function DigitalPassModal({ memberId, name, email, avatarUrl, tier, role, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(memberId)}&margin=10`

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `LifeGen_Pass_${memberId}.png`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(17,17,17,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          border: '2px solid #111',
          borderRadius: 24,
          maxWidth: 390,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '8px 8px 0 #111',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Pass Top Card Header — Orange & Blue Brand Palette */}
        <div style={{
          background: 'linear-gradient(160deg, #ff7430 0%, #ff5a0a 60%, #ee4b00 100%)',
          borderBottom: '2px solid #111',
          padding: '24px 20px',
          color: '#111',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: '#111',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={16} />
          </button>

          <img
            src="/logo.png"
            alt="LifeGen"
            style={{ width: 44, height: 44, objectFit: 'contain', margin: '0 auto 8px' }}
          />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: -0.3, color: '#111', textTransform: 'uppercase' }}>
            Life Generation Calapan
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#111', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>
            Official Event Attendance Pass
          </p>
        </div>

        {/* Pass Body with Member Details & QR */}
        <div style={{ padding: '24px 24px', textAlign: 'center' }}>
          {/* Member Avatar */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '-48px auto 12px',
            border: '3px solid #111',
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.3rem',
            boxShadow: 'none'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials(name)
            )}
          </div>

          <h4 style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 900, color: '#111' }}>
            {name}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#55524e' }}>
            {email} &bull; <span style={{ color: '#c2410c', fontWeight: 800 }}>{tier || 'Standard Member'}</span>
          </p>

          {/* QR Code Container */}
          <div style={{
            background: '#fff',
            border: '2px solid #111',
            borderRadius: 18,
            padding: 12,
            display: 'inline-block',
            boxShadow: 'none',
            marginBottom: 14
          }}>
            <img
              src={qrUrl}
              alt={`Attendance QR for ${memberId}`}
              style={{ width: 190, height: 190, display: 'block', margin: '0 auto' }}
            />
          </div>

          {/* Member ID Code */}
          <div style={{
            background: '#f4f1ed',
            border: '2px solid #111',
            borderRadius: 14,
            padding: '9px 14px',
            marginBottom: 16
          }}>
            <div style={{ fontSize: '0.7rem', color: '#c2410c', textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 700 }}>
              Member Check-In ID
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#111', fontFamily: 'monospace', letterSpacing: 1.5, marginTop: 2 }}>
              {memberId}
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#55524e', lineHeight: 1.5, margin: '0 0 20px' }}>
            Present this QR code to the usher or registration desk at the church entrance for instant check-in.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                flex: 1.3,
                background: 'linear-gradient(180deg, #ff6d22 0%, #f24e00 100%)',
                color: '#111',
                border: '2px solid #111',
                borderRadius: 99,
                padding: '11px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
                                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Download size={15} /> Save QR Image
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: '#fff',
                color: '#111',
                border: '2px solid #111',
                borderRadius: 99,
                padding: '11px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f1ed'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [profile, setProfile] = useState(getUser())
  const [myEvents, setMyEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', age: '', address: '', bio: '' })
  const [saveMsg, setSaveMsg] = useState('')
  const fileInputRef = useRef(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await apiGet('/api/auth/me')
      if (res?.user) {
        setProfile(res.user)
        setUser(res.user)
        setEditForm({
          full_name: res.user.full_name || '',
          gender: res.user.gender || res.user.member?.gender || '',
          age: res.user.age || res.user.member?.age || '',
          address: res.user.address || res.user.member?.address || '',
          bio: res.user.bio || res.user.member?.bio || ''
        })
      }

      const evs = await apiGet('/api/events')
      if (Array.isArray(evs)) {
        setMyEvents(evs.filter((e) => e.user_rsvp === 'attending'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setSaveMsg('')
    try {
      const token = localStorage.getItem('access_token')
      const fd = new FormData()
      fd.append('avatar', file)

      const res = await fetch(`${API_URL}/api/members/upload-avatar`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: fd
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setSaveMsg('Profile picture updated successfully!')
      const updatedUser = {
        ...profile,
        avatar: data.avatar,
        member: { ...(profile?.member || {}), avatar: data.avatar }
      }
      setProfile(updatedUser)
      setUser(updatedUser)
      loadData()
    } catch (err) {
      alert(err.message || 'Error uploading profile picture.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return

    setUploading(true)
    setSaveMsg('')
    try {
      await apiPost('/api/members/remove-avatar')
      setSaveMsg('Profile picture removed.')
      const updatedUser = {
        ...profile,
        avatar: null,
        member: { ...(profile?.member || {}), avatar: null }
      }
      setProfile(updatedUser)
      setUser(updatedUser)
      loadData()
    } catch (err) {
      alert(err.message || 'Error removing profile picture.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/members/update', {
        user_id: profile.id,
        full_name: editForm.full_name,
        gender: editForm.gender,
        age: editForm.age,
        address: editForm.address,
        bio: editForm.bio
      })
      setSaveMsg('Profile saved successfully!')
      setEditMode(false)
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to update profile.')
    }
  }

  const member = profile?.member || {}
  const memberId = profile?.member_id || member?.member_id || 'LG-2026-PENDING'
  const name = profile?.full_name || profile?.username || 'LifeGen Member'
  const avatarUrl = resolveImageUrl(profile?.avatar || member?.avatar)

  const { pathname } = useLocation()
  const first = String(name).split(' ')[0]

  // /dashboard/profile -> dumiretso sa personal details pagkatapos mag-load
  useEffect(() => {
    if (!loading && pathname.endsWith('/profile')) {
      document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [pathname, loading])

  const groups = [
    { label: 'my discipleship group', value: member.dgroup_name, empty: 'Not in a group yet', text: member.dgroup_name ? 'Connected in weekly fellowship and study.' : 'Groups help you grow in faith with friends your age.', to: '/dgroups', cta: member.dgroup_name ? 'View D-Groups' : 'Find a group' },
    { label: 'my ministry service', value: member.ministry_name, empty: 'Not on a team yet', text: member.ministry_name ? 'Serving with your ministry team.' : 'Use your gifts to serve the community.', to: '/ministries', cta: member.ministry_name ? 'View ministries' : 'Apply to serve' },
  ]
  const quick = [
    ['/events', 'events'],
    ['/dgroups', 'd-groups'],
    ['/ministries', 'ministries'],
    ['/prayer', 'prayer wall'],
  ]

  return (
    <>
      {/* ===== 1. hero (blue) ===== */}
      <section className="fb fb-blue">
        <div className="fb-in fb-split">
          <div>
            <div className="fb-who">
              <div className="fb-av">
                <span>{avatarUrl ? <img src={avatarUrl} alt="" draggable="false" /> : initials(name)}</span>
                <button type="button" className="fb-cam" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Change profile picture">
                  <Camera size={18} />
                </button>
              </div>
              <div>
                <div className="fb-pills">
                  <span className="fb-pill">{profile?.role === 'admin' ? 'Administrator' : profile?.membership_tier || 'Standard Member'}</span>
                  {profile?.email && <span className="fb-pill">{profile.email}</span>}
                </div>
              </div>
            </div>
            <h1 style={{ marginTop: 22 }}>
              hey, <em className="hl">{first}</em>!
            </h1>
            <p style={{ fontSize: '1.15rem', maxWidth: '34ch', margin: '4px 0 14px' }}>Welcome to your Life Generation space.</p>
            {/* Prominent Bio Box right in Hero */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1.5px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 14,
                padding: '12px 16px',
                maxWidth: 480,
                marginBottom: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c2410c' }}>
                  About Me &bull; Bio
                </span>
                <a
                  href="#details"
                  onClick={() => setEditMode(true)}
                  style={{ fontSize: 12, fontWeight: 700, color: '#ff5a0a', textDecoration: 'none' }}
                >
                  Edit Bio
                </a>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: '#1a1f2e', lineHeight: 1.5, fontStyle: profile?.bio || member?.bio ? 'normal' : 'italic' }}>
                {profile?.bio || member?.bio || 'You haven\'t added a bio yet. Click "Edit Bio" below to write about yourself, share your favorite verse, or say hello!'}
              </p>
            </div>
            <div className="fb-row">
              <button type="button" className="fb-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload size={17} /> {uploading ? 'Uploading…' : 'Change photo'}
              </button>
              {avatarUrl && (
                <button type="button" className="fb-btn is-danger" onClick={handleDeleteAvatar} disabled={uploading}>
                  <Trash2 size={17} /> Remove photo
                </button>
              )}
            </div>
          </div>

          <div className="fb-id">
            <small>Life Generation ID</small>
            <code>{memberId}</code>
            <button type="button" className="fb-qr" onClick={() => setShowQrModal(true)} aria-label="Open digital pass">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(memberId)}&margin=2`} alt="" draggable="false" />
            </button>
            <em>scan for attendance</em>
            <button type="button" className="fb-btn" onClick={() => setShowQrModal(true)}>
              <QrCode size={17} /> View digital pass
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
      </section>

      {saveMsg && (
        <div className="fb fb-white" style={{ paddingBlock: 16 }}>
          <div className="alert alert-success">{saveMsg}</div>
        </div>
      )}

      {/* ===== 2. group + ministry (tint) ===== */}
      <section className="fb fb-tint">
        <h2>
          where you <em className="hl hl-blue">belong</em>
        </h2>
        <div className="fb-pair">
          {groups.map(({ label, value, empty, text, to, cta }) => (
            <div className="fb-block" key={label}>
              <div>
                <small>{label}</small>
                <h3>{value || empty}</h3>
                <p>{text}</p>
              </div>
              <div>
                <Link to={to} className="fb-btn">
                  {cta} <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 3. reserved events (white) ===== */}
      <section className="fb fb-white">
        <h2>
          my <em className="hl">events</em>
        </h2>
        {myEvents.length === 0 ? (
          <div className="fb-empty">You have not reserved a seat yet. Check the upcoming gatherings and sign up.</div>
        ) : (
          <div className="fb-evs">
            {myEvents.map((ev) => {
              const d = new Date(String(ev.event_date).slice(0, 10) + 'T00:00:00')
              return (
                <div className="fb-ev" key={ev.id}>
                  <span className="fb-date">
                    <b>{d.getDate()}</b>
                    <small>{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</small>
                  </span>
                  <div className="fb-ev-main">
                    <Link to={`/events/${ev.id}`}>{ev.title}</Link>
                    {ev.event_time && (
                      <span>
                        <Clock size={14} /> {ev.event_time}
                      </span>
                    )}
                    {ev.location && (
                      <span>
                        <MapPin size={14} /> {ev.location}
                      </span>
                    )}
                  </div>
                  <div className="fb-ev-side">
                    {ev.checked_in === 1 ? (
                      <span className="fb-status is-in">
                        <Check size={14} /> Checked in
                      </span>
                    ) : (
                      <span className="fb-status">Going</span>
                    )}
                    <button type="button" className="fb-btn is-line" style={{ color: 'var(--mp-royal)', minHeight: 42 }} onClick={() => addToGoogleCalendar(ev)}>
                      <CalendarPlus size={16} /> Add to calendar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="fb-row">
          <Link to="/events" className="fb-btn is-blue">
            Browse events <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* ===== 3b. attended events history ===== */}
      <section className="fb fb-tint" id="history">
        <h2>
          attended <em className="hl hl-blue">events</em>
        </h2>
        <AttendanceHistory endpoint="/api/me/attendance" />
      </section>

      {/* ===== 4. prayer (navy) ===== */}
      <section className="fb fb-ink">
        <div className="fb-in">
          <h2 style={{ fontSize: 'clamp(3rem, 13vw, 7rem)', marginBottom: 0 }}>
            need
            <br />
            <em className="hl hl-blue">prayer</em>
          </h2>
          <p>
            send your prayer requests{' '}
            <Link to="/prayer" className="fb-link">
              here
            </Link>
          </p>
        </div>
      </section>

      {/* ===== 5. personal details (tint) ===== */}
      <section className="fb fb-tint" id="details">
        <h2>
          personal <em className="hl hl-blue">details</em>
        </h2>
        {editMode ? (
          <form onSubmit={handleSaveProfile} className="fb-form">
            <label>
              Full name
              <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </label>
            <label>
              Gender
              <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label>
              Age
              <input type="number" inputMode="numeric" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
            </label>
            <label className="is-wide">
              Address
              <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </label>
            <label className="is-wide">
              Bio / About Me
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Share a short bio, your testimony, favorite Bible verse, or what you love about LifeGen..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--mp-border, #e5e8f1)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </label>
            <div className="fb-row is-wide" style={{ marginTop: 4 }}>
              <button type="submit" className="fb-btn">
                Save changes
              </button>
              <button type="button" className="fb-btn is-line" style={{ color: 'var(--mp-royal)' }} onClick={() => setEditMode(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="fb-facts">
              <div>
                <dt>
                  <Cake size={15} /> Age
                </dt>
                <dd>{profile?.age || member?.age || 'Not set'}</dd>
              </div>
              <div>
                <dt>
                  <Users size={15} /> Gender
                </dt>
                <dd>{profile?.gender || member?.gender || 'Not set'}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={15} /> Joined
                </dt>
                <dd>{new Date(profile?.created_at || member?.joined_at || Date.now()).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
              </div>
              <div className="is-wide" style={{ gridColumn: '1 / -1' }}>
                <dt>
                  <MapPin size={15} /> Address
                </dt>
                <dd>{profile?.address || member?.address || 'Not set'}</dd>
              </div>
              <div className="is-wide" style={{ gridColumn: '1 / -1' }}>
                <dt>
                  <User size={15} /> Bio / About Me
                </dt>
                <dd style={{ fontStyle: profile?.bio || member?.bio ? 'normal' : 'italic', color: profile?.bio || member?.bio ? 'inherit' : 'var(--p-text-2, #586079)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                  {profile?.bio || member?.bio || 'No bio added yet. Click "Edit details" below to share a little about yourself!'}
                </dd>
              </div>
            </dl>
            <div className="fb-row">
              <button type="button" className="fb-btn" onClick={() => setEditMode(true)}>
                <Edit3 size={17} /> Edit details
              </button>
            </div>
          </>
        )}
      </section>

      {/* ===== 6. quick links (white) ===== */}
      <section className="fb fb-white">
        <h2>
          stay <em className="hl hl-blue">connected</em>
          <br />
          to life gen
        </h2>
        <ul className="fb-links">
          {quick.map(([to, label]) => (
            <li key={to}>
              <Link to={to}>
                {label} <ArrowRight size={26} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {showQrModal && (
        <DigitalPassModal
          memberId={memberId}
          name={name}
          email={profile?.email}
          avatarUrl={avatarUrl}
          tier={profile?.membership_tier}
          role={profile?.role}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </>
  )
}
