export default function AdminPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="page-title mb-2">SuperAdmin Paneli</h1>
      <p className="text-ink-muted mb-8">Sistemin ümumi idarəetməsi.</p>
      <div className="card px-6 py-8 text-center">
        <div className="w-14 h-14 bg-surface-alt rounded flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <p className="card-title">Xoş gəldiniz, Admin!</p>
        <p className="text-ink-muted text-sm mt-1">İşletmə idarəetmə funksiyaları hazırlanır.</p>
      </div>
    </div>
  )
}
