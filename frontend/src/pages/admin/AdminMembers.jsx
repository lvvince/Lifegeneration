import { useEffect, useMemo, useState } from 'react'
import { Search, Download, Users } from 'lucide-react'
import { apiGet, apiPost, getUser } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import { downloadCsv } from '../../lib/csv.js'
import {
  PageHeader, Empty, Loading, Switch, Badge, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const isOn = (m) => Number(m.is_active ?? m.user_active) === 1

export default function AdminMembers() {
  const me = getUser()
  const isAdmin = me?.role === 'admin'
  const isOfficer = me?.role === 'officer'
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    apiGet('/api/members')
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return members.filter((m) => {
      if (role !== 'all' && m.role !== role) return false
      if (status === 'active' && !isOn(m)) return false
      if (status === 'inactive' && isOn(m)) return false
      if (!term) return true
      return [m.member_id, m.full_name, m.email, m.username].some((v) =>
        String(v || '').toLowerCase().includes(term)
      )
    })
  }, [members, q, role, status])

  // Isinasama ang kasalukuyang profile para hindi mabura ang name/age/address
  async function save(m, patch, okMsg) {
    setBusyId(m.user_id)
    try {
      await apiPost('/api/members/update', {
        user_id: m.user_id,
        full_name: m.full_name ?? '',
        gender: m.gender ?? '',
        age: m.age ?? '',
        address: m.address ?? '',
        ...patch,
      })
      setMembers((list) =>
        list.map((x) =>
          x.user_id === m.user_id
            ? {
                ...x,
                ...(patch.role ? { role: patch.role } : {}),
                ...(patch.is_active !== undefined
                  ? { is_active: patch.is_active, user_active: patch.is_active }
                  : {}),
              }
            : x
        )
      )
      toast(okMsg)
    } catch (e) {
      toast(e.message || 'Update failed.', 'bad')
    } finally {
      setBusyId(null)
      setConfirm(null)
    }
  }

  function askRole(m, next) {
    if (next === m.role) return
    if ((next === 'admin' || m.role === 'admin') && !isAdmin) {
      toast('Only an administrator can assign or change the admin role.', 'bad')
      return
    }
    // Admin changes always need confirmation
    if (next === 'admin' || m.role === 'admin') {
      setConfirm({
        m,
        title: next === 'admin' ? 'Make this member an admin?' : 'Remove admin access?',
        message:
          next === 'admin'
            ? `${m.full_name} will be able to manage members, events and reports.`
            : `${m.full_name} will lose access to the admin pages.`,
        label: 'Change role',
        run: () => save(m, { role: next }, `${m.full_name} is now ${next}.`),
      })
    } else if (next === 'officer') {
      setConfirm({
        m,
        title: 'Promote to Officer?',
        message: `${m.full_name} will be able to scan QR codes, manage event attendance, and view member info.`,
        label: 'Promote to Officer',
        run: () => save(m, { role: next }, `${m.full_name} is now an Officer.`),
      })
    } else if (m.role === 'officer') {
      setConfirm({
        m,
        title: 'Remove Officer access?',
        message: `${m.full_name} will no longer have officer privileges.`,
        label: 'Remove Officer',
        danger: true,
        run: () => save(m, { role: next }, `${m.full_name} is now a Member.`),
      })
    } else {
      save(m, { role: next }, `${m.full_name} is now ${next}.`)
    }
  }

  function askStatus(m) {
    const next = isOn(m) ? 0 : 1
    if (next === 0) {
      setConfirm({
        m,
        title: 'Deactivate this member?',
        message: `${m.full_name} will no longer be counted as an active member. You can turn this back on anytime.`,
        label: 'Deactivate',
        danger: true,
        run: () => save(m, { is_active: next }, `${m.full_name} deactivated.`),
      })
    } else {
      save(m, { is_active: next }, `${m.full_name} is active again.`)
    }
  }

  function exportCsv() {
    downloadCsv('members.csv', filtered, [
      { key: 'member_id', label: 'Member ID' },
      { key: 'full_name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age' },
      { key: 'address', label: 'Address' },
      { key: 'dgroup_name', label: 'D-Group' },
      { key: 'ministry_name', label: 'Ministry' },
      { key: 'role', label: 'Role' },
      { key: 'joined_at', label: 'Joined' },
    ])
  }

  return (
    <>
      <PageHeader
        title="Members"
        desc="Find a member, change their role, or turn their account on or off."
        actions={
          <button type="button" className="p-btn p-btn-secondary" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={16} /> Export CSV
          </button>
        }
      />

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="p-toolbar">
        <div className="p-search">
          <Search size={16} />
          <input
            className="p-input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or member ID"
            aria-label="Search members"
          />
        </div>
        <select className="p-input p-auto" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option>
          <option value="user">Member</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
        </select>
        <select className="p-input p-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <section className="p-panel">
        {loading ? (
          <Loading rows={6} />
        ) : filtered.length === 0 ? (
          <Empty
            icon={Users}
            title={members.length ? 'No members match' : 'No members yet'}
            desc={members.length ? 'Try a different search or clear the filters.' : 'New sign-ups will show up here.'}
          />
        ) : (
          <div className="p-table-wrap">
            <table className="p-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Gender</th>
                  <th>D-Group</th>
                  <th>Ministry</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const self = m.user_id === me?.id
                  const busy = busyId === m.user_id
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="p-row-title">
                          {m.full_name || m.username} {self && <Badge>You</Badge>}
                        </div>
                        <div className="p-row-sub">{m.email}</div>
                        <div className="p-mono">{m.member_id}</div>
                      </td>
                      <td className={m.gender ? '' : 'p-muted'}>{m.gender || '—'}</td>
                      <td className={m.dgroup_name ? '' : 'p-muted'}>{m.dgroup_name || '—'}</td>
                      <td className={m.ministry_name ? '' : 'p-muted'}>{m.ministry_name || '—'}</td>
                      <td>
                        <select
                          className="p-input p-auto"
                          style={{ padding: '5px 8px', fontSize: 13 }}
                          value={m.role}
                          disabled={busy || self || (!isAdmin && m.role === 'admin')}
                          title={self ? 'You cannot change your own role' : (!isAdmin && m.role === 'admin' ? 'Only an admin can change admin accounts' : undefined)}
                          aria-label={`Role for ${m.full_name}`}
                          onChange={(e) => askRole(m, e.target.value)}
                        >
                          <option value="user">Member</option>
                          <option value="officer">Officer</option>
                          {(isAdmin || m.role === 'admin') && <option value="admin">Admin</option>}
                        </select>
                      </td>
                      <td className="p-num p-muted">{fmtDate(m.joined_at)}</td>
                      <td>
                        <span className="p-inline">
                          <Switch
                            checked={isOn(m)}
                            disabled={busy || self}
                            label={`${isOn(m) ? 'Deactivate' : 'Activate'} ${m.full_name}`}
                            onChange={() => askStatus(m)}
                          />
                          <span className={isOn(m) ? '' : 'p-muted'}>{isOn(m) ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {!loading && members.length > 0 && (
        <p className="p-hint" style={{ marginTop: 10 }}>
          Showing {filtered.length} of {members.length} members.
        </p>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          danger={confirm.danger}
          busy={busyId === confirm.m.user_id}
          onConfirm={confirm.run}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
