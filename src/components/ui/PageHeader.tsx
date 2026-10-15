import { ReactNode } from 'react'

/** Screen header: title, quiet subtitle, actions on the right. */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-border ${className}`}>
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-body text-text-3 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  )
}
