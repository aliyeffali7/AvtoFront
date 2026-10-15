import { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'warning' | 'success' | 'danger' | 'paid' | 'accent' | 'info'

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-text-2',
  warning: 'bg-warning-subtle text-warning-strong',
  success: 'bg-success-subtle text-success-strong',
  danger: 'bg-danger-subtle text-danger-strong',
  info: 'bg-info-subtle text-info-strong',
  paid: 'bg-success text-paper',
  accent: 'bg-surface-2 text-ink',
}

export default function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`badge ${VARIANT_CLASS[variant]}`}>{children}</span>
}
