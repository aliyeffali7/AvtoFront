// Builds [1, '...', 4, 5, 6, '...', 20]-style page lists instead of one
// button per page — a lone gap of 1 page is filled in rather than turned
// into an ellipsis, since "1 ... 3" hiding just page 2 reads worse than "1 2 3".
function pageList(current: number, total: number, siblings = 1): (number | '...')[] {
  const range: number[] = [1]
  for (let i = current - siblings; i <= current + siblings; i++) {
    if (i > 1 && i < total) range.push(i)
  }
  if (total > 1) range.push(total)

  const withDots: (number | '...')[] = []
  let prev: number | undefined
  for (const n of range) {
    if (prev !== undefined) {
      if (n - prev === 2) withDots.push(prev + 1)
      else if (n - prev !== 1) withDots.push('...')
    }
    withDots.push(n)
    prev = n
  }
  return withDots
}

export default function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="w-9 h-9 rounded border border-border-strong bg-white text-text-2 hover:bg-surface-2 disabled:opacity-40 transition-colors duration-[120ms]">‹</button>
      {pageList(page, totalPages).map((n, i) =>
        n === '...' ? (
          <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-body text-text-3 select-none">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded text-small font-mono font-medium tabular-nums transition-colors duration-[120ms] ${n === page ? 'bg-ink text-paper' : 'border border-border-strong bg-white text-text-2 hover:bg-surface-2'}`}
          >
            {n}
          </button>
        )
      )}
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="w-9 h-9 rounded border border-border-strong bg-white text-text-2 hover:bg-surface-2 disabled:opacity-40 transition-colors duration-[120ms]">›</button>
    </div>
  )
}
