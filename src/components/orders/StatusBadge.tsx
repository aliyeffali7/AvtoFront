import { getStatusLabel } from '@/lib/utils'

const config = {
  pending:     { dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200/60' },
  in_progress: { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200/60' },
  done:        { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200/60' },
}

export default function StatusBadge({ status }: { status: 'pending' | 'in_progress' | 'done' }) {
  const c = config[status]
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${c.bg} ${c.text} ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {getStatusLabel(status)}
    </span>
  )
}
