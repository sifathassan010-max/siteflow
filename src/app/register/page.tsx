'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters, letters/numbers/underscore only')
      return
    }

    setLoading(true)

    // check username isn't taken before we even try signup
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError('That username is already taken')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-24 px-6">
        <h1 className="text-3xl font-bold mb-3">Check your email</h1>
        <p className="text-gray-600">
          We sent a confirmation link to {email}. Click it to activate your account, then log in.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-24 px-6">
      <h1 className="text-3xl font-bold mb-6">Create your SiteFlow account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text" placeholder="Full name" value={fullName}
          onChange={(e) => setFullName(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        <input
          type="text" placeholder="Username" value={username}
          onChange={(e) => setUsername(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        <input
          type="password" placeholder="Confirm password" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} required
          className="w-full border rounded-lg px-4 py-3"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-black text-white rounded-lg px-4 py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account? <a href="/login" className="underline">Log in</a>
      </p>
    </div>
  )
}
