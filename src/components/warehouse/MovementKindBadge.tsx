import { StockMovementKind } from '@/types'
import Badge, { BadgeVariant } from '@/components/ui/Badge'

const VARIANT: Record<StockMovementKind, BadgeVariant> = {
  purchase: 'success',
  purchase_cancel: 'danger',
  order_out: 'accent',
  order_return: 'success',
  supplier_return: 'warning',
  write_off: 'danger',
  count_adjust: 'warning',
  opening: 'neutral',
  merge: 'neutral',
}

export default function MovementKindBadge({ kind, label }: { kind: StockMovementKind; label: string }) {
  return <Badge variant={VARIANT[kind] ?? 'neutral'}>{label}</Badge>
}
