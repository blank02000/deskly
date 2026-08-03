import { useEffect, useState } from 'react'
import DeskApp from './DeskApp'
import { Landing } from './Landing'
import { fetchMe, logout } from './store'

export default function App() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then((me) => setEmail(me.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false))
  }, [])

  async function onLogout() {
    try {
      await logout()
    } finally {
      setEmail(null)
    }
  }

  if (loading) {
    return (
      <div className="boot-msg">
        <p>Loading Deskly…</p>
      </div>
    )
  }

  if (!email) {
    return <Landing onLoggedIn={(e) => setEmail(e)} />
  }

  return <DeskApp onLogout={onLogout} />
}
