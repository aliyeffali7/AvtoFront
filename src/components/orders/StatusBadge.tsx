import { getStatusLabel, getStatusColor } from '@/lib/utils'

export default function StatusBadge({ status }: { status: 'pending' | 'in_progress' | 'done' }) {
  const dot = status === 'pending' ? 'bg-yellow-500' : status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {getStatusLabel(status)}
    </span>
  )
}
