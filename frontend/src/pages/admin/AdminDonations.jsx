import { useEffect, useMemo, useState } from 'react'
import {
  HeartHandshake, CheckCircle2, XCircle, Search, Eye,
  ExternalLink, Copy, Check, Filter, AlertCircle, RefreshCw,
  QrCode, FileText, ChevronRight, Wallet, Clock, CalendarDays, Users, EyeOff
} from 'lucide-react'
import '../../styles/staffui.css'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate, fmtDateTime, fmtCurrency, resolveImageUrl } from '../../lib/format.js'
import {
  Empty, Loading, useToast,
} from '../../components/portal/ui.jsx'

const TONE = { pending: 'warn', verified: 'ok', rejected: 'bad' }

const CATEGORY_LABELS = {
  tithe: 'Tithes & General Offerings',
  offering: 'General Offering',
  camp_sponsor: 'Youth Camp Sponsorship',
  missions: 'Missions & Outreach',
  building_fund: 'Audio & Equipment',
  benevolence: 'Benevolence / Love Gift',
  other: 'Other'
}

export default function AdminDonations() {
  const toast = useToast()
  const [donations, setDonations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('pending')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        apiGet('/api/admin/donations'),
        apiGet('/api/admin/donations/stats')
      ])
      setDonations(Array.isArray(listRes) ? listRes : [])
      setStats(statsRes || null)
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to load donations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, rejected: 0 }
    donations.forEach((d) => {
      if (c[d.status] !== undefined) c[d.status]++
    })
    return c
  }, [donations])

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      if (tab !== 'all' && d.status !== tab) return false
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false
      if (search.trim()) {
        const s = search.toLowerCase()
        const matchName = (d.donor_name || '').toLowerCase().includes(s)
        const matchCode = (d.tracking_code || '').toLowerCase().includes(s)
        const matchRef = (d.reference_number || '').toLowerCase().includes(s)
        const matchEmail = (d.donor_email || '').toLowerCase().includes(s)
        if (!matchName && !matchCode && !matchRef && !matchEmail) return false
      }
      return true
    })
  }, [donations, tab, categoryFilter, search])

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
    toast('Copied to clipboard!')
  }

  const handleVerify = async (donation) => {
    setBusyId(donation.id)
    try {
      await apiPost('/api/admin/donations/verify', {
        id: donation.id,
        status: 'verified'
      })
      toast(`Donation ${donation.tracking_code} verified successfully!`)
      if (selectedReceipt?.id === donation.id) setSelectedReceipt(null)
      await loadData()
    } catch (e) {
      toast(e.message || 'Could not verify donation.', 'bad')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setBusyId(rejectModal.id)
    try {
      await apiPost('/api/admin/donations/verify', {
        id: rejectModal.id,
        status: 'rejected',
        admin_notes: rejectReason.trim() || 'Payment details could not be validated.'
      })
      toast(`Donation ${rejectModal.tracking_code} marked as rejected.`, 'bad')
      setRejectModal(null)
      setRejectReason('')
      if (selectedReceipt?.id === rejectModal.id) setSelectedReceipt(null)
      await loadData()
    } catch (e) {
      toast(e.message || 'Could not reject donation.', 'bad')
    } finally {
      setBusyId(null)
    }
  }

  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const METHOD = { gcash: 'GCash', maya: 'Maya', bank: 'Bank', cash: 'Cash' }
  const statTiles = [
    { icon: Wallet, label: 'Verified total', value: stats ? fmtCurrency(stats.total_collected) : '–' },
    { icon: Clock, label: 'Awaiting review', value: stats ? stats.pending_count : '–', hot: (stats?.pending_count || 0) > 0 },
    { icon: CalendarDays, label: 'This month', value: stats ? fmtCurrency(stats.month_collected) : '–' },
    { icon: Users, label: 'Donors', value: stats ? stats.donor_count : '–' },
  ]

  return (
    <div className="su">
      <header className="su-head">
        <div>
          <h1>Donations</h1>
          <p>Verify GCash, Maya and bank receipts.</p>
        </div>
        <button type="button" className="su-icon" onClick={() => { setLoading(true); loadData() }} title="Refresh" aria-label="Refresh donations">
          <RefreshCw size={18} />
        </button>
      </header>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

      <ul className="su-kpis" aria-label="Giving summary">
        {statTiles.map(({ icon: Icon, label, value, hot }) => (
          <li key={label} className={hot ? 'is-hot' : ''}>
            <span className="su-kpi-ico"><Icon size={18} aria-hidden="true" /></span>
            <small>{label}</small>
            <b>{value}</b>
          </li>
        ))}
      </ul>

      <div className="su-bar">
        <label className="su-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" placeholder="Search donor, reference or code" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search donations" />
        </label>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Giving category">
          <option value="all">All categories</option>
          <option value="tithe">Tithes & Offerings</option>
          <option value="camp_sponsor">Youth Camp Sponsorship</option>
          <option value="missions">Missions & Outreach</option>
          <option value="building_fund">Audio & Equipment</option>
          <option value="benevolence">Benevolence / Love Gift</option>
        </select>
        <div className="su-seg" role="group" aria-label="Status">
          {[['pending', 'Pending', counts.pending], ['verified', 'Verified', counts.verified], ['rejected', 'Rejected', counts.rejected], ['all', 'All', donations.length]].map(([k, l, n]) => (
            <button key={k} type="button" className={tab === k ? 'is-on' : ''} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}<em>{n}</em></button>
          ))}
        </div>
      </div>

      <section className="su-list" aria-live="polite">
        {loading ? (
          <Loading rows={4} />
        ) : filtered.length === 0 ? (
          <Empty
            icon={HeartHandshake}
            title={tab === 'pending' ? 'Nothing to verify' : 'No donations found'}
            desc={tab === 'pending' ? 'All submitted donations are processed.' : 'Try another search or filter.'}
          />
        ) : (
          filtered.map((d, i) => (
            <article className={`su-row is-${d.status}`} key={d.id} style={{ '--i': Math.min(i, 8) }}>
              <span className="su-puck">{d.is_anonymous ? <EyeOff size={18} aria-hidden="true" /> : initials(d.donor_name)}</span>
              <div className="su-main">
                <div className="su-top">
                  <h3>{d.donor_name}</h3>
                  <b className="su-amt">{fmtCurrency(d.amount)}</b>
                </div>
                <div className="su-meta">
                  <span className="su-chip is-accent">{d.campaign_title || CATEGORY_LABELS[d.category] || d.category}</span>
                  <span className="su-chip">{METHOD[d.payment_method] || String(d.payment_method || '').toUpperCase()}</span>
                  <code>{d.tracking_code}</code>
                  {d.reference_number && (
                    <button type="button" className="su-copy" onClick={() => copyText(d.reference_number, `ref-${d.id}`)} title="Copy reference number">
                      Ref {d.reference_number} {copiedId === `ref-${d.id}` ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    </button>
                  )}
                  <time>{fmtDateTime(d.created_at)}</time>
                </div>
                {(d.donor_message || d.admin_notes) && (
                  <p className={`su-note${d.admin_notes ? ' is-bad' : ''}`}>{d.admin_notes ? `Note: ${d.admin_notes}` : `“${d.donor_message}”`}</p>
                )}
              </div>
              <div className="su-acts">
                <span className={`su-pill is-${d.status}`}>{d.status}</span>
                {d.proof_receipt && (
                  <button type="button" className="su-icon" onClick={() => setSelectedReceipt(d)} title="View receipt" aria-label={`View receipt of ${d.donor_name}`}><Eye size={18} /></button>
                )}
                {d.status === 'pending' && (
                  <>
                    <button type="button" className="su-act is-ok" disabled={busyId === d.id} onClick={() => handleVerify(d)}><CheckCircle2 size={16} /> Verify</button>
                    <button type="button" className="su-icon is-bad" disabled={busyId === d.id} onClick={() => { setRejectModal(d); setRejectReason('') }} title="Reject" aria-label={`Reject ${d.donor_name}`}><XCircle size={18} /></button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      {/* Modal: View Receipt Image */}
      {selectedReceipt && (
        <div
          className="lg-dialog-wrap"
          onClick={() => setSelectedReceipt(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            className="lg-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--p-surface, #fff)',
              maxWidth: 580,
              width: '100%',
              borderRadius: 20,
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Proof of Payment</h3>
                <small style={{ opacity: 0.7 }}>
                  {selectedReceipt.tracking_code} · {fmtCurrency(selectedReceipt.amount)}
                </small>
              </div>
              <button
                type="button"
                className="p-btn p-btn-secondary p-btn-sm"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
            </div>

            <div style={{ textAlign: 'center', background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <img
                src={resolveImageUrl(selectedReceipt.proof_receipt)}
                alt="Receipt screenshot"
                style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            </div>

            <div style={{ background: 'rgba(0,0,0,0.03)', padding: 14, borderRadius: 10, fontSize: 13, display: 'grid', gap: 6, marginBottom: 16 }}>
              <div><b>Donor:</b> {selectedReceipt.donor_name} {selectedReceipt.is_anonymous ? '(Anonymous)' : ''}</div>
              <div><b>Method:</b> {selectedReceipt.payment_method.toUpperCase()}</div>
              <div><b>Reference Number:</b> {selectedReceipt.reference_number || 'None provided'}</div>
              <div><b>Submitted At:</b> {fmtDateTime(selectedReceipt.created_at)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href={resolveImageUrl(selectedReceipt.proof_receipt)}
                target="_blank"
                rel="noreferrer"
                className="p-btn p-btn-secondary p-btn-sm"
              >
                <ExternalLink size={14} /> Open Full Image
              </a>

              {selectedReceipt.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="p-btn p-btn-primary p-btn-sm"
                    disabled={busyId === selectedReceipt.id}
                    onClick={() => handleVerify(selectedReceipt)}
                  >
                    <CheckCircle2 size={14} /> Verify Now
                  </button>
                  <button
                    type="button"
                    className="p-btn p-btn-outline p-btn-sm"
                    style={{ color: '#dc2626' }}
                    onClick={() => { setRejectModal(selectedReceipt); setRejectReason('') }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Donation Reason */}
      {rejectModal && (
        <div
          className="lg-dialog-wrap"
          onClick={() => setRejectModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            className="lg-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--p-surface, #fff)',
              maxWidth: 440,
              width: '100%',
              borderRadius: 16,
              padding: 20
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#dc2626' }}>Reject Donation</h3>
            <p style={{ fontSize: 13, opacity: 0.8, margin: '0 0 14px' }}>
              Are you sure you want to reject the donation <b>{rejectModal.tracking_code}</b> ({fmtCurrency(rejectModal.amount)})?
            </p>

            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Reason for Rejection (optional note):
            </label>
            <textarea
              className="p-input"
              rows={3}
              style={{ width: '100%', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 16 }}
              placeholder="e.g. Reference number not found in GCash merchant history, receipt unreadable..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="p-btn p-btn-secondary"
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="p-btn p-btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                disabled={busyId === rejectModal.id}
                onClick={handleReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

