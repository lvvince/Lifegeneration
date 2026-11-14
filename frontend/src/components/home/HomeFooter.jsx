import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, MessageCircle } from 'lucide-react'
import { getUser } from '../../api.js'
import { useAuthModal } from '../../context/AuthModal.jsx'
import { FacebookIcon, InstagramIcon, TikTokIcon, SOCIALS } from './SocialIcons.jsx'

const FOLLOW = [
  { name: 'Life Generation on Facebook', label: 'Facebook', cls: 'is-fb', href: SOCIALS.facebook, icon: FacebookIcon },
  { name: 'Radical LED Calapan on Facebook', label: 'Radical LED', cls: 'is-fb', href: SOCIALS.radical, icon: FacebookIcon },
  { name: 'Instagram', label: 'Instagram', cls: 'is-ig', href: SOCIALS.instagram, icon: InstagramIcon },
  { name: 'TikTok', label: 'TikTok', cls: 'is-tt', href: SOCIALS.tiktok, icon: TikTokIcon },
]

export default function HomeFooter() {
  const user = getUser()
  const { openRegister } = useAuthModal()

  return (
    <footer className="lg-ft" id="follow">
      <div className="lg-wrap lg-ft-grid">
        <div className="lg-ft-brand">
          <Link to="/" className="lg-ft-logo" aria-label="Life Generation home">
            <img src="/logo.png" alt="" width="40" height="40" />
            <span>Life<b>Gen</b></span>
          </Link>
          <p>A Christ-centered youth organization in Calapan. Photos, recaps and announcements are posted on our pages first.</p>
          <h3>Follow us on</h3>
          <ul className="lg-ft-social">
            {FOLLOW.map(({ name, cls, href, icon: Icon }) => (
              <li key={name}>
                <a href={href} className={cls} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>
                  <span className="lg-ft-ico"><Icon size={20} /></span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg-ft-col" role="navigation" aria-label="Explore">
          <h3>Explore</h3>
          <ul>
            <li><Link to="/events">Events</Link></li>
            <li><Link to="/dgroups">D-Groups</Link></li>
            <li><Link to="/ministries">Ministries</Link></li>
            <li><Link to="/gifts-matcher">Find My Place</Link></li>
            <li><Link to="/give">Give online</Link></li>
          </ul>
        </div>

        <div className="lg-ft-col" role="navigation" aria-label="Community">
          <h3>Community</h3>
          <ul>
            <li><Link to="/prayer">Prayer Wall</Link></li>
            <li><Link to="/god-today">Where have you seen God today?</Link></li>
            {user ? (
              <>
                <li><Link to="/chat">Fellowship Chat</Link></li>
                <li><Link to="/dashboard">My profile</Link></li>
              </>
            ) : (
              <>
                <li><button type="button" onClick={openRegister}>Join Life Generation</button></li>
                <li><Link to="/login">Sign in</Link></li>
              </>
            )}
          </ul>
        </div>

        <div className="lg-ft-col" role="navigation" aria-label="Policies">
          <h3>Policies</h3>
          <ul>
            <li><Link to="/privacy">Privacy policy</Link></li>
            <li><Link to="/terms">Terms of use</Link></li>
            <li><Link to="/giving-policy">Giving policy</Link></li>
          </ul>
        </div>

        <div className="lg-ft-col lg-ft-contact">
          <h3>Quick contact</h3>
          <ul>
            <li><MapPin size={18} aria-hidden="true" /> <span>Calapan City, Oriental Mindoro</span></li>
            <li><MessageCircle size={18} aria-hidden="true" /> <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer">Message us on Facebook</a></li>
            <li><CalendarDays size={18} aria-hidden="true" /> <Link to="/events">See upcoming gatherings</Link></li>
          </ul>
        </div>
      </div>

      <div className="lg-ft-bar">
        <div className="lg-wrap">
          <span>© {new Date().getFullYear()} Life Generation Calapan. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
