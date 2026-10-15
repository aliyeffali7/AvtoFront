'use client'
import { useEffect, useRef, useState } from 'react'
import { getBusinessProfile, updateBusinessProfile } from '@/services/auth.service'
import { Business } from '@/types'
import { mapApiError } from '@/lib/utils'
import { useCurrentUser } from '@/App'
import ChangePasswordSection from '@/components/settings/ChangePasswordSection'
import { mediaUrl } from '@/lib/apiUrl'
import { ImagePlus, PenLine } from 'lucide-react'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'

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
  const [guaranteeExclusions, setGuaranteeExclusions] = useState('')
  const [slogan, setSlogan] = useState('')
  const [instagram, setInstagram] = useState('')
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
        setGuaranteeExclusions(b.guarantee_exclusions ?? '')
        setSlogan(b.slogan ?? '')
        setInstagram(b.instagram ?? '')
        if (b.logo) setLogoPreview(mediaUrl(b.logo))
        if (b.signature) setSignaturePreview(mediaUrl(b.signature))
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
      form.append('guarantee_exclusions', guaranteeExclusions.trim())
      form.append('slogan', slogan.trim())
      form.append('instagram', instagram.trim())
      if (logoFile) form.append('logo', logoFile)
      if (signatureFile) form.append('signature', signatureFile)
      const res = await updateBusinessProfile(form)
      // The backend normalises a pasted link or "@handle" to the bare handle.
      setInstagram(res.data.instagram ?? '')
      setSuccess(true)
      setLogoFile(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const helpClass = 'text-small text-text-3 mb-1.5'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tənzimləmələr"
        subtitle="Biznes məlumatı, sənədlər və hesab"
        actions={<Button type="submit" form="settings-form" loading={saving}>Yadda saxla</Button>}
      />

      <div className="max-w-[780px] flex flex-col gap-4">
        {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-4 py-3">{error}</p>}
        {success && <p className="text-body text-success-strong bg-success-subtle rounded px-4 py-3">Məlumatlar yadda saxlanıldı.</p>}

        <form id="settings-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Biznes məlumatı */}
          <section className="card p-6 flex flex-col gap-5">
            <h2 className="section-label">Biznes məlumatı</h2>

            {/* Logo */}
            <div className="flex flex-col gap-2">
              <label className="label">Logo</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-md border-2 border-dashed border-border-strong flex items-center justify-center cursor-pointer hover:border-ink hover:bg-surface-2 transition-colors overflow-hidden shrink-0"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImagePlus size={28} strokeWidth={1.75} className="text-text-3" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-body font-semibold text-ink underline underline-offset-2 text-left"
                  >
                    {logoPreview ? 'Logoyu dəyiş' : 'Logo yüklə'}
                  </button>
                  <p className="text-small text-text-3">PNG, JPG — maks 2 MB</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            {/* Name */}
            <div>
              <label className="label">Biznes adı</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Məs: Garage 1903" className="input" />
            </div>

            {/* Slogan */}
            <div>
              <label className="label">Şüar</label>
              <p className={helpClass}>PDF-də biznes adının altında görünür. Boş qalsa, göstərilmir.</p>
              <input
                value={slogan}
                onChange={e => setSlogan(e.target.value)}
                maxLength={150}
                placeholder="Məs: Dəqiq diaqnoz. Bizim işimiz sizin yolunuz"
                className="input"
              />
            </div>

            {/* Login code (read-only) — mechanics need this to log in */}
            <div>
              <label className="label">Biznes kodu</label>
              <p className={helpClass}>Ustalarınız daxil olarkən telefon nömrəsi ilə yanaşı bu kodu daxil etməlidir.</p>
              <input value={loginCode} readOnly className="input-mono !bg-surface-2" />
            </div>

            {/* Phone */}
            <div>
              <label className="label">Telefon nömrəsi</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Məs: 010 123 45 67" className="input-mono" />
            </div>

            {/* Address */}
            <div>
              <label className="label">Ünvan</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Məs: Binəqədi Şossesi 31" className="input" />
            </div>

            {/* Instagram */}
            <div>
              <label className="label">Instagram</label>
              <p className={helpClass}>PDF-in aşağısında göstərilir, QR kod da bu səhifəyə aparır. Linki də yapışdıra bilərsiniz.</p>
              <div className="flex">
                <span className="input !rounded-r-none !border-r-0 !w-auto shrink-0 !bg-surface-2 text-text-3 flex items-center">@</span>
                <input
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="garage1903"
                  className="input !rounded-l-none flex-1"
                />
              </div>
            </div>
          </section>

          {/* Sənədlər */}
          <section className="card p-6 flex flex-col gap-5">
            <h2 className="section-label">Sənədlər</h2>

            {/* Guarantee text */}
            <div>
              <label className="label">Zəmanət mətni</label>
              <p className={helpClass}>Sifarişdə "Zəmanət var" işarələndikdə bu mətn PDF-ə əlavə ediləcək.</p>
              <textarea
                value={guaranteeText}
                onChange={e => setGuaranteeText(e.target.value)}
                placeholder="Məs: İşimizə 3 ay zəmanət veririk. Eyni nasazlıq baş verərsə pulsuz düzəldilir."
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Guarantee exclusions */}
            <div>
              <label className="label">Zəmanətə daxil olmayan hallar</label>
              <p className={helpClass}>Hər sətir ayrıca bənd olacaq. Zəmanət mətninin yanında göstərilir.</p>
              <textarea
                value={guaranteeExclusions}
                onChange={e => setGuaranteeExclusions(e.target.value)}
                placeholder={'Məs:\nEhtiyat hissələrinin səhv istismarı\nMüştərinin gətirdiyi ehtiyat hissələri\nÜçüncü şəxslərin müdaxiləsi'}
                rows={4}
                className="input resize-none"
              />
            </div>

            {/* Signature image */}
            <div className="flex flex-col gap-2">
              <label className="label">İmza şəkli</label>
              <p className="text-small text-text-3 -mt-1">PDF-ə ixrac zamanı servis imzası yerinə bu şəkil göstəriləcək.</p>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => signatureInputRef.current?.click()}
                  className="w-32 h-16 rounded-md border-2 border-dashed border-border-strong flex items-center justify-center cursor-pointer hover:border-ink hover:bg-surface-2 transition-colors overflow-hidden shrink-0"
                >
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="İmza" className="w-full h-full object-contain p-1" />
                  ) : (
                    <PenLine size={24} strokeWidth={1.75} className="text-text-3" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => signatureInputRef.current?.click()} className="text-body font-semibold text-ink underline underline-offset-2 text-left">
                    {signaturePreview ? 'İmzanı dəyiş' : 'İmza yüklə'}
                  </button>
                  <p className="text-small text-text-3">PNG, JPG — ağ fon tövsiyə edilir</p>
                </div>
              </div>
              <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                setSignatureFile(f)
                setSignaturePreview(URL.createObjectURL(f))
              }} />
            </div>
          </section>
        </form>

        {/* Hesab */}
        {currentUser?.email && (
          <section className="flex flex-col gap-3">
            <h2 className="section-label">Hesab</h2>
            <ChangePasswordSection email={currentUser.email} />
          </section>
        )}
      </div>
    </div>
  )
}
