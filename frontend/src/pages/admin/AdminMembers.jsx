import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../api.js'
import { Search, ArrowLeft, Check, X, Shield } from 'lucide-react'

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const loadMembers = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/members')
      setMembers(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleToggleStatus = async (user_id, currentStatus) => {
    setUpdatingId(user_id)
    setMsg('')
    try {
      const nextStatus = currentStatus ? 0 : 1
      await apiPost('/api/members/update', {
        user_id,
        is_active: nextStatus
      })
      setMsg('Member status updated.')
      loadMembers()
    } catch (err) {
      setError(err.message || 'Failed to update member status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRoleChange = async (user_id, role) => {
    setUpdatingId(user_id)
    setMsg('')
    try {
      await apiPost('/api/members/update', {
        user_id,
        role
      })
      setMsg(`Role updated to ${role}.`)
      loadMembers()
    } catch (err) {
      setError(err.message || 'Failed to update role.')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return (
      (m.member_id && m.member_id.toLowerCase().includes(q)) ||
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.username && m.username.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Admin
        </Link>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Total Members: {members.length}
        </span>
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Member Directory</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Search, verify Member IDs, toggle active status, and assign administrative privileges.
      </p>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} color="var(--muted)" style={{ position: 'absolute', top: 12, left: 14 }} />
        <input
          type="text"
          placeholder="Search by Member ID (e.g. LG-2026-XXXXX), Name, or Email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40, width: '100%' }}
        />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Loading members...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(47,143,91,0.08)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Member ID</th>
                <th style={{ padding: '12px 16px' }}>Name & Email</th>
                <th style={{ padding: '12px 16px' }}>D-Group</th>
                <th style={{ padding: '12px 16px' }}>Ministry</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                    No members match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                      {m.member_id || `LG-2026-${m.id}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{m.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: m.dgroup_name ? 'var(--navy)' : 'var(--muted)' }}>
                      {m.dgroup_name || '— None —'}
                    </td>
                    <td style={{ padding: '12px 16px', color: m.ministry_name ? 'var(--navy)' : 'var(--muted)' }}>
                      {m.ministry_name || '— None —'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={m.role}
                        disabled={updatingId === m.user_id}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: m.role === 'admin' ? '#fef3c7' : '#fff',
                          fontWeight: m.role === 'admin' ? 700 : 'normal'
                        }}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleStatus(m.user_id, Number(m.is_active ?? m.user_active))}
                        disabled={updatingId === m.user_id}
                        style={{
                          background: (m.is_active ?? m.user_active) ? '#e3f5ea' : '#fee2e2',
                          color: (m.is_active ?? m.user_active) ? '#166534' : '#991b1b',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {(m.is_active ?? m.user_active) ? '✓ Active' : '✕ Inactive'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
