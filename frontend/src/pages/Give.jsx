import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  HeartHandshake, QrCode, CheckCircle2, Copy, Check, Upload,
  X, AlertCircle, ArrowRight, ShieldCheck, Sparkles, Building2,
  Wallet, History, FileText, Clock, XCircle, RefreshCw
} from 'lucide-react'
import { apiGet, API_URL, getUser } from '../api.js'
import { fmtCurrency, fmtDateTime } from '../lib/format.js'
import '../styles/pages.css'

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000]

export default function Give() {
  const user = useMemo(() => getUser(), [])
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [method, setMethod] = useState('gcash') // gcash | maya | bank
  const [amount, setAmount] = useState('500')
  const [customAmount, setCustomAmount] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [donorName, setDonorName] = useState(user?.full_name || user?.username || '')
  const [donorEmail, setDonorEmail] = useState(user?.email || '')
  const [donorPhone, setDonorPhone] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [donorMessage, setDonorMessage] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState(null)

  const [copiedKey, setCopiedKey] = useState(null)
  const [activeTab, setActiveTab] = useState('give') // 'give' | 'history'
  const [myHistory, setMyHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      apiGet('/api/donations/campaigns'),
      apiGet('/api/donations/payment-info')
    ])
      .then(([cRes, pRes]) => {
        if (!alive) return
        const list = Array.isArray(cRes) ? cRes : []
        setCampaigns(list)
        if (list.length > 0) setSelectedCampaign(list[0])
        setPaymentInfo(pRes || null)
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Failed to load giving options')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [])

  // Load history strictly once when activeTab is 'history'
  const loadHistory = () => {
    setHistoryLoading(true)
    apiGet('/api/donations/my-history')
      .then((res) => setMyHistory(Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    const url = URL.createObjectURL(file)
    setReceiptPreview(url)
  }

  const removeReceipt = () => {
    setReceiptFile(null)
    if (receiptPreview) URL.revokeObjectURL(receiptPreview)
    setReceiptPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const effectiveAmount = customAmount ? parseFloat(customAmount) : parseFloat(amount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!effectiveAmount || effectiveAmount <= 0) {
      setError('Please specify a valid donation amount.')
      return
    }

    if (!isAnonymous && !donorName.trim()) {
      setError('Please provide your name, or choose "Give Anonymously".')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('amount', effectiveAmount)
      formData.append('campaign_id', selectedCampaign?.id || '')
      formData.append('category', selectedCampaign?.category || 'offering')
      formData.append('payment_method', method)
      formData.append('reference_number', referenceNumber.trim())
      formData.append('is_anonymous', isAnonymous ? '1' : '0')
      formData.append('donor_name', isAnonymous ? 'Anonymous' : donorName.trim())
      formData.append('donor_email', donorEmail.trim())
      formData.append('donor_phone', donorPhone.trim())
      formData.append('donor_message', donorMessage.trim())

      if (receiptFile) {
        formData.append('proof_receipt', receiptFile)
      }

      const token = localStorage.getItem('access_token')
      const headers = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_URL}/api/donations/submit`, {
        method: 'POST',
        headers,
        body: formData
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit donation.')
      }

      setSuccessResult({
        tracking_code: data.tracking_code,
        amount: effectiveAmount,
        campaign: selectedCampaign?.title || 'General Offering'
      })
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSuccessResult(null)
    setReferenceNumber('')
    setDonorMessage('')
    removeReceipt()
  }

  // Summary stats for history
  const historyStats = useMemo(() => {
    let totalVerified = 0
    let pendingCount = 0
    myHistory.forEach((h) => {
      if (h.status === 'verified') totalVerified += Number(h.amount) || 0
      if (h.status === 'pending') pendingCount++
    })
    return { totalVerified, pendingCount, totalCount: myHistory.length }
  }, [myHistory])

  const gcashDisplay = paymentInfo?.gcash?.number || '0963 590 3836'
  const gcashRaw = gcashDisplay.replace(/\s+/g, '')

  const mayaDisplay = paymentInfo?.maya?.number || '0963 590 3836'
  const mayaRaw = mayaDisplay.replace(/\s+/g, '')

  return (
    <div className="pg-root" style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px 60px' }}>
      {/* Hero Banner */}
      <div className="pg-hero" style={{ marginBottom: 28 }}>
        <div style={{ maxWidth: 640 }}>
          <div className="pg-chip" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', marginBottom: 12 }}>
            <HeartHandshake size={15} /> LIFEGEN GIVING
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2 }}>
            Empower the Generation Through Giving
          </h1>
          <p style={{ fontSize: 16, opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
            &ldquo;Honor the Lord with your wealth and with the best part of everything you produce.&rdquo;
            <span style={{ display: 'block', fontSize: 13, marginTop: 4, opacity: 0.75 }}>— Proverbs 3:9</span>
          </p>
        </div>
      </div>

      {/* Tabs: Give Now vs My History */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--p-border)', paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab('give')}
          className={`p-btn ${activeTab === 'give' ? 'p-btn-primary' : 'p-btn-secondary'}`}
        >
          <Sparkles size={16} /> Give Now
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`p-btn ${activeTab === 'history' ? 'p-btn-primary' : 'p-btn-secondary'}`}
        >
          <History size={16} /> My Giving History
          {historyStats.pendingCount > 0 && (
            <span style={{ marginLeft: 6, background: '#ff5a0a', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {historyStats.pendingCount}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="alert" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--p-bad-soft)', color: 'var(--p-bad)', padding: '12px 16px', borderRadius: 12 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Success View */}
      {successResult ? (
        <div style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 24, padding: '40px 24px', textAlign: 'center', maxWidth: 600, margin: '20px auto', boxShadow: 'var(--p-shadow)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Thank You for Your Generosity!</h2>
          <p style={{ color: 'var(--p-text-2)', margin: '0 0 20px', fontSize: 14 }}>
            Your donation of <b>{fmtCurrency(successResult.amount)}</b> for <b>{successResult.campaign}</b> has been received and queued for verification.
          </p>

          <div style={{ background: 'var(--p-sunken)', padding: '16px 20px', borderRadius: 16, marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--p-text-3)' }}>Tracking Code:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>
              {successResult.tracking_code}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(successResult.tracking_code, 'success-code')}
              style={{ border: 0, background: 'none', cursor: 'pointer', opacity: 0.8 }}
              title="Copy tracking code"
            >
              {copiedKey === 'success-code' ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--p-text-2)', maxWidth: 440, margin: '0 auto 24px' }}>
            Our treasury and officers will verify your proof of payment shortly. May the Lord bless and multiply your seed!
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button type="button" className="p-btn p-btn-primary" onClick={resetForm}>
              Give Again
            </button>
            <button type="button" className="p-btn p-btn-secondary" onClick={() => setActiveTab('history')}>
              View My History
            </button>
          </div>
        </div>
      ) : activeTab === 'history' ? (
        /* Member Donation History Tab (Smooth UX) */
        <div style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 20, padding: 24, boxShadow: 'var(--p-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>My Giving Records</h2>
              <p style={{ fontSize: 13, color: 'var(--p-text-2)', margin: 0 }}>
                Review past tithes, camp sponsorships, and verification statuses.
              </p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
              className="p-btn p-btn-secondary p-btn-sm"
              title="Refresh giving records"
            >
              <RefreshCw size={14} className={historyLoading ? 'p-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--p-sunken)', padding: '12px 16px', borderRadius: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--p-text-3)', fontWeight: 600 }}>Total Verified</span>
              <strong style={{ display: 'block', fontSize: 18, color: 'var(--p-accent, #c2410c)', marginTop: 2 }}>
                {fmtCurrency(historyStats.totalVerified)}
              </strong>
            </div>

            <div style={{ background: 'var(--p-sunken)', padding: '12px 16px', borderRadius: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--p-text-3)', fontWeight: 600 }}>Total Gifts</span>
              <strong style={{ display: 'block', fontSize: 18, marginTop: 2 }}>
                {historyStats.totalCount}
              </strong>
            </div>

            <div style={{ background: 'var(--p-sunken)', padding: '12px 16px', borderRadius: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--p-text-3)', fontWeight: 600 }}>Pending Review</span>
              <strong style={{ display: 'block', fontSize: 18, color: historyStats.pendingCount > 0 ? '#ff5a0a' : 'inherit', marginTop: 2 }}>
                {historyStats.pendingCount}
              </strong>
            </div>
          </div>

          {/* Records List or Skeleton */}
          {historyLoading ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ height: 72, background: 'var(--p-sunken)', borderRadius: 14, opacity: 0.6 }} />
              ))}
            </div>
          ) : myHistory.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--p-text-2)' }}>
              <HeartHandshake size={42} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>No giving records yet</h3>
              <p style={{ fontSize: 13, color: 'var(--p-text-3)', maxWidth: 360, margin: '0 auto 18px' }}>
                When you make a contribution via GCash, Maya, or bank transfer, your receipts and tracking codes will appear here.
              </p>
              <button
                type="button"
                className="p-btn p-btn-primary p-btn-sm"
                onClick={() => setActiveTab('give')}
              >
                <Sparkles size={14} /> Make a Donation
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {myHistory.map((h) => {
                const isVerified = h.status === 'verified'
                const isRejected = h.status === 'rejected'
                const isPending = h.status === 'pending'

                return (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '16px 18px',
                      borderRadius: 16,
                      background: 'var(--p-sunken)',
                      border: '1px solid var(--p-border)',
                      flexWrap: 'wrap',
                      gap: 14
                    }}
                  >
                    <div style={{ minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--p-accent, #c2410c)' }}>
                          {fmtCurrency(h.amount)}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)' }}>
                          {h.campaign_title || h.category}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--p-text-2)', marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{h.tracking_code}</span>
                        <span>·</span>
                        <span style={{ fontWeight: 600 }}>{h.payment_method.toUpperCase()}</span>
                        {h.reference_number && (
                          <>
                            <span>·</span>
                            <span>Ref: <b>{h.reference_number}</b></span>
                          </>
                        )}
                        <span>·</span>
                        <span>{fmtDateTime(h.created_at)}</span>
                      </div>

                      {h.donor_message && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, fontStyle: 'italic', color: 'var(--p-text-2)' }}>
                          &ldquo;{h.donor_message}&rdquo;
                        </p>
                      )}

                      {h.admin_notes && (
                        <div style={{ marginTop: 8, fontSize: 12, color: isRejected ? '#dc2626' : 'var(--p-text-2)', background: isRejected ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: 6 }}>
                          <b>Note:</b> {h.admin_notes}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background: isVerified ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                          color: isVerified ? '#166534' : isRejected ? '#991b1b' : '#92400e'
                        }}
                      >
                        {isVerified && <CheckCircle2 size={14} />}
                        {isPending && <Clock size={14} />}
                        {isRejected && <XCircle size={14} />}
                        {h.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Give Now Form */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          {/* Left Column: Form */}
          <form onSubmit={handleSubmit} style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 24, padding: 24, display: 'grid', gap: 22 }}>
            {/* Step 1: Select Fund */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 10 }}>
                1. Select Giving Fund / Campaign
              </label>
              <div style={{ display: 'grid', gap: 10 }}>
                {campaigns.map((c) => {
                  const isSel = selectedCampaign?.id === c.id
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCampaign(c)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 14,
                        border: `2px solid ${isSel ? 'var(--p-accent, #c2410c)' : 'var(--p-border)'}`,
                        background: isSel ? 'var(--p-accent-soft, #fdeee3)' : 'var(--p-sunken)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: isSel ? 'var(--p-accent, #c2410c)' : 'inherit' }}>
                          {c.title}
                        </span>
                        {c.target_amount > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-text-2)' }}>
                            {c.progress_percent}% of {fmtCurrency(c.target_amount)}
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--p-text-2)', lineHeight: 1.4 }}>
                          {c.description}
                        </p>
                      )}
                      {c.target_amount > 0 && (
                        <div style={{ marginTop: 8, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, c.progress_percent || 0)}%`,
                              background: 'var(--p-accent, #c2410c)',
                              borderRadius: 999
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Choose Amount */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 10 }}>
                2. Select Amount
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {PRESET_AMOUNTS.map((amt) => {
                  const isSel = !customAmount && parseFloat(amount) === amt
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setAmount(String(amt)); setCustomAmount('') }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 14,
                        border: `1.5px solid ${isSel ? 'var(--p-accent, #c2410c)' : 'var(--p-border)'}`,
                        background: isSel ? 'var(--p-accent, #c2410c)' : 'var(--p-sunken)',
                        color: isSel ? '#fff' : 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      {fmtCurrency(amt)}
                    </button>
                  )
                })}
              </div>

              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 10, fontWeight: 700, color: 'var(--p-text-3)' }}>
                  ₱
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Or enter custom amount..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="p-input"
                  style={{ width: '100%', paddingLeft: 28, height: 42, borderRadius: 12 }}
                />
              </div>
            </div>

            {/* Step 3: Donor Details */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                  3. Your Information
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>Give Anonymously</span>
                </label>
              </div>

              {!isAnonymous && (
                <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    required={!isAnonymous}
                    placeholder="Full Name"
                    className="p-input"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    style={{ height: 40, borderRadius: 10 }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  type="email"
                  placeholder="Email (for receipt updates)"
                  className="p-input"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  style={{ height: 40, borderRadius: 10 }}
                />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  className="p-input"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  style={{ height: 40, borderRadius: 10 }}
                />
              </div>
            </div>

            {/* Step 4: Reference Number & Upload Receipt */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 10 }}>
                4. Payment Verification (GCash / Maya / Bank)
              </label>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Reference / Transaction Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1029384756 or Ref ID from SMS"
                  className="p-input"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  style={{ height: 40, borderRadius: 10, width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Upload Proof of Payment (Screenshot / Receipt)
                </label>

                {receiptPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--p-border)' }}>
                    <img src={receiptPreview} alt="Receipt preview" style={{ maxWidth: '100%', maxHeight: 180, display: 'block' }} />
                    <button
                      type="button"
                      onClick={removeReceipt}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        border: 0,
                        borderRadius: '50%',
                        width: 26,
                        height: 26,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--p-border)',
                      borderRadius: 14,
                      padding: '18px 16px',
                      textAlign: 'center',
                      background: 'var(--p-sunken)',
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={22} style={{ opacity: 0.5, margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Click to browse receipt screenshot</div>
                    <div style={{ fontSize: 11, color: 'var(--p-text-3)', marginTop: 2 }}>JPG, PNG or WEBP (Max 15MB)</div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Prayer Request / Dedication Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Share a short prayer or what this gift is dedicated for..."
                  className="p-input"
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  style={{ width: '100%', borderRadius: 10, padding: 8, fontSize: 13 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="p-btn p-btn-primary"
              style={{ width: '100%', padding: '14px 20px', fontSize: 16, fontWeight: 700, justifyContent: 'center' }}
            >
              {submitting ? 'Submitting Donation...' : `Give ${fmtCurrency(effectiveAmount || 0)}`}
            </button>
          </form>

          {/* Right Column: Church Payment Details Card */}
          <div style={{ position: 'sticky', top: 24, display: 'grid', gap: 16 }}>
            {/* Payment Modes Selector */}
            <div style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 20, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="var(--p-accent, #c2410c)" /> Official Giving Accounts
              </h3>

              {/* Mode Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                {[
                  { id: 'gcash', label: 'GCash' },
                  { id: 'maya', label: 'Maya' },
                  { id: 'bank', label: 'BDO Bank' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: `1.5px solid ${method === m.id ? 'var(--p-accent, #c2410c)' : 'var(--p-border)'}`,
                      background: method === m.id ? 'var(--p-accent, #c2410c)' : 'var(--p-sunken)',
                      color: method === m.id ? '#fff' : 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Account Display Box */}
              {method === 'gcash' && (
                <div style={{ background: '#005CE6', color: '#fff', borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.04em' }}>GCash</span>
                    <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                      Express Send
                    </span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.9 }}>Account Name:</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                    {paymentInfo?.gcash?.name || 'Danielle Psalm Rodel / LifeGen'}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.9 }}>GCash Number:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, letterSpacing: '0.04em' }}>
                      {gcashDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(gcashRaw, 'gcash-num')}
                      style={{ border: 0, background: '#fff', color: '#005CE6', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {copiedKey === 'gcash-num' ? <Check size={13} /> : <Copy size={13} />} Copy
                    </button>
                  </div>
                </div>
              )}

              {method === 'maya' && (
                <div style={{ background: '#00D632', color: '#000', borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.04em' }}>Maya</span>
                    <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.12)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                      Send Money
                    </span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.8 }}>Account Name:</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                    {paymentInfo?.maya?.name || 'Life Generation Church'}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.8 }}>Mobile / Account Number:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)', padding: '8px 12px', borderRadius: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, letterSpacing: '0.04em' }}>
                      {mayaDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mayaRaw, 'maya-num')}
                      style={{ border: 0, background: '#000', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {copiedKey === 'maya-num' ? <Check size={13} /> : <Copy size={13} />} Copy
                    </button>
                  </div>
                </div>
              )}

              {method === 'bank' && (
                <div style={{ background: '#003366', color: '#fff', borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.04em' }}>BDO Unibank</span>
                    <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                      Bank Transfer
                    </span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.9 }}>Account Name:</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                    {paymentInfo?.bank?.account_name || 'Life Generation Calapan Ministry'}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.9 }}>Account Number:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>
                      {paymentInfo?.bank?.account_number || '0012 3456 7890'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentInfo?.bank?.account_number || '001234567890', 'bdo-num')}
                      style={{ border: 0, background: '#fff', color: '#003366', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {copiedKey === 'bdo-num' ? <Check size={13} /> : <Copy size={13} />} Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--p-text-2)', lineHeight: 1.5, display: 'grid', gap: 6 }}>
                <div>1. Send your donation through your chosen e-wallet or bank app.</div>
                <div>2. Take a screenshot of the completed transfer confirmation showing the <b>Reference Number</b>.</div>
                <div>3. Fill out the form on the left, paste the Reference Number, and attach the screenshot!</div>
              </div>
            </div>

            {/* Trust and Transparency Pill */}
            <div style={{ background: 'var(--p-sunken)', border: '1px solid var(--p-border)', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldCheck size={28} color="#16a34a" style={{ flex: 'none' }} />
              <div style={{ fontSize: 12, color: 'var(--p-text-2)', lineHeight: 1.4 }}>
                <b>Accountability & Trust:</b> All contributions are reviewed by church treasury and officers. Acknowledgements are issued for every verified donation.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
