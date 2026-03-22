import { useState } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'

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
    desc: 'Gündəlik gəlir və xərcleri qeyd edin, xalis mənfəəti anlıq görün.',
  },
]

export default function LandingPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16H9m4 0h2m2 0h1a1 1 0 001-1v-5l-3-4H13" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Avtoservis CRM</span>
        </div>
        <button
          onClick={() => setTab('login')}
          className="text-sm text-gray-300 hover:text-white font-medium transition-colors"
        >
          Daxil ol
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — hero */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-400 text-xs font-medium">7 günlük pulsuz sınaq</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-5">
            Avtoservisinizi<br />
            <span className="text-blue-400">rəqəmsal idarə</span><br />
            edin
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
            Sifarişlər, ustalar, anbar, maliyyə — hamısı bir sistemdə. Qeydiyyat 1 dəqiqə çəkir, kart tələb olunmur.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0 text-blue-400">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — auth card */}
        <div className="lg:pl-8">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === 'login'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Daxil ol
              </button>
              <button
                onClick={() => setTab('register')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === 'register'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Qeydiyyat
              </button>
            </div>

            <div className="p-8">
              {tab === 'login' ? (
                <>
                  <p className="text-gray-900 font-semibold text-base mb-5">Hesabınıza daxil olun</p>
                  <LoginForm />
                  <p className="text-center text-sm text-gray-500 mt-5">
                    Hesabınız yoxdur?{' '}
                    <button onClick={() => setTab('register')} className="text-blue-600 font-medium hover:underline">
                      Qeydiyyatdan keçin
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-900 font-semibold text-base mb-1">7 günlük pulsuz sınaq</p>
                  <p className="text-sm text-gray-500 mb-5">Kart tələb olunmur. Dərhal başlayın.</p>
                  <RegisterForm />
                  <p className="text-center text-sm text-gray-500 mt-5">
                    Artıq hesabınız var?{' '}
                    <button onClick={() => setTab('login')} className="text-blue-600 font-medium hover:underline">
                      Daxil olun
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simple footer */}
      <div className="border-t border-white/10 py-6 text-center">
        <p className="text-gray-600 text-xs">© 2024 Avtoservis CRM. Bütün hüquqlar qorunur.</p>
      </div>
    </div>
  )
}
