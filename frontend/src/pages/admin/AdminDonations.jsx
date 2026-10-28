import { useEffect, useMemo, useState } from 'react'
import {
  HeartHandshake, CheckCircle2, XCircle, Search, Eye,
  ExternalLink, Copy, Check, Filter, AlertCircle, RefreshCw,
  QrCode, FileText, ChevronRight
} from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate, fmtDateTime, fmtCurrency, resolveImageUrl } from '../../lib/format.js'
import {
  PageHeader, Empty, Loading, Tabs, Badge, useToast,
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

  return (
    <>
      <PageHeader
        title="Donations & Giving"
        desc="Review online contributions, verify GCash and bank receipts, and track church campaign funds."
        actions={
          <button
            type="button"
            className="p-btn p-btn-secondary"
            onClick={() => { setLoading(true); loadData() }}
            title="Refresh donations"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* 4 Overview Metrics */}
      <div className="p-stats" style={{ marginBottom: 20 }}>
        <div className="p-stat">
          <span>Total Verified</span>
          <strong>{stats ? fmtCurrency(stats.total_collected) : '–'}</strong>
        </div>
        <div className="p-stat">
          <span>Pending Verifications</span>
          <strong style={{ color: (stats?.pending_count || 0) > 0 ? '#ff5a0a' : 'inherit' }}>
            {stats ? stats.pending_count : '–'}
          </strong>
        </div>
        <div className="p-stat">
          <span>This Month Giving</span>
          <strong>{stats ? fmtCurrency(stats.month_collected) : '–'}</strong>
        </div>
        <div className="p-stat">
          <span>Verified Donors</span>
          <strong>{stats ? stats.donor_count : '–'}</strong>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'verified', label: 'Verified', count: counts.verified },
          { value: 'rejected', label: 'Rejected', count: counts.rejected },
          { value: 'all', label: 'All', count: donations.length },
        ]}
      />

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '14px 0 16px'
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, opacity: 0.5 }} />
          <input
            type="text"
            className="p-input"
            style={{ paddingLeft: 36, width: '100%', height: 38, borderRadius: 10 }}
            placeholder="Search donor, ref #, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Filter size={15} style={{ opacity: 0.6 }} />
          <select
            className="p-input"
            style={{ height: 38, borderRadius: 10, padding: '0 12px', fontSize: 13 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Giving Categories</option>
            <option value="tithe">Tithes & Offerings</option>
            <option value="camp_sponsor">Youth Camp Sponsorship</option>
            <option value="missions">Missions & Outreach</option>
            <option value="building_fund">Audio & Equipment</option>
            <option value="benevolence">Benevolence / Love Gift</option>
          </select>
        </div>
      </div>

      {/* Donations List Panel */}
      <section className="p-panel">
        {loading ? (
          <Loading rows={4} />
        ) : filtered.length === 0 ? (
          <Empty
            icon={HeartHandshake}
            title={tab === 'pending' ? 'No pending donations to verify' : 'No donations found'}
            desc={tab === 'pending' ? 'All submitted donations have been processed.' : 'Try adjusting your search or filters.'}
          />
        ) : (
          filtered.map((d) => (
            <div className="p-row p-row-wrap" key={d.id} style={{ alignItems: 'flex-start', padding: '16px 20px' }}>
              <div className="p-row-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="p-row-title" style={{ fontSize: 16 }}>
                    {d.donor_name}
                  </span>
                  {d.is_anonymous && (
                    <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      Anonymous
                    </span>
                  )}
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--p-accent, #c2410c)', marginLeft: 'auto' }}>
                    {fmtCurrency(d.amount)}
                  </span>
                </div>

                <div className="p-row-sub" style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span className="p-mono" style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                    {d.tracking_code}
                  </span>
                  <span>·</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                    {d.payment_method.toUpperCase()}
                  </span>
                  {d.reference_number && (
                    <>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Ref: <b>{d.reference_number}</b>
                        <button
                          type="button"
                          onClick={() => copyText(d.reference_number, `ref-${d.id}`)}
                          style={{ border: 0, background: 'none', cursor: 'pointer', padding: 2, opacity: 0.7 }}
                          title="Copy reference number"
                        >
                          {copiedId === `ref-${d.id}` ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                        </button>
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span>{fmtDateTime(d.created_at)}</span>
                </div>

                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 999, background: 'rgba(194, 65, 12, 0.1)', color: 'var(--p-accent, #c2410c)', fontWeight: 600 }}>
                    {d.campaign_title || CATEGORY_LABELS[d.category] || d.category}
                  </span>
                  {d.donor_email && (
                    <span style={{ fontSize: 12, opacity: 0.75 }}>
                      Email: {d.donor_email}
                    </span>
                  )}
                  {d.donor_phone && (
                    <span style={{ fontSize: 12, opacity: 0.75 }}>
                      Phone: {d.donor_phone}
                    </span>
                  )}
                </div>

                {d.donor_message && (
                  <p className="p-quote" style={{ margin: '10px 0 0', fontStyle: 'italic', fontSize: 13 }}>
                    &ldquo;{d.donor_message}&rdquo;
                  </p>
                )}

                {d.admin_notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.06)', padding: '4px 10px', borderRadius: 6 }}>
                    <b>Note:</b> {d.admin_notes}
                  </div>
                )}
              </div>

              {/* Action Column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge tone={TONE[d.status]}>{d.status}</Badge>

                  {d.proof_receipt && (
                    <button
                      type="button"
                      className="p-btn p-btn-secondary p-btn-sm"
                      onClick={() => setSelectedReceipt(d)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Eye size={14} /> Receipt
                    </button>
                  )}
                </div>

                {d.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="p-btn p-btn-primary p-btn-sm"
                      disabled={busyId === d.id}
                      onClick={() => handleVerify(d)}
                    >
                      <CheckCircle2 size={14} /> Verify
                    </button>
                    <button
                      type="button"
                      className="p-btn p-btn-outline p-btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      disabled={busyId === d.id}
                      onClick={() => { setRejectModal(d); setRejectReason('') }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
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
    </>
  )
}

