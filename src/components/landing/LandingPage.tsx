import { useState } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import ServoLogo from '@/components/ui/ServoLogo'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'Sifariş idarəetməsi',
    desc: 'Bütün sifarişləri bir yerdə izləyin. Status, usta, məhsul — hər şey bir ekranda.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Usta idarəetməsi',
    desc: 'Ustaları əlavə edin, sifarişləri təyin edin, performansı izləyin.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: 'Anbar nəzarəti',
    desc: 'Ehtiyat hissələrini, alış/satış qiymətlərini və stoku idarə edin.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Maliyyə uçotu',
    desc: 'Gündəlik gəlir və xərcləri qeyd edin, xalis mənfəəti anlıq görün.',
  },
]

export default function LandingPage() {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login')

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* Nav */}
      <nav className="bg-sidebar px-6 py-4 flex items-center justify-between">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <ServoLogo variant="white" className="h-4" />
          <button
            onClick={() => setTab('login')}
            className="text-sm text-text-4 hover:text-paper font-medium transition-colors"
          >
            Daxil ol
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — hero */}
        <div>
          <div className="inline-flex items-center gap-2 bg-surface border border-rule rounded px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-signal rounded-full" />
            <span className="text-text-1 text-xs font-semibold">14 günlük pulsuz sınaq</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-[-0.035em] text-ink mb-5">
            Servisinizi<br />
            dəftərdən<br />
            xilas edin
          </h1>
          <p className="text-ink-soft text-lg leading-relaxed mb-8 max-w-md">
            Sifarişlər, ustalar, anbar, maliyyə — hamısı bir yerdə. Qeydiyyat 1 dəqiqə çəkir, kart tələb olunmur.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-surface border border-rule rounded flex items-center justify-center shrink-0 text-text-1">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{f.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — auth card */}
        <div className="lg:pl-8">
          <div className="card overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-rule">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  tab === 'login'
                    ? 'text-ink border-ink'
                    : 'text-ink-muted border-transparent hover:text-ink-soft'
                }`}
              >
                Daxil ol
              </button>
              <button
                onClick={() => setTab('register')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  tab === 'register'
                    ? 'text-ink border-ink'
                    : 'text-ink-muted border-transparent hover:text-ink-soft'
                }`}
              >
                Qeydiyyat
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {tab === 'login' ? (
                <>
                  <p className="card-title text-base mb-5">Hesabınıza daxil olun</p>
                  <LoginForm />
                  <p className="text-center text-sm text-ink-muted mt-4">
                    <button onClick={() => setTab('forgot')} className="text-text-1 font-semibold hover:underline">
                      Şifrəni unutmusunuz?
                    </button>
                  </p>
                  <p className="text-center text-sm text-ink-muted mt-2">
                    Hesabınız yoxdur?{' '}
                    <button onClick={() => setTab('register')} className="text-text-1 font-semibold hover:underline">
                      Qeydiyyatdan keçin
                    </button>
                  </p>
                </>
              ) : tab === 'register' ? (
                <>
                  <p className="card-title text-base mb-1">14 günlük pulsuz sınaq</p>
                  <p className="text-sm text-ink-muted mb-5">Kart tələb olunmur. Dərhal başlayın.</p>
                  <RegisterForm />
                  <p className="text-center text-sm text-ink-muted mt-5">
                    Artıq hesabınız var?{' '}
                    <button onClick={() => setTab('login')} className="text-text-1 font-semibold hover:underline">
                      Daxil olun
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="card-title text-base mb-5">Şifrəni bərpa et</p>
                  <ForgotPasswordForm onDone={() => setTab('login')} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simple footer */}
      <div className="border-t border-rule py-6 text-center">
        <p className="text-ink-muted text-xs">© 2026 Servo. Bütün hüquqlar qorunur.</p>
      </div>
    </div>
  )
}
