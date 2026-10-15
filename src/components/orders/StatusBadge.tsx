import UiStatusBadge from '@/components/ui/StatusBadge'
import { getStatusLabel } from '@/lib/utils'

export default function StatusBadge({ status }: { status: 'pending' | 'in_progress' | 'done' }) {
  return <UiStatusBadge status={getStatusLabel(status)} />
}
