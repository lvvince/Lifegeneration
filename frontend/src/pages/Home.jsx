import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-logo">
          <img src="/lifegen-logo-with-text.png" alt="Life Generation logo" />
        </div>
        <h1>Life Generation Calapan</h1>
        <p>
          Youth Ministry Management System. Register online, see upcoming events,
          and stay connected with your church family.
        </p>
        <Link to="/register" className="btn">Join now</Link>
      </section>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Already a member?</h3>
        <p className="muted">Log in to see events and manage your profile.</p>
        <Link to="/login">Go to login</Link>
      </div>
    </>
  )
}