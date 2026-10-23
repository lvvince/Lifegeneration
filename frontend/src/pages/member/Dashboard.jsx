import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser, setUser, API_URL } from '../../api.js'
import { resolveImageUrl, initials } from '../../lib/format.js'
import {
  User, Shield, Users, HeartHandshake, Calendar, Edit3,
  CheckCircle, Ticket, Camera, Trash2, Upload, QrCode, X, Download
} from 'lucide-react'
import AddToCalendarButton from '../../components/AddToCalendarButton.jsx'

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
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 24,
          maxWidth: 390,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(30, 58, 138, 0.25)',
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
          background: 'linear-gradient(135deg, #1c1917 0%, #44281a 55%, #ea580c 100%)',
          padding: '24px 20px',
          color: '#fff',
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
              background: 'rgba(0,0,0,0.3)',
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
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: -0.3, color: '#fff' }}>
            Life Generation Calapan
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#fed7aa', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>
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
            border: '4px solid #0f172a',
            background: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.3rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials(name)
            )}
          </div>

          <h4 style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
            {name}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#94a3b8' }}>
            {email} &bull; <span style={{ color: '#fb923c', fontWeight: 600 }}>{tier || 'Standard Member'}</span>
          </p>

          {/* QR Code Container */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            display: 'inline-block',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
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
            background: 'rgba(30, 58, 138, 0.25)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            borderRadius: 12,
            padding: '9px 14px',
            marginBottom: 16
          }}>
            <div style={{ fontSize: '0.7rem', color: '#fb923c', textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 700 }}>
              Member Check-In ID
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', letterSpacing: 1.5, marginTop: 2 }}>
              {memberId}
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 20px' }}>
            Present this QR code to the usher or registration desk at the church entrance for instant check-in.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                flex: 1.3,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '11px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
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
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 12,
                padding: '11px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'}
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
  const [editForm, setEditForm] = useState({ full_name: '', age: '', address: '' })
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
          age: res.user.age || res.user.member?.age || '',
          address: res.user.address || res.user.member?.address || ''
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
        age: editForm.age,
        address: editForm.address
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

  return (
    <div>
      {/* Top Banner & Official ID Card — Orange & Blue Brand Palette */}
      <div style={{
        background: "linear-gradient(rgba(12,12,16,.52), rgba(12,12,16,.8)), url('/hero-bg.jpg') center 40% / cover",
        color: '#fff',
        borderRadius: 28,
        padding: '34px 30px',
        boxShadow: '0 24px 50px -26px rgba(20, 30, 70, 0.55)',
        border: 'none',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24
      }}>
        {/* User Avatar + Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          {/* Avatar Container with Camera Button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.2)',
              border: '4px solid rgba(255,255,255,0.45)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '2rem',
              fontWeight: 800,
              userSelect: 'none'
            }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials(name)
              )}
            </div>

            {/* Quick Camera Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change profile picture"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#f97316',
                border: '2px solid #fff',
                borderRadius: '50%',
                width: 32,
                height: 32,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={15} />
            </button>
          </div>

          <div>
            <div style={{
              fontSize: '0.78rem',
              background: 'rgba(249, 115, 22, 0.2)',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              color: '#ffedd5',
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8
            }}>
              Official Member Profile
            </div>
            <h1 style={{ color: '#fff', fontSize: '2.1rem', margin: '0 0 6px', fontWeight: 800 }}>{name}</h1>
            <p style={{ color: 'rgba(255,255,255,.82)', margin: 0, fontSize: '0.95rem' }}>
              {profile?.email} &bull; <span style={{ color: '#fed7aa', fontWeight: 600 }}>{profile?.membership_tier || 'Standard Member'}</span>
            </p>

            {/* Avatar management buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  color: '#fff',
                  padding: '5px 12px',
                  borderRadius: 14,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <Upload size={13} /> {uploading ? 'Uploading...' : 'Change Photo'}
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={uploading}
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fecaca',
                    padding: '5px 12px',
                    borderRadius: 14,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                >
                  <Trash2 size={13} /> Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarUpload}
        />

        {/* Member ID Badge & QR Code */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          color: '#0f172a',
          borderRadius: 18,
          padding: '18px 22px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
          textAlign: 'center',
          minWidth: 220,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Life Generation ID
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--p-text, #1c1917)', fontFamily: 'monospace', margin: '3px 0' }}>
              {memberId}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {profile?.role === 'admin' ? 'Administrator' : 'Active Member'}
            </div>
          </div>

          {/* Quick QR Code Thumbnail (Click to view full pass) */}
          <div
            onClick={() => setShowQrModal(true)}
            style={{
              cursor: 'pointer',
              background: '#fff',
              padding: 6,
              borderRadius: 10,
              border: '1px solid var(--p-border-strong, #d6dbe8)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              transition: 'transform 0.2s'
            }}
            title="Click to view full attendance pass"
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(memberId)}&margin=2`}
              alt="QR Attendance Code"
              style={{ width: 80, height: 80, display: 'block' }}
            />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              Scan for Attendance
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(234, 88, 12, 0.35)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <QrCode size={14} /> View Digital Pass
          </button>
        </div>
      </div>

      {saveMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{saveMsg}</div>}

      {/* Grid of Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* D-Group Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Users size={22} color="var(--navy)" />
              <h3 style={{ margin: 0 }}>My Discipleship Group</h3>
            </div>

            {member.dgroup_name ? (
              <div>
                <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1.1rem', margin: '0 0 4px' }}>
                  {member.dgroup_name}
                </p>
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  Connected in active weekly fellowship and study.
                </p>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                You haven't joined a D-Group yet. Discipleship groups help you grow deeper in faith with peers.
              </p>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <Link to="/dgroups" className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              {member.dgroup_name ? 'View D-Groups' : 'Browse D-Groups to Join'}
            </Link>
          </div>
        </div>

        {/* Ministry Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <HeartHandshake size={22} color="var(--navy)" />
              <h3 style={{ margin: 0 }}>My Ministry Service</h3>
            </div>

            {member.ministry_name ? (
              <div>
                <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1.1rem', margin: '0 0 4px' }}>
                  {member.ministry_name}
                </p>
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  Active volunteer team member serving in worship & events.
                </p>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                You are not currently enrolled in a ministry team. Use your talents to serve God's people!
              </p>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <Link to="/ministries" className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              {member.ministry_name ? 'View Ministries' : 'Apply for a Ministry'}
            </Link>
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={22} color="var(--navy)" />
                <h3 style={{ margin: 0 }}>Personal Details</h3>
              </div>
              <button
                onClick={() => setEditMode(!editMode)}
                style={{ background: 'transparent', border: 'none', color: 'var(--navy)', cursor: 'pointer', padding: 4 }}
                title="Edit details"
              >
                <Edit3 size={18} />
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleSaveProfile}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.8rem' }}>Full Name</label>
                  <input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.8rem' }}>Age</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.8rem' }}>Address</label>
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Save</button>
                  <button type="button" onClick={() => setEditMode(false)} style={{ background: '#ccc', color: '#333', padding: '6px 12px', fontSize: '0.85rem' }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#334' }}>
                <p><strong>Age:</strong> {profile?.age || member?.age || 'Not set'}</p>
                <p><strong>Address:</strong> {profile?.address || member?.address || 'Not set'}</p>
                <p><strong>Joined:</strong> {new Date(profile?.created_at || member?.joined_at || Date.now()).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RSVP'd Events Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} color="var(--navy)" />
            <h3 style={{ margin: 0 }}>My Reserved Events</h3>
          </div>
          <Link to="/events" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Browse All Events &rarr;</Link>
        </div>

        {myEvents.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            You haven't RSVP'd for any upcoming events yet. Check out upcoming gatherings and reserve your seat!
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {myEvents.map((ev) => (
              <div key={ev.id} style={{
                background: 'rgba(47,143,91,0.06)',
                border: '1px solid #c2ebcf',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', color: 'var(--navy)' }}>{ev.title}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {ev.event_date} &bull; {ev.event_time}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#4b6354', marginTop: 2 }}>
                    📍 {ev.location}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AddToCalendarButton
                    event={ev}
                    variant="small"
                    label="Add to Calendar"
                    style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                  />
                  {ev.checked_in === 1 ? (
                    <span style={{ background: '#15803d', color: '#fff', padding: '4px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                      ✓ Checked-In
                    </span>
                  ) : (
                    <span style={{ background: '#e3f5ea', color: '#1e7a46', padding: '4px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                      Attending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Digital Pass Modal */}
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
    </div>
  )
}
