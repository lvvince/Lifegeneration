import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, FileText, HandCoins } from 'lucide-react'
import '../styles/legal.css'

const UPDATED = 'October 2026'

/* Plain-language na policy. Pakibasa at ipa-review sa officers/adviser bago i-publish nang pormal. */
const DOCS = {
  privacy: {
    icon: ShieldCheck,
    title: 'Privacy Policy',
    intro: 'How Life Generation Calapan collects, uses and protects your personal information, following the Data Privacy Act of 2012 (RA 10173).',
    sections: [
      ['What we collect', 'Your name, email, age, gender, address, member ID and profile photo when you register. We also record event sign-ups and check-ins, D-Group and ministry membership, prayer requests you post, and giving records you submit (amount, payment method, reference number and receipt screenshot).'],
      ['Why we collect it', 'To run your membership, manage events and attendance, connect you with D-Groups and ministries, process and verify gifts, send reminders and announcements, and prepare group-level reports that help our officers care for members.'],
      ['Who can see it', 'Only authorized officers and administrators can see member records, attendance and giving details. Prayer requests marked private are visible only to you and authorized officers. Public prayer requests are visible to signed-in members.'],
      ['Sharing', 'We do not sell your data. We share it only with service providers needed to run the system (hosting and email delivery) or when the law requires it.'],
      ['How long we keep it', 'While your membership is active and as long as needed for giving records and reports. You can ask us to correct or delete your account data, except records we must keep for accountability.'],
      ['Your rights', 'You may access, correct, object to the use of, or request deletion of your personal data, and file a complaint with the National Privacy Commission. Talk to an officer or message our official Facebook page to make a request.'],
      ['Security', 'Passwords are stored hashed, sessions use expiring tokens, and uploaded receipts are viewable only by authorized staff. No system is perfectly secure, so please use a strong, unique password.'],
    ],
  },
  terms: {
    icon: FileText,
    title: 'Terms of Use',
    intro: 'The simple rules for using the Life Generation member portal.',
    sections: [
      ['Who may use it', 'The portal is for Life Generation members, guests of our events, and our officers. Provide accurate information when you register and keep your login private.'],
      ['Respect the community', 'Posts on the prayer wall and any other shared space must be respectful. We may remove content or deactivate accounts that bully, harass, spam, or share harmful or private information about others.'],
      ['Events and attendance', 'Signing up reserves a seat but does not guarantee entry if the event is full. Attendance is recorded by QR check-in by our officers.'],
      ['Your content', 'You remain responsible for what you post. You allow us to display it inside the portal for the purpose it was shared (for example, a public prayer request).'],
      ['Availability', 'We work to keep the portal running but it may be unavailable for maintenance. Features may change as the ministry grows.'],
      ['Changes', 'We may update these terms. Continuing to use the portal after an update means you accept it.'],
    ],
  },
  giving: {
    icon: HandCoins,
    title: 'Giving and Refund Policy',
    intro: 'How gifts are received, verified and used.',
    sections: [
      ['Voluntary gifts', 'All giving is voluntary and is a gift to the ministry. Choose a fund (such as tithes and offerings or a youth camp) and the amount you wish to give.'],
      ['How to give', 'Send your gift through the official GCash, Maya or bank account shown on the Give page, then submit the form with your reference number and a screenshot of the receipt. We never ask for your password, PIN or OTP.'],
      ['Verification', 'Gifts are checked by our officers against the official account. Your giving record shows Pending, Verified or Rejected. If rejected, a note explains why and you may submit it again with the correct details.'],
      ['Acknowledgement', 'Each submission gets a tracking code. Verified gifts appear in your giving history.'],
      ['Refunds', 'Gifts are generally non-refundable. If you sent the wrong amount or paid twice by mistake, contact an officer with your tracking code as soon as possible and we will review it.'],
      ['Accountability', 'Funds are used for the purpose of the selected campaign. Officers review totals regularly and keep the records for transparency.'],
      ['Anonymous giving', 'You may give anonymously. Your name will not be shown in public lists, but authorized officers still see the record for verification.'],
    ],
  },
}

export default function Legal({ doc = 'privacy' }) {
  const d = DOCS[doc] || DOCS.privacy
  const Icon = d.icon

  useEffect(() => {
    const prev = document.title
    document.title = `${d.title} · Life Generation`
    window.scrollTo(0, 0)
    return () => { document.title = prev }
  }, [d.title])

  return (
    <article className="legal">
      <Link to="/" className="legal-back"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
      <header className="legal-head">
        <span className="legal-ico"><Icon size={26} strokeWidth={1.8} aria-hidden="true" /></span>
        <h1>{d.title}</h1>
        <p>{d.intro}</p>
        <small>Last updated {UPDATED}</small>
      </header>

      <nav className="legal-tabs" aria-label="Policies">
        <Link to="/privacy" aria-current={doc === 'privacy' ? 'page' : undefined}>Privacy</Link>
        <Link to="/terms" aria-current={doc === 'terms' ? 'page' : undefined}>Terms</Link>
        <Link to="/giving-policy" aria-current={doc === 'giving' ? 'page' : undefined}>Giving</Link>
      </nav>

      <ol className="legal-body">
        {d.sections.map(([h, t]) => (
          <li key={h}>
            <h2>{h}</h2>
            <p>{t}</p>
          </li>
        ))}
      </ol>
    </article>
  )
}
