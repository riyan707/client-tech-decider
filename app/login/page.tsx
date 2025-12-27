'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    const e = email.trim().toLowerCase()
    if (!e || !password) return alert('Enter email + password')

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    })
    setLoading(false)

    console.log('SIGNIN RESULT:', { data, error })

    if (error) return alert(`Auth error: ${error.message}`)

    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h1>Admin Login</h1>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Admin email"
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{ width: '100%', padding: 10, marginBottom: 12 }}
      />

      <button onClick={signIn} disabled={loading} style={{ width: '100%', padding: 10 }}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </div>
  )
}
