import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestPasswordReset, confirmPasswordReset, logout } from '@/services/auth.service'
import { mapApiError } from '@/lib/utils'

// Reuses the exact same email-OTP rule as the logged-out "Şifrəni unutmusunuz?"
// flow (ForgotPasswordForm) — the backend endpoints don't care whether the
// caller is authenticated, so no new API surface was needed. The one
// difference: we already know the user's email, so there's no "step 1" email
// entry — straight to "send code".
export default function ChangePasswordSection({ email }: { email: string }) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'idle' | 'code' | 'done'>('idle')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestCode() {
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setStep('code')
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir.')
      return
    }
    setLoading(true)
    try {
      await confirmPasswordReset({
        email, code, new_password: newPassword, new_password_confirm: confirmPassword,
      })
      setStep('done')
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleFinish() {
    // A successful reset blacklists every session server-side — including
    // this tab's own — as a security measure. Log out client-side too so no
    // half-dead session lingers, then send the user back to sign in fresh.
    await logout()
    navigate('/')
  }

  if (step === 'done') {
    return (
      <div className="card p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 bg-success-subtle rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-ink font-display font-semibold text-h3">Şifrə uğurla dəyişdirildi!</p>
          <p className="text-text-3 text-body mt-1">Təhlükəsizlik üçün bütün sessiyalar bağlandı — yenidən daxil olun.</p>
        </div>
        <button onClick={handleFinish} className="btn-primary w-full min-h-[52px]">
          Daxil ol
        </button>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleConfirm} className="card p-6 flex flex-col gap-5">
        <div>
          <h2 className="font-display font-semibold text-h3 text-ink">Şifrəni dəyiş</h2>
          <p className="text-body text-text-3 mt-1">
            <span className="font-semibold text-ink">{email}</span> ünvanına göndərilən kodu və yeni şifrənizi daxil edin.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cp_code" className="label mb-0">Təsdiq kodu</label>
          <input
            id="cp_code"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            autoFocus
            className="input-mono text-center tracking-[0.3em]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cp_new" className="label mb-0">Yeni şifrə</label>
          <input
            id="cp_new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 simvol"
            minLength={8}
            required
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cp_confirm" className="label mb-0">Yeni şifrəni təsdiqlə</label>
          <input
            id="cp_confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Şifrəni təkrar daxil edin"
            required
            className="input"
          />
        </div>

        {error && <p className="text-small text-danger-strong bg-danger-subtle rounded px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Yoxlanılır...' : 'Şifrəni dəyiş'}
          </button>
          <button type="button" onClick={() => setStep('idle')} className="text-body text-text-3 hover:text-ink px-3">
            Ləğv et
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="card p-6 flex flex-col gap-3">
      <div>
        <h2 className="font-display font-semibold text-h3 text-ink">Şifrəni dəyiş</h2>
        <p className="text-body text-text-3 mt-1">
          <span className="font-semibold text-ink">{email}</span> ünvanına təsdiq kodu göndəriləcək.
        </p>
      </div>
      {error && <p className="text-small text-danger-strong bg-danger-subtle rounded px-4 py-3">{error}</p>}
      <button
        onClick={handleRequestCode}
        disabled={loading}
        className="btn-secondary w-fit"
      >
        {loading ? 'Göndərilir...' : 'Kod göndər'}
      </button>
    </div>
  )
}
