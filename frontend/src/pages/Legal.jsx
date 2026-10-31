import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, FileText, HandCoins, Mail } from 'lucide-react'
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
    title: 'Giving Policy',
    intro: 'How gifts are received, verified and used.',
    sections: [
      ['Voluntary gifts', 'All giving is voluntary and comes from the heart. There is no required or suggested amount. Choose where it should go (such as general offering or a youth camp) and give what you have decided to give.'],
      ['How to give', 'Send your gift through the official GCash, Maya or bank account shown on the Give page, then submit the form with your reference number and a screenshot of the receipt. We never ask for your password, PIN or OTP.'],
      ['Verification', 'Gifts are checked by our officers against the official account. Your giving record shows Pending, Verified or Rejected. If rejected, a note explains why and you may submit it again with the correct details.'],
      ['Acknowledgement', 'Each submission gets a tracking code. Verified gifts appear in your giving history.'],
      ['Refunds', 'Gifts are generally non-refundable. If you sent the wrong amount or paid twice by mistake, contact an officer with your tracking code as soon as possible and we will review it.'],
      ['Accountability', 'Funds are used for the purpose of the selected campaign. Officers review totals regularly and keep the records for transparency.'],
      ['Anonymous giving', 'You may give anonymously. Your name will not be shown in public lists, but authorized officers still see the record for verification.'],
    ],
  },
}

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const LINKS = [['privacy', '/privacy', 'Privacy Policy'], ['terms', '/terms', 'Terms of Use'], ['giving', '/giving-policy', 'Giving Policy']]

export default function Legal({ doc = 'privacy' }) {
  const d = DOCS[doc] || DOCS.privacy
  const Icon = d.icon
  const [active, setActive] = useState(slug(d.sections[0][0]))
  const root = useRef(null)
  const words = d.title.split(' ')
  const last = words.pop()

  useEffect(() => {
    const prev = document.title
    document.title = `${d.title} · Life Generation`
    window.scrollTo(0, 0)
    setActive(slug(d.sections[0][0]))
    return () => { document.title = prev }
  }, [d])

  /* highlight the section being read */
  useEffect(() => {
    const els = [...root.current.querySelectorAll('[data-sec]')]
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [d])

  const go = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <article className="lgl" ref={root}>
      <div className="lgl-glow" aria-hidden="true" />
      <header className="lgl-hero">
        <Link to="/" className="lgl-back"><ArrowLeft size={15} aria-hidden="true" /> Home</Link>
        <span className="lgl-ico"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
        <h1>{words.join(' ')} <span>{last}</span></h1>
        <p>{d.intro}</p>
        <small>Last updated {UPDATED}</small>
      </header>

      <div className="lgl-grid">
        <div className="lgl-toc" role="navigation" aria-label={`${d.title} sections`}>
          <ul>
            {d.sections.map(([h]) => (
              <li key={h}>
                <a href={`#${slug(h)}`} onClick={(e) => go(e, slug(h))} aria-current={active === slug(h) ? 'true' : undefined}>{h}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lgl-body">
          {d.sections.map(([h, t]) => (
            <section key={h} id={slug(h)} data-sec>
              <h2>{h}</h2>
              <p>{t}</p>
            </section>
          ))}

          <aside className="lgl-more" aria-label="Related pages">
            <h3>Related policies</h3>
            <div>
              {LINKS.filter(([k]) => k !== doc).map(([k, to, label]) => (
                <Link key={k} to={to}>{label}</Link>
              ))}
              <Link to="/give">Give online</Link>
            </div>
            <p><Mail size={15} aria-hidden="true" /> Questions or requests about your data? Talk to an officer or message our official Facebook page.</p>
          </aside>
        </div>
      </div>
    </article>
  )
}
