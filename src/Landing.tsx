import { useState, type FormEvent } from 'react'
import { login } from './store'

type Props = {
  onLoggedIn: (email: string) => void
}

/** Public login — brand first, email + password. */
export function Landing({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await login(email, password)
      onLoggedIn(res.email)
    } catch {
      setError(err instanceof Error && /not configured/i.test(err.message)
        ? 'Sign-in is not configured on the server'
        : 'Invalid email or password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden />
      <main className="landing-main">
        <div className="landing-brand">
          <span className="brand-mark landing-mark" aria-hidden />
          <h1 className="landing-name">Deskly</h1>
        </div>
        <p className="landing-lede">
          Your office work desk — clients, daily tasks, and monthly deliverables in one place.
        </p>
        <form className="landing-form" onSubmit={onSubmit}>
          <label className="landing-field">
            <span className="visually-hidden">Email or username</span>
            <input
              type="text"
              name="email"
              autoComplete="username"
              placeholder="Email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="landing-field">
            <span className="visually-hidden">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="landing-error" role="alert">{error}</p>}
          <button type="submit" className="btn landing-cta" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
