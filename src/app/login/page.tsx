'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [identifier, setIdentifier] = useState('') // email OR username
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let email = identifier

    if (!identifier.includes('@')) {
      // it's a username — resolve to email server-side
      const res = await fetch('/api/auth/resolve-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier }),
      })
      const data = await res.json()
      if (!res.ok || !data.email) {
        setError('No account found with that username')
        setLoading(false)
        return
      }
      email = data.email
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Incorrect username/email or password'
        : signInError.message)
      return
    }

    // A hard navigation here (not router.push) is intentional: it guarantees
    // the very next request to the server carries the fresh auth cookie, and
    // it wipes out any pages Next.js prefetched in the background *before*
    // login finished (which would otherwise have cached a "not logged in"
    // redirect for up to ~30s and kept serving it after login).
    window.location.href = '/dashboard'
  }

  return (
    <div className="max-w-md mx-auto mt-24 px-6">
      <h1 className="text-3xl font-bold mb-2">Log in to SiteFlow</h1>
      <p className="text-gray-500 mb-6">Enter your username or email and password.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text" placeholder="Username or email" value={identifier}
          onChange={(e) => setIdentifier(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-black text-white rounded-lg px-4 py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        No account? <a href="/register" className="underline">Sign up</a>
      </p>
    </div>
  )
}
