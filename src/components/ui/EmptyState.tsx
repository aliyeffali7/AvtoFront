import { ReactNode } from 'react'

export default function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="card px-8 py-14 flex flex-col items-center text-center gap-1">
      <p className="font-display font-semibold text-h3 text-ink">{title}</p>
      {subtitle && <p className="text-body text-text-3 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
