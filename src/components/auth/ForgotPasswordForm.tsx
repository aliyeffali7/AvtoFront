import { useState, FormEvent } from 'react'
import { requestPasswordReset, confirmPasswordReset } from '@/services/auth.service'
import { mapApiError } from '@/lib/utils'

export default function ForgotPasswordForm({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault()
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
        email,
        code,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      })
      setStep('done')
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-14 h-14 bg-success-bg rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-ink font-semibold text-base">Şifrə uğurla dəyişdirildi!</p>
          <p className="text-ink-muted text-sm mt-1">İndi yeni şifrənizlə daxil ola bilərsiniz.</p>
        </div>
        <button onClick={onDone} className="btn-primary w-full py-3.5 text-base min-h-[52px] mt-2">
          Daxil ol
        </button>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleConfirm} className="flex flex-col gap-5">
        <p className="text-sm text-ink-muted -mt-1">
          <span className="font-medium text-ink">{email}</span> ünvanına göndərilən kodu və yeni şifrənizi daxil edin.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="label mb-0">Təsdiq kodu</label>
          <input
            id="code"
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
          <label htmlFor="new_password" className="label mb-0">Yeni şifrə</label>
          <input
            id="new_password"
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
          <label htmlFor="confirm_password" className="label mb-0">Yeni şifrəni təsdiqlə</label>
          <input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Şifrəni təkrar daxil edin"
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
          {loading ? 'Yoxlanılır...' : 'Şifrəni dəyiş'}
        </button>
        <button type="button" onClick={() => setStep('email')} className="text-center text-sm text-ink-muted hover:text-ink">
          Başqa email daxil et
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestCode} className="flex flex-col gap-5">
      <p className="text-sm text-ink-muted -mt-1">
        Hesabınıza bağlı emaili daxil edin — sizə təsdiq kodu göndərəcəyik.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset_email" className="label mb-0">Email ünvanı</label>
        <input
          id="reset_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@servis.az"
          required
          autoFocus
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
        {loading ? 'Göndərilir...' : 'Kod göndər'}
      </button>
      <button type="button" onClick={onDone} className="text-center text-sm text-ink-muted hover:text-ink">
        Girişə qayıt
      </button>
    </form>
  )
}
