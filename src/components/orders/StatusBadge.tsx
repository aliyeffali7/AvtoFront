import Badge, { BadgeVariant } from '@/components/ui/Badge'
import { getStatusLabel } from '@/lib/utils'

const VARIANT: Record<'pending' | 'in_progress' | 'done', BadgeVariant> = {
  pending: 'neutral',
  in_progress: 'warning',
  done: 'success',
}

export default function StatusBadge({ status }: { status: 'pending' | 'in_progress' | 'done' }) {
  return <Badge variant={VARIANT[status]}>{getStatusLabel(status)}</Badge>
}
