import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth.service'
import { decodeJWT } from '@/lib/auth'
import { mapApiError } from '@/lib/utils'

export default function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const tokens = await login({ email, password })
      const payload = decodeJWT(tokens.access)
      if (!payload) { setError('Daxil olmaq mümkün olmadı.'); return }
      if (payload.role === 'BUSINESS_OWNER') navigate('/business/orders')
      else if (payload.role === 'MECHANIC') navigate('/mechanic/orders')
      else if (payload.role === 'SUPER_ADMIN') navigate('/admin')
      else setError('Naməlum istifadəçi rolu.')
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email və ya telefon nömrəsi
        </label>
        <input
          id="email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@servis.az və ya 0501234567"
          required
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Şifrə
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-semibold rounded-xl py-3.5 text-base transition-colors min-h-[52px] flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Yüklənir...
          </>
        ) : 'Daxil ol'}
      </button>
    </form>
  )
}
