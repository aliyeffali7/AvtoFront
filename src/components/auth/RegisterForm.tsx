import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '@/services/auth.service'
import { mapApiError } from '@/lib/utils'

export default function RegisterForm() {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir.')
      return
    }

    setLoading(true)
    try {
      const result = await register({ email, password, password_confirm: confirmPassword, business_name: businessName })
      setSuccessMessage(result.message)
      setTimeout(() => navigate('/business/dashboard'), 1800)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (successMessage) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-14 h-14 bg-success-bg rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-ink font-semibold text-base">Hesab uğurla yaradıldı!</p>
          <p className="text-ink-muted text-sm mt-1">{successMessage}</p>
          <p className="text-ink-muted text-xs mt-2">Panelinizə yönləndirilirsiniz...</p>
        </div>
        <div className="w-6 h-6 border-2 border-success/30 border-t-success rounded-full animate-spin mt-1" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="label mb-0">Servisin adı</label>
        <input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          required
          autoFocus
          placeholder="Məs. Əlinin Avtoservisi"
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label mb-0">Email ünvanı</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          type="email"
          placeholder="owner@servis.az"
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label mb-0">Şifrə</label>
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          type="password"
          placeholder="Minimum 8 simvol"
          minLength={8}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label mb-0">Şifrəni təsdiqlə</label>
        <input
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          type="password"
          placeholder="Şifrəni təkrar daxil edin"
          className={`input ${confirmPassword && confirmPassword !== password ? 'border-danger focus:ring-danger focus:border-danger' : ''}`}
        />
        {confirmPassword && confirmPassword !== password && (
          <p className="text-xs text-danger">Şifrələr uyğun gəlmir</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-danger-bg border border-danger/30 rounded px-4 py-3 text-sm text-danger">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Qeydiyyat...
          </>
        ) : 'Pulsuz başla →'}
      </button>

      <p className="text-center text-xs text-ink-muted">
        Qeydiyyatdan keçməklə istifadə şərtlərini qəbul edirsiniz.
      </p>
    </form>
  )
}
