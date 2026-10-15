function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Initials circle: ink for mechanics, light (surface-2) for customers. */
export default function Avatar({
  name,
  tone = 'light',
  size = 36,
  className = '',
}: {
  name: string
  tone?: 'ink' | 'light'
  size?: number
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 font-display font-bold select-none ${
        tone === 'ink' ? 'bg-ink text-paper' : 'bg-surface-2 text-ink border border-border'
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
