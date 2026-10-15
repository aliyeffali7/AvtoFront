import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityEvent } from '@/types'
import { getRecentActivity } from '@/services/finance.service'
import { toLocalISODate } from '@/lib/utils'
import ActivityRow from '@/components/dashboard/ActivityRow'
import Spinner from '@/components/ui/Spinner'

/** "14:32" for today, "12.10 14:32" for earlier days. */
function whenLabel(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (toLocalISODate(d) === toLocalISODate()) return time
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month} ${time}`
}

/** Ana səhifə · Son hərəkətlər — the latest ~10 business events, each linking to its source. */
export default function RecentActivity() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    getRecentActivity()
      .then(res => { if (alive) setEvents(res.data) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <h2 className="card-title">Son hərəkətlər</h2>
        <Link to="/business/activity" className="text-small font-semibold text-ink hover:underline underline-offset-2">Hamısı</Link>
      </div>
      {failed ? (
        <p className="text-body text-text-3 px-5 py-8 text-center">Hərəkətlər yüklənmədi. Səhifəni yeniləyin.</p>
      ) : events === null ? (
        <Spinner />
      ) : events.length === 0 ? (
        <p className="text-body text-text-3 px-5 py-8 text-center">Hələ hərəkət yoxdur. Sifariş və ya alış əlavə etdikdə burada görünəcək.</p>
      ) : (
        <ul>
          {events.map(e => <ActivityRow key={e.id} event={e} when={whenLabel(e.at)} />)}
        </ul>
      )}
    </section>
  )
}
