import { useState } from 'react'

export default function Login({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    setTimeout(() => {
      if (user.trim() === 'demo' && pass === 'demo') {
        onLogin()
      } else {
        setError(true)
        setLoading(false)
      }
    }, 650)
  }

  return (
    <form className="lc" onSubmit={submit} noValidate>
      <div className="lc-top">
        <span className="lc-badge">🔒 SECURE ACCESS</span>
        <p className="lc-title">Control Panel</p>
        <p className="lc-sub">Cloudflare Edge Network</p>
      </div>

      {error && <div className="lc-error">⚠&nbsp; Invalid credentials</div>}

      <label className="lc-field" htmlFor="login-username">
        <span>Username</span>
        <input
          id="login-username"
          type="text"
          value={user}
          onChange={e => { setUser(e.target.value); setError(false) }}
          placeholder="username"
          autoComplete="username"
          disabled={loading}
        />
      </label>

      <label className="lc-field" htmlFor="login-password">
        <span>Password</span>
        <input
          id="login-password"
          type="password"
          value={pass}
          onChange={e => { setPass(e.target.value); setError(false) }}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={loading}
        />
      </label>

      <button type="submit" className="lc-btn" disabled={loading}>
        {loading ? <span className="lc-spin" /> : 'Sign In →'}
      </button>

      <p className="lc-hint">Try&nbsp;&nbsp;demo / demo</p>
    </form>
  )
}
