import { useEffect, useState } from 'react'
import { apiGet } from '../../api.js'

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/members')
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading members...</p>
  if (error) return <div className="alert">{error}</div>

  return (
    <>
      <h2>Member Roster</h2>
      <table>
        <thead>
          <tr><th>Member ID</th><th>Name</th><th>Email</th><th>Status</th></tr>
        </thead>
        <tbody>
          {members.length === 0 && <tr><td colSpan="4">No members yet.</td></tr>}
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.member_code}</td>
              <td>{m.full_name}</td>
              <td>{m.email}</td>
              <td>{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
