import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser, setUser } from '../../api.js'
import { User, Shield, Users, HeartHandshake, Calendar, Edit3, CheckCircle, Ticket } from 'lucide-react'

export default function Dashboard() {
  const [profile, setProfile] = useState(getUser())
  const [myEvents, setMyEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', age: '', address: '' })
  const [saveMsg, setSaveMsg] = useState('')

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

  return (
    <div>
      {/* Top Banner & Official ID Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5335 0%, #2f8f5b 60%, #48bb78 100%)',
        color: '#fff',
        borderRadius: 20,
        padding: '32px 28px',
        boxShadow: '0 8px 24px rgba(34, 111, 69, 0.25)',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20
      }}>
        <div>
          <div style={{
            fontSize: '0.8rem',
            background: 'rgba(255,255,255,0.2)',
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
          <h1 style={{ color: '#fff', fontSize: '2.2rem', margin: '0 0 6px' }}>{name}</h1>
          <p style={{ color: '#d1fae5', margin: 0, fontSize: '1rem' }}>
            {profile?.email} &bull; {profile?.membership_tier || 'Standard Member'}
          </p>
        </div>

        {/* Member ID Badge */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          color: '#1f2d25',
          borderRadius: 16,
          padding: '16px 22px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          textAlign: 'center',
          minWidth: 200
        }}>
          <div style={{ fontSize: '0.75rem', color: '#2f8f5b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Life Generation ID
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#166534', fontFamily: 'monospace', margin: '4px 0' }}>
            {memberId}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {profile?.role === 'admin' ? '🛡️ Administrator' : 'Active Church Member'}
          </div>
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

                <div>
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
    </div>
  )
}