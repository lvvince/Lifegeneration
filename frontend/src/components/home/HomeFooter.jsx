import { Link } from 'react-router-dom'
import { getUser } from '../../api.js'
import { useAuthModal } from '../../context/AuthModal.jsx'
import { FacebookIcon, InstagramIcon, TikTokIcon, SOCIALS } from './SocialIcons.jsx'

export default function HomeFooter() {
  const user = getUser()
  const { openRegister } = useAuthModal()

  return (
    <footer className="lg-foot">
      <div className="lg-foot-in">
        <div className="lg-wrap">
          <div className="lg-foot-top">
            <div className="lg-foot-brand">
              <Link to="/" className="lg-brand">
                <img src="/logo.png" alt="" />
                <span>
                  Life<b>Gen</b>
                </span>
              </Link>
              <p>A Christ-centered youth organization in Calapan, a church-related ministry for the next generation.</p>
              <div className="lg-foot-social">
                <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <FacebookIcon />
                </a>
                <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <InstagramIcon />
                </a>
                <a href={SOCIALS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <TikTokIcon />
                </a>
              </div>
            </div>

            <div className="lg-foot-cols">
              <div>
                <h4>Explore</h4>
                <ul>
                  <li><Link to="/events">Events</Link></li>
                  <li><Link to="/dgroups">D-Groups</Link></li>
                  <li><Link to="/ministries">Ministries</Link></li>
                  <li><Link to="/prayer">Prayer Wall</Link></li>
                </ul>
              </div>
              <div>
                <h4>Give</h4>
                <ul>
                  <li><Link to="/give">Give online</Link></li>
                  <li><Link to="/giving-policy">Giving policy</Link></li>
                </ul>
              </div>
              <div>
                <h4>Members</h4>
                <ul>
                  {user ? (
                    <li><Link to="/dashboard">My profile</Link></li>
                  ) : (
                    <>
                      <li><button type="button" onClick={openRegister}>Join Life Generation</button></li>
                      <li><Link to="/login">Sign in</Link></li>
                    </>
                  )}
                </ul>
              </div>
              <div>
                <h4>Connect</h4>
                <ul>
                  <li><a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li>
                  <li><a href={SOCIALS.radical} target="_blank" rel="noopener noreferrer">Radical LED Calapan</a></li>
                  <li><a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li>
                  <li><a href={SOCIALS.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a></li>
                </ul>
              </div>
            </div>
          </div>

          <span className="lg-foot-mark" aria-hidden="true" data-parallax="-0.05">LIFEGEN</span>
          <div className="lg-foot-bottom">
            <span>© {new Date().getFullYear()} Life Generation Calapan. Calapan, Oriental Mindoro.</span>
            <div className="lg-foot-legal" role="navigation" aria-label="Legal">
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms of use</Link>
              <Link to="/giving-policy">Giving policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
