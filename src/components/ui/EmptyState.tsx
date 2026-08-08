import { ReactNode } from 'react'

export default function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="card px-8 py-14 flex flex-col items-center text-center gap-1">
      <p className="font-serif font-semibold text-lg text-ink">{title}</p>
      {subtitle && <p className="text-sm text-ink-muted max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
