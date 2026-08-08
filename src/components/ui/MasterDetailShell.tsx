import { ReactNode, useEffect } from 'react'

/**
 * Shared frame for master-detail screens (Orders, Customers, Creditors, Mechanics):
 * a scrollable ledger-table pane on the left, a fixed-width detail/form panel on the right.
 * Pass `detail: null` (nothing selected/creating) to collapse the right panel and let
 * the list take the full width instead of reserving empty space for it.
 * Pass `onClose` to get a mouse-clickable close button plus an Esc-key handler that
 * dismiss the panel back to that collapsed state.
 */
export default function MasterDetailShell({ list, detail, onClose }: { list: ReactNode; detail: ReactNode; onClose?: () => void }) {
  const showDetail = detail != null

  useEffect(() => {
    if (!showDetail || !onClose) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose!()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showDetail, onClose])

  return (
    <div className="w-full bg-surface border border-rule rounded overflow-hidden flex flex-col lg:flex-row" style={{ maxHeight: 'calc(100vh - 170px)' }}>
      <div className={`overflow-auto ${showDetail ? 'lg:w-[62%] lg:border-r border-rule' : 'w-full'}`}>
        {list}
      </div>
      {showDetail && (
        <div className="lg:w-[38%] overflow-auto bg-cream">
          {onClose && (
            <div className="sticky top-0 z-10 flex justify-end p-2 pointer-events-none">
              <button
                onClick={onClose}
                title="Bağla (Esc)"
                className="pointer-events-auto w-8 h-8 rounded border border-rule bg-surface text-ink-muted hover:text-ink hover:border-ink flex items-center justify-center shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {detail}
        </div>
      )}
    </div>
  )
}
