import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { ActivityDayPage } from '@/types'
import { getActivityDay } from '@/services/finance.service'
import { toLocalISODate } from '@/lib/utils'
import { useGoBack } from '@/lib/useGoBack'
import ActivityRow from '@/components/dashboard/ActivityRow'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'

/** Move a YYYY-MM-DD day by `delta` days (local calendar, DST-safe via noon). */
function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toLocalISODate(new Date(y, m - 1, d + delta, 12))
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Hərəkətlər — every event of one day, oldest first (opened from "Son hərəkətlər · Hamısı"). */
export default function ActivityClient() {
  const goBack = useGoBack('/business/dashboard')
  const today = toLocalISODate()
  const [day, setDay] = useState(today)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ActivityDayPage | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setFailed(false)
    getActivityDay(day, page)
      .then(res => { if (alive) setData(res.data) })
      .catch(() => { if (alive) { setFailed(true); setData(null) } })
    return () => { alive = false }
  }, [day, page])

  function changeDay(next: string) {
    if (!next || next === day) return
    setData(null); setPage(1); setDay(next)
  }

  const loading = data === null && !failed

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={goBack} className="btn-ghost !min-h-[36px] !px-2 -ml-2 self-start text-text-2">
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" /> Geri
      </button>
      <PageHeader
        title="Hərəkətlər"
        subtitle={data ? `${data.count} hərəkət` : 'Seçilmiş günün bütün hərəkətləri'}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => changeDay(shiftDay(day, -1))}
              aria-label="Əvvəlki gün"
              className="w-11 h-11 rounded border border-border-strong bg-surface text-text-2 hover:bg-surface-2 inline-flex items-center justify-center"
            >
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
            <input
              type="date"
              value={day}
              max={today}
              onChange={e => changeDay(e.target.value)}
              aria-label="Tarix"
              className="input-mono !w-auto"
            />
            <button
              type="button"
              onClick={() => changeDay(shiftDay(day, 1))}
              disabled={day >= today}
              aria-label="Növbəti gün"
              className="w-11 h-11 rounded border border-border-strong bg-surface text-text-2 hover:bg-surface-2 disabled:opacity-40 inline-flex items-center justify-center"
            >
              <ChevronRight size={20} strokeWidth={1.75} />
            </button>
          </div>
        }
      />

      <section className="card overflow-hidden">
        {failed ? (
          <p className="text-body text-text-3 px-5 py-8 text-center">Hərəkətlər yüklənmədi. Səhifəni yeniləyin.</p>
        ) : loading ? (
          <Spinner />
        ) : data && data.count === 0 ? (
          <p className="text-body text-text-3 px-5 py-10 text-center">Bu gün üçün hərəkət yoxdur. Başqa gün seçin.</p>
        ) : data ? (
          <>
            <ul>
              {data.results.map(e => <ActivityRow key={e.id} event={e} when={timeLabel(e.at)} />)}
            </ul>
            <Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} />
          </>
        ) : null}
      </section>
    </div>
  )
}
