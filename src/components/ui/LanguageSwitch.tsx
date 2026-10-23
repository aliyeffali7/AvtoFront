import { LANGS, useLang } from '@/i18n'

/** AZ | RU toggle. `tone="dark"` for the ink sidebar, `light` for paper screens. */
export default function LanguageSwitch({ tone = 'light', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
  const { lang, setLang } = useLang()
  const base = 'h-8 px-2.5 rounded-sm font-mono text-small font-semibold transition-colors duration-[120ms]'
  const on = tone === 'dark' ? 'bg-paper text-ink' : 'bg-ink text-paper'
  const off = tone === 'dark' ? 'text-text-4 hover:text-paper hover:bg-ink-up' : 'text-text-3 hover:text-ink hover:bg-surface-2'
  return (
    <div role="group" aria-label="Dil / Язык" className={`inline-flex gap-1 ${className}`}>
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          aria-pressed={lang === l.code}
          onClick={() => lang !== l.code && setLang(l.code)}
          className={`${base} ${lang === l.code ? on : off}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
