'use client'
import { useEffect, useRef, useState } from 'react'
import { getBusinessProfile, updateBusinessProfile } from '@/services/auth.service'
import { Business } from '@/types'
import { mapApiError } from '@/lib/utils'
import { useCurrentUser } from '@/App'
import ChangePasswordSection from '@/components/settings/ChangePasswordSection'

export default function SettingsClient() {
  const currentUser = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [guaranteeText, setGuaranteeText] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getBusinessProfile()
      .then(res => {
        const b: Business = res.data
        setName(b.name ?? '')
        setLoginCode(b.login_code ?? '')
        setPhone(b.phone ?? '')
        setAddress(b.address ?? '')
        setGuaranteeText(b.guarantee_text ?? '')
        if (b.logo) setLogoPreview(b.logo.startsWith('http') ? b.logo : (import.meta.env.VITE_API_URL ?? '') + b.logo)
        if (b.signature) setSignaturePreview(b.signature.startsWith('http') ? b.signature : (import.meta.env.VITE_API_URL ?? '') + b.signature)
      })
      .catch(() => setError('Məlumatlar yüklənmədi'))
      .finally(() => setLoading(false))
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('phone', phone.trim())
      form.append('address', address.trim())
      form.append('guarantee_text', guaranteeText.trim())
      if (logoFile) form.append('logo', logoFile)
      if (signatureFile) form.append('signature', signatureFile)
      await updateBusinessProfile(form)
      setSuccess(true)
      setLogoFile(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-rule border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="page-title mb-6">Biznes Tənzimləmələri</h1>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">

        {/* Logo */}
        <div className="flex flex-col gap-2">
          <label className="label">Logo</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded border-2 border-dashed border-rule flex items-center justify-center cursor-pointer hover:border-accent hover:bg-surface-alt transition-colors overflow-hidden shrink-0"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <svg className="w-7 h-7 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25M3 8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25M3 8.25h18" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-accent hover:text-accent-hover text-left"
              >
                {logoPreview ? 'Logoyu dəyiş' : 'Logo yüklə'}
              </button>
              <p className="text-xs text-ink-muted">PNG, JPG — maks 2 MB</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        {/* Name */}
        <div>
          <label className="label">Biznes adı</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Məs: Garage 1903"
            className="input"
          />
        </div>

        {/* Login code (read-only) — mechanics need this to log in */}
        <div>
          <label className="label">Biznes kodu</label>
          <p className="text-xs text-ink-muted mb-1.5">
            Ustalarınız daxil olarkən telefon nömrəsi ilə yanaşı bu kodu daxil etməlidir.
          </p>
          <input value={loginCode} readOnly className="input-mono bg-surface-alt" />
        </div>

        {/* Phone */}
        <div>
          <label className="label">Telefon nömrəsi</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Məs: 010 123 45 67"
            className="input-mono"
          />
        </div>

        {/* Address */}
        <div>
          <label className="label">Ünvan</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Məs: Binəqədi Şossesi 31"
            className="input"
          />
        </div>

        {/* Guarantee text */}
        <div>
          <label className="label">Zəmanət mətni</label>
          <p className="text-xs text-ink-muted mb-1.5">Sifarişdə "Zəmanət var" işarələndikdə bu mətn PDF-ə əlavə ediləcək.</p>
          <textarea
            value={guaranteeText}
            onChange={e => setGuaranteeText(e.target.value)}
            placeholder="Məs: İşimizə 3 ay zəmanət veririk. Eyni nasazlıq baş verərsə pulsuz düzəldilir."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Signature image */}
        <div className="flex flex-col gap-2">
          <label className="label">İmza şəkli</label>
          <p className="text-xs text-ink-muted -mt-1">PDF-ə ixrac zamanı servis imzası yerinə bu şəkil göstəriləcək.</p>
          <div className="flex items-center gap-4">
            <div
              onClick={() => signatureInputRef.current?.click()}
              className="w-32 h-16 rounded border-2 border-dashed border-rule flex items-center justify-center cursor-pointer hover:border-accent hover:bg-surface-alt transition-colors overflow-hidden shrink-0"
            >
              {signaturePreview ? (
                <img src={signaturePreview} alt="İmza" className="w-full h-full object-contain p-1" />
              ) : (
                <svg className="w-6 h-6 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => signatureInputRef.current?.click()} className="text-sm font-medium text-accent hover:text-accent-hover text-left">
                {signaturePreview ? 'İmzanı dəyiş' : 'İmza yüklə'}
              </button>
              <p className="text-xs text-ink-muted">PNG, JPG — ağ fon tövsiyə edilir</p>
            </div>
          </div>
          <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0]
            if (!f) return
            setSignatureFile(f)
            setSignaturePreview(URL.createObjectURL(f))
          }} />
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger-bg rounded px-4 py-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-success bg-success-bg rounded px-4 py-3">Məlumatlar yadda saxlanıldı.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary min-h-[48px] text-sm font-semibold mt-1"
        >
          {saving ? 'Saxlanılır...' : 'Saxla'}
        </button>
      </form>

      {currentUser?.email && (
        <div className="mt-6">
          <ChangePasswordSection email={currentUser.email} />
        </div>
      )}
    </div>
  )
}
