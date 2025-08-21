import React, { useState } from 'react'
import { postListExams } from '@/api/grader'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>(() => localStorage.getItem('auth.email') || '')
  const [password, setPassword] = useState<string>(() => localStorage.getItem('auth.password') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const resp = await postListExams({ email, password })
      if (!resp.success) throw new Error(resp.error || 'Auth failed')
      // persist creds for subsequent calls (dev-scope)
      localStorage.setItem('auth.email', email)
      localStorage.setItem('auth.password', password)
      // cache last payload to speed up first render
      localStorage.setItem('exams.cache', JSON.stringify(resp))
      navigate('/exams', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="glass w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Вход</h1>
        <div className="mb-3">
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Пароль</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="••••••••"
          />
        </div>
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
