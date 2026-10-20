import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet } from '../../api.js'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet(`/api/events/${id}`).then(setEvent).catch((e) => setError(e.message))
  }, [id])

  if (error) return <p>{error}</p>
  if (!event) return <p>Loading...</p>

  return (
    <div className="card">
      <h2>{event.title}</h2>
      <p>{event.venue} &middot; {event.start_at}</p>
      <p>{event.description}</p>
      <Link to="/events">&larr; Back to events</Link>
    </div>
  )
}
