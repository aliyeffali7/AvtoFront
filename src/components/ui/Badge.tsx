import { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'warning' | 'success' | 'danger' | 'paid' | 'accent'

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-alt text-ink-muted',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  paid: 'bg-paid-bg text-cream',
  accent: 'bg-surface-alt text-accent',
}

export default function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`badge ${VARIANT_CLASS[variant]}`}>{children}</span>
}
