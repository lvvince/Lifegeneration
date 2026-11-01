import { useEffect, useMemo, useState } from 'react'
import { Search, Download, Users, History } from 'lucide-react'
import '../../styles/members.css'
import { apiGet, apiPost, getUser } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import { downloadCsv } from '../../lib/csv.js'
import {
  PageHeader, Empty, Loading, Switch, Badge, ConfirmDialog, Modal, useToast,
} from '../../components/portal/ui.jsx'
import AttendanceHistory from '../../components/portal/AttendanceHistory.jsx'

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
  const [historyOf, setHistoryOf] = useState(null)

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
        title: next === 'admin' ? 'Make this member an admin?' : (m.user_id === me?.id ? 'Change your own role?' : 'Remove admin access?'),
        message:
          next === 'admin'
            ? `${m.full_name} will be able to manage members, events and reports.`
            : (m.user_id === me?.id ? 'You will lose access to the admin pages right after this change. Another active admin must exist.' : `${m.full_name} will lose access to the admin pages.`),
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

  const count = (fn) => members.filter(fn).length
  const roleTabs = [
    ['all', 'All', members.length],
    ['user', 'Members', count((m) => m.role === 'user')],
    ['officer', 'Officers', count((m) => m.role === 'officer')],
    ['admin', 'Admins', count((m) => m.role === 'admin')],
  ]
  const statusTabs = [
    ['all', 'Any'], ['active', 'Active'], ['inactive', 'Inactive'],
  ]
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const roleLabel = { user: 'Member', officer: 'Officer', admin: 'Admin' }

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

      <div className="mb-bar">
        <div className="mb-search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or member ID" aria-label="Search members" />
        </div>
        <div className="mb-tabs" role="group" aria-label="Filter by role">
          {roleTabs.map(([k, l, n]) => (
            <button key={k} type="button" className={role === k ? 'is-on' : ''} aria-pressed={role === k} onClick={() => setRole(k)}>{l}<em>{n}</em></button>
          ))}
        </div>
        <div className="mb-tabs is-small" role="group" aria-label="Filter by status">
          {statusTabs.map(([k, l]) => (
            <button key={k} type="button" className={status === k ? 'is-on' : ''} aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>
          ))}
        </div>
      </div>

      <section className="mb-list" aria-live="polite">
        {loading ? (
          <Loading rows={6} />
        ) : filtered.length === 0 ? (
          <Empty
            icon={Users}
            title={members.length ? 'No members match' : 'No members yet'}
            desc={members.length ? 'Try a different search or clear the filters.' : 'New sign-ups will show up here.'}
          />
        ) : (
          <>
            <div className="mb-head" aria-hidden="true"><span>Member</span><span>Group</span><span>Role</span><span>Joined</span><span>Status</span></div>
            {filtered.map((m) => {
              const self = m.user_id === me?.id && me?.member_id !== 'LG-ADMIN'
              const busy = busyId === m.user_id
              const on = isOn(m)
              return (
                <article key={m.id} className={`mb-row${on ? '' : ' is-off'}`}>
                  <div className="mb-who">
                    <span className={`mb-av is-${m.role}`} aria-hidden="true">{initials(m.full_name || m.username)}</span>
                    <div>
                      <h3>{m.full_name || m.username} {self && <Badge>You</Badge>}</h3>
                      <p>{m.email}</p>
                      <code>{m.member_id}</code>
                    </div>
                  </div>
                  <div className="mb-grp" data-label="Group">
                    <b className={m.dgroup_name ? '' : 'is-none'}>{m.dgroup_name || 'No D-Group'}</b>
                    <span className={m.ministry_name ? '' : 'is-none'}>{m.ministry_name || 'No ministry'}</span>
                  </div>
                  <div className="mb-role" data-label="Role">
                    <select
                      value={m.role}
                      disabled={busy || (self && !isAdmin) || (!isAdmin && m.role === 'admin')}
                      title={self && !isAdmin ? 'You cannot change your own role' : (!isAdmin && m.role === 'admin' ? 'Only an admin can change admin accounts' : undefined)}
                      aria-label={`Role for ${m.full_name}`}
                      onChange={(e) => askRole(m, e.target.value)}
                    >
                      <option value="user">Member</option>
                      <option value="officer">Officer</option>
                      {(isAdmin || m.role === 'admin') && <option value="admin">Admin</option>}
                    </select>
                  </div>
                  <div className="mb-joined" data-label="Joined">{fmtDate(m.joined_at)}</div>
                  <div className="mb-state">
                    <Switch checked={on} disabled={busy || self} label={`${on ? 'Deactivate' : 'Activate'} ${m.full_name}`} onChange={() => askStatus(m)} />
                    <span>{on ? 'Active' : 'Inactive'}</span>
                    <button type="button" className="mb-hist" onClick={() => setHistoryOf(m)} aria-label={`Attendance history of ${m.full_name}`} title="Attendance history"><History size={18} /><i>History</i></button>
                  </div>
                </article>
              )
            })}
          </>
        )}
      </section>
      {!loading && members.length > 0 && (
        <p className="mb-count">Showing {filtered.length} of {members.length} members</p>
      )}

      {historyOf && (
        <Modal title={`${historyOf.full_name || historyOf.username}: attended events`} onClose={() => setHistoryOf(null)}>
          <div style={{ padding: '4px 20px 20px' }}>
            <AttendanceHistory endpoint={`/api/members/${historyOf.user_id}/attendance`} />
          </div>
        </Modal>
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
