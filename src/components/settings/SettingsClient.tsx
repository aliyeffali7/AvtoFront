'use client'
import { useEffect, useRef, useState } from 'react'
import { getBusinessProfile, updateBusinessProfile } from '@/services/auth.service'
import { Business } from '@/types'
import { mapApiError } from '@/lib/utils'

export default function SettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getBusinessProfile()
      .then(res => {
        const b: Business = res.data
        setName(b.name ?? '')
        setPhone(b.phone ?? '')
        setAddress(b.address ?? '')
        if (b.logo) setLogoPreview(b.logo.startsWith('http') ? b.logo : (import.meta.env.VITE_API_URL ?? '') + b.logo)
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
      if (logoFile) form.append('logo', logoFile)
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
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Biznes Tənzimləmələri</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">

        {/* Logo */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Logo</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden shrink-0"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25M3 8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25M3 8.25h18" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left"
              >
                {logoPreview ? 'Logoyu dəyiş' : 'Logo yüklə'}
              </button>
              <p className="text-xs text-gray-400">PNG, JPG — maks 2 MB</p>
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Biznes adı</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Məs: Garage 1903"
            className="input"
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Telefon nömrəsi</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Məs: 010 123 45 67"
            className="input"
          />
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Ünvan</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Məs: Binəqədi Şossesi 31"
            className="input"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">Məlumatlar yadda saxlanıldı.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary min-h-[48px] text-sm font-semibold mt-1"
        >
          {saving ? 'Saxlanılır...' : 'Saxla'}
        </button>
      </form>
    </div>
  )
}
