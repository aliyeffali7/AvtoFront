import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Servo dialog: radius 10, shadow lg, overlay rgba(9,9,9,.4), title 26/32,
 * optional mono subtitle, footer buttons on the right.
 */
export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  footer,
  children,
  width = 'max-w-md',
}: {
  open: boolean
  title: string
  subtitle?: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(9,9,9,.4)]">
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-surface rounded-lg shadow-lg w-full ${width} border border-border max-h-[calc(100vh-2rem)] flex flex-col`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0">
            <h2 className="font-display text-h2 text-ink">{title}</h2>
            {subtitle && <p className="font-mono text-small text-text-3 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Bağla" className="w-9 h-9 -mr-2 -mt-1 rounded flex items-center justify-center text-text-3 hover:bg-surface-2 shrink-0">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-6 pb-2 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-5 flex justify-end gap-2 flex-wrap">{footer}</div>}
        {!footer && <div className="pb-4" />}
      </div>
    </div>
  )
}
