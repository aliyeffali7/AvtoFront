import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth.service'
import { mapApiError } from '@/lib/utils'
import { dashboardPathFor } from '@/App'

export default function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [businessCode, setBusinessCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isMechanicLogin = email.trim() !== '' && !email.includes('@')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login({
        email,
        password,
        ...(isMechanicLogin ? { business_code: businessCode } : {}),
      })
      const path = dashboardPathFor(user.role)
      if (path === '/') setError('Naməlum istifadəçi rolu.')
      else navigate(path)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label mb-0">
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
          className="input"
        />
      </div>

      {isMechanicLogin && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="business_code" className="label mb-0">
            Biznes kodu
          </label>
          <input
            id="business_code"
            type="text"
            value={businessCode}
            onChange={(e) => setBusinessCode(e.target.value)}
            placeholder="Servis sahibindən aldığınız kod"
            required
            className="input"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="label mb-0">
          Şifrə
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="input"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-danger-bg border border-danger/30 rounded px-4 py-3 text-sm text-danger">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base min-h-[52px]">
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
