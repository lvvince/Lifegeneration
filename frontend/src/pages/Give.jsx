import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  HeartHandshake, CheckCircle2, Copy, Check, Upload, X, AlertCircle,
  ShieldCheck, Sparkles, Wallet, History, Clock, XCircle, RefreshCw, ReceiptText,
} from 'lucide-react'
import { apiGet, API_URL, getUser } from '../api.js'
import { fmtCurrency, fmtDateTime } from '../lib/format.js'
import '../styles/pages.css'
import '../styles/give.css'

const MAX_RECEIPT = 15 * 1024 * 1024
const METHODS = [
  { id: 'gcash', label: 'GCash', title: 'GCash number' },
  { id: 'maya', label: 'Maya', title: 'Maya number' },
  { id: 'bank', label: 'BDO Bank', title: 'Account number' },
]
const STATUS = {
  verified: { icon: CheckCircle2, label: 'Verified' },
  pending: { icon: Clock, label: 'Pending' },
  rejected: { icon: XCircle, label: 'Rejected' },
}

export default function Give() {
  const user = useMemo(() => getUser(), [])
  const [params] = useSearchParams()

  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [method, setMethod] = useState('gcash')
  const [amount, setAmount] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [donorName, setDonorName] = useState(user?.full_name || user?.username || '')
  const [donorEmail, setDonorEmail] = useState(user?.email || '')
  const [donorPhone, setDonorPhone] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [donorMessage, setDonorMessage] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [dragging, setDragging] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState(null)

  const [copiedKey, setCopiedKey] = useState(null)
  const [activeTab, setActiveTab] = useState('give')
  const [myHistory, setMyHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const fileInputRef = useRef(null)
  const copyTimer = useRef(0)

  useEffect(() => {
    let alive = true
    Promise.all([apiGet('/api/donations/campaigns'), apiGet('/api/donations/payment-info')])
      .then(([cRes, pRes]) => {
        if (!alive) return
        const list = Array.isArray(cRes) ? cRes : []
        setCampaigns(list)
        const wanted = Number(params.get('campaign'))
        setSelectedCampaign(list.find((c) => c.id === wanted) || list[0] || null)
        setPaymentInfo(pRes || null)
      })
      .catch((err) => alive && setError(err.message || 'Failed to load giving options'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Linisin ang preview URL at timer kapag umalis sa page
  useEffect(() => () => {
    clearTimeout(copyTimer.current)
  }, [])
  useEffect(() => () => receiptPreview && URL.revokeObjectURL(receiptPreview), [receiptPreview])

  const loadHistory = () => {
    setHistoryLoading(true)
    apiGet('/api/donations/my-history')
      .then((res) => setMyHistory(Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }
  useEffect(() => {
    if (activeTab === 'history') loadHistory()
  }, [activeTab])

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedKey(null), 1800)
  }

  const takeFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please attach an image (JPG, PNG or WEBP) of your receipt.')
    if (file.size > MAX_RECEIPT) return setError('That image is over 15 MB. Please attach a smaller screenshot.')
    setError('')
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }
  const removeReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    takeFile(e.dataTransfer.files?.[0])
  }

  const effectiveAmount = parseFloat(amount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!effectiveAmount || effectiveAmount <= 0) return setError('Please enter the gift you wish to give.')
    if (!isAnonymous && !donorName.trim()) return setError('Please add your name, or choose to give anonymously.')

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
      if (receiptFile) formData.append('proof_receipt', receiptFile)

      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_URL}/api/donations/submit`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit donation.')
      setSuccessResult({ tracking_code: data.tracking_code, amount: effectiveAmount, campaign: selectedCampaign?.title || 'General Offering' })
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

  const historyStats = useMemo(() => {
    let totalVerified = 0
    let pendingCount = 0
    myHistory.forEach((h) => {
      if (h.status === 'verified') totalVerified += Number(h.amount) || 0
      if (h.status === 'pending') pendingCount++
    })
    return { totalVerified, pendingCount, totalCount: myHistory.length }
  }, [myHistory])

  const accounts = {
    gcash: { name: paymentInfo?.gcash?.name || 'Danielle Psalm Rodel / LifeGen', number: paymentInfo?.gcash?.number || '0963 590 3836' },
    maya: { name: paymentInfo?.maya?.name || 'Life Generation Calapan', number: paymentInfo?.maya?.number || '0963 590 3836' },
    bank: { name: paymentInfo?.bank?.account_name || 'Life Generation Calapan Ministry', number: paymentInfo?.bank?.account_number || '0012 3456 7890', bankName: 'BDO Unibank' },
  }
  const acct = accounts[method]
  const methodMeta = METHODS.find((m) => m.id === method)
  const validAmount = effectiveAmount > 0

  return (
    <div className="gv">
      <header className="gv-hero">
        <div className="gv-hero-in">
          <span className="gv-kicker"><HeartHandshake size={15} aria-hidden="true" /> LifeGen giving</span>
          <h1>Give what is in your heart</h1>
          <p className="gv-lead">There is no set amount and no pressure. Every gift, small or large, is received with thanks and goes to the work God is doing among the youth of Calapan.</p>
          <blockquote>
            “Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.”
            <cite>2 Corinthians 9:7</cite>
          </blockquote>
        </div>
        <ul className="gv-trust" aria-label="How giving works">
          <li><Wallet size={18} aria-hidden="true" /> GCash, Maya or bank</li>
          <li><ShieldCheck size={18} aria-hidden="true" /> Checked by officers</li>
          <li><ReceiptText size={18} aria-hidden="true" /> Tracking code per gift</li>
        </ul>
      </header>

      <div className="gv-tabs" role="tablist" aria-label="Giving">
        <button type="button" role="tab" aria-selected={activeTab === 'give'} className={activeTab === 'give' ? 'is-on' : ''} onClick={() => setActiveTab('give')}>
          <Sparkles size={16} aria-hidden="true" /> Give now
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'history'} className={activeTab === 'history' ? 'is-on' : ''} onClick={() => setActiveTab('history')}>
          <History size={16} aria-hidden="true" /> My giving
          {historyStats.pendingCount > 0 && <span className="gv-count">{historyStats.pendingCount}</span>}
        </button>
      </div>

      {error && (
        <div className="gv-alert" role="alert">
          <AlertCircle size={18} aria-hidden="true" /> <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {successResult ? (
        <section className="gv-done" aria-live="polite">
          <span className="gv-done-ico"><CheckCircle2 size={34} aria-hidden="true" /></span>
          <h2>Thank you for your generosity</h2>
          <p>
            Your gift of <b>{fmtCurrency(successResult.amount)}</b> to <b>{successResult.campaign}</b> was received and is waiting for verification.
          </p>
          <div className="gv-code">
            <small>Tracking code</small>
            <code>{successResult.tracking_code}</code>
            <button type="button" onClick={() => copy(successResult.tracking_code, 'code')} aria-label="Copy tracking code">
              {copiedKey === 'code' ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="gv-small">Our officers will check your proof of payment shortly. You can follow the status under My giving.</p>
          <div className="gv-row">
            <button type="button" className="gv-btn" onClick={resetForm}>Give again</button>
            <button type="button" className="gv-btn is-line" onClick={() => { resetForm(); setActiveTab('history') }}>View my giving</button>
          </div>
        </section>
      ) : activeTab === 'history' ? (
        <section className="gv-panel">
          <div className="gv-panel-head">
            <div>
              <h2>My giving records</h2>
              <p>Past gifts and their verification status.</p>
            </div>
            <button type="button" className="gv-btn is-line is-sm" onClick={loadHistory} disabled={historyLoading}>
              <RefreshCw size={14} className={historyLoading ? 'p-spin' : ''} aria-hidden="true" /> Refresh
            </button>
          </div>

          <dl className="gv-stats">
            <div><dt>Total verified</dt><dd className="is-or">{fmtCurrency(historyStats.totalVerified)}</dd></div>
            <div><dt>Gifts</dt><dd>{historyStats.totalCount}</dd></div>
            <div><dt>Pending</dt><dd>{historyStats.pendingCount}</dd></div>
          </dl>

          {historyLoading ? (
            <div className="gv-skels" aria-busy="true">{[0, 1, 2].map((n) => <i key={n} />)}</div>
          ) : myHistory.length === 0 ? (
            <div className="gv-empty">
              <HeartHandshake size={36} strokeWidth={1.5} aria-hidden="true" />
              <h3>No giving records yet</h3>
              <p>When you give through GCash, Maya or bank transfer, your records and tracking codes appear here.</p>
              <button type="button" className="gv-btn" onClick={() => setActiveTab('give')}>Make a gift</button>
            </div>
          ) : (
            <ul className="gv-recs">
              {myHistory.map((h) => {
                const st = STATUS[h.status] || STATUS.pending
                const Icon = st.icon
                return (
                  <li key={h.id} className={`gv-rec is-${h.status}`}>
                    <div className="gv-rec-main">
                      <p className="gv-rec-top">
                        <b>{fmtCurrency(h.amount)}</b>
                        <span>{h.campaign_title || h.category}</span>
                      </p>
                      <p className="gv-rec-meta">
                        <code>{h.tracking_code}</code>
                        <span>{String(h.payment_method || '').toUpperCase()}</span>
                        {h.reference_number && <span>Ref {h.reference_number}</span>}
                        <span>{fmtDateTime(h.created_at)}</span>
                      </p>
                      {h.donor_message && <p className="gv-rec-msg">“{h.donor_message}”</p>}
                      {h.admin_notes && <p className="gv-rec-note"><b>Note:</b> {h.admin_notes}</p>}
                    </div>
                    <span className="gv-status"><Icon size={14} aria-hidden="true" /> {st.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
        <form className="gv-grid" onSubmit={handleSubmit} noValidate>
          <div className="gv-steps">
            {/* 1 fund */}
            <fieldset className="gv-step">
              <legend><i>1</i> Where should it go?</legend>
              {loading ? (
                <div className="gv-skels" aria-busy="true"><i /><i /></div>
              ) : campaigns.length === 0 ? (
                <p className="gv-small">General offering. No special campaigns are open right now.</p>
              ) : (
                <div className="gv-funds" role="radiogroup" aria-label="Giving fund">
                  {campaigns.map((c) => {
                    const on = selectedCampaign?.id === c.id
                    return (
                      <button key={c.id} type="button" role="radio" aria-checked={on} className={`gv-fund${on ? ' is-on' : ''}`} onClick={() => setSelectedCampaign(c)}>
                        <span className="gv-fund-top">
                          <b>{c.title}</b>
                          {c.target_amount > 0 && <small>{c.progress_percent || 0}% of {fmtCurrency(c.target_amount)}</small>}
                        </span>
                        {c.description && <span className="gv-fund-d">{c.description}</span>}
                        {c.target_amount > 0 && (
                          <span className="gv-prog" aria-hidden="true"><i style={{ width: `${Math.min(100, c.progress_percent || 0)}%` }} /></span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </fieldset>

            {/* 2 amount */}
            <fieldset className="gv-step">
              <legend><i>2</i> Your gift, from the heart</legend>
              <p className="gv-heart">Give as you are able and as you feel led. Only you and God know what this gift means.</p>
              <label className="gv-field gv-money">
                <span>Amount you wish to give</span>
                <div>
                  <b aria-hidden="true">₱</b>
                  <input type="number" inputMode="decimal" min="1" step="any" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </label>
            </fieldset>

            {/* 3 send */}
            <fieldset className="gv-step">
              <legend><i>3</i> Send your gift</legend>
              <div className="gv-methods" role="tablist" aria-label="Payment method">
                {METHODS.map((m) => (
                  <button key={m.id} type="button" role="tab" aria-selected={method === m.id} className={method === m.id ? 'is-on' : ''} onClick={() => setMethod(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="gv-acct" key={method}>
                {acct.bankName && <small>{acct.bankName}</small>}
                <small>Account name</small>
                <b>{acct.name}</b>
                <small>{methodMeta.title}</small>
                <div className="gv-num">
                  <code>{acct.number}</code>
                  <button type="button" onClick={() => copy(acct.number.replace(/\s+/g, ''), method)}>
                    {copiedKey === method ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copiedKey === method ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="gv-small">Send the amount in your app, then screenshot the confirmation that shows the reference number. We never ask for your PIN or OTP.</p>
            </fieldset>

            {/* 4 details */}
            <fieldset className="gv-step">
              <legend><i>4</i> Your details</legend>
              <label className="gv-check">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                <i aria-hidden="true"><Check size={14} strokeWidth={3} /></i>
                <span>Give anonymously</span>
              </label>
              {!isAnonymous && (
                <label className="gv-field">
                  <span>Full name</span>
                  <input type="text" autoComplete="name" required value={donorName} onChange={(e) => setDonorName(e.target.value)} />
                </label>
              )}
              <div className="gv-two">
                <label className="gv-field">
                  <span>Email (optional)</span>
                  <input type="email" autoComplete="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
                </label>
                <label className="gv-field">
                  <span>Mobile (optional)</span>
                  <input type="tel" autoComplete="tel" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
                </label>
              </div>
              <label className="gv-field">
                <span>Reference / transaction number</span>
                <input type="text" inputMode="text" placeholder="From your payment confirmation" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </label>

              <div className="gv-field">
                <span id="gv-proof">Proof of payment</span>
                {receiptPreview ? (
                  <div className="gv-proof">
                    <img src={receiptPreview} alt="Receipt preview" />
                    <button type="button" onClick={removeReceipt} aria-label="Remove receipt"><X size={16} /></button>
                  </div>
                ) : (
                  <label
                    className={`gv-drop${dragging ? ' is-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <Upload size={22} aria-hidden="true" />
                    <b>Attach receipt screenshot</b>
                    <small>Tap to browse or drop an image. JPG, PNG or WEBP, up to 15 MB.</small>
                    <input ref={fileInputRef} type="file" accept="image/*" aria-labelledby="gv-proof" onChange={(e) => takeFile(e.target.files?.[0])} />
                  </label>
                )}
              </div>

              <label className="gv-field">
                <span>Prayer or dedication note (optional)</span>
                <textarea rows={2} placeholder="Share what this gift is dedicated for" value={donorMessage} onChange={(e) => setDonorMessage(e.target.value)} />
              </label>
            </fieldset>
          </div>

          {/* summary + submit */}
          <aside className="gv-sum" aria-label="Gift summary">
            <dl>
              <div><dt>Fund</dt><dd>{selectedCampaign?.title || 'General offering'}</dd></div>
              <div><dt>Method</dt><dd>{methodMeta.label}</dd></div>
              <div className="is-total"><dt>Your gift</dt><dd>{validAmount ? fmtCurrency(effectiveAmount) : 'Your choice'}</dd></div>
            </dl>
            <button type="submit" className="gv-btn is-big" disabled={submitting || !validAmount}>
              {submitting ? 'Submitting…' : validAmount ? `Give ${fmtCurrency(effectiveAmount)}` : 'Enter your gift'}
            </button>
            <p className="gv-small">
              By giving you agree to our <Link to="/giving-policy">Giving policy</Link> and <Link to="/privacy">Privacy policy</Link>.
            </p>
          </aside>
        </form>
      )}
    </div>
  )
}
