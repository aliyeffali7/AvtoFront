export default function AdminPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">SuperAdmin Paneli</h1>
      <p className="text-gray-500 mb-8">Sistemin ümumi idarəetməsi.</p>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-8 text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <p className="text-gray-900 font-semibold">Xoş gəldiniz, Admin!</p>
        <p className="text-gray-500 text-sm mt-1">İşletmə idarəetmə funksiyaları hazırlanır.</p>
      </div>
    </div>
  )
}
