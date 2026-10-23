import { Fragment, ReactNode, createContext, useCallback, useContext, useState } from 'react'

/**
 * Tiny i18n. The Azerbaijani text itself is the key: `t('Yadda saxla')`.
 * Russian translations live in `./ru/*.ts` (one file per area, merged here).
 * A missing Russian entry falls back to the Azerbaijani key, so nothing ever
 * shows a raw id.
 *
 * Rules for callers:
 * - Call `t()` at render time (inside a component or a function), never at
 *   module top level — a module-level constant is evaluated once and would
 *   not follow a language switch.
 * - Variables: `t('{n} sifariş', { n: 3 })`. In Russian the entry may be a
 *   plural object `{ one, few, many }`, picked by `n`.
 * - Same Azerbaijani word, different Russian: add a context after `@@`,
 *   e.g. `t('Ləğv et@@action')`. The part after `@@` is never shown.
 * - Customer documents (PDF, WhatsApp text, public order page) use the
 *   business's document language: `translate(lang, key, vars)`.
 */

export type Lang = 'az' | 'ru'
export type Plural = { one: string; few: string; many: string }
export type Entry = string | Plural
export type Dict = Record<string, Entry>
type Vars = Record<string, string | number>

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'az', label: 'AZ' },
  { code: 'ru', label: 'RU' },
]

const modules = import.meta.glob<{ default: Dict }>('./ru/*.ts', { eager: true })
const RU: Dict = Object.assign({}, ...Object.values(modules).map(m => m.default))

const STORAGE_KEY = 'servo.lang'

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ru' ? 'ru' : 'az'
  } catch {
    return 'az'
  }
}

let current: Lang = readStoredLang()

function ruPlural(n: number, p: Plural): string {
  const n10 = Math.abs(n) % 10
  const n100 = Math.abs(n) % 100
  if (n10 === 1 && n100 !== 11) return p.one
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return p.few
  return p.many
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

/** Translate into an explicit language (customer documents). */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const shown = key.split('@@')[0]
  if (lang === 'az') return fill(shown, vars)
  const entry = RU[key] ?? RU[shown]
  if (entry === undefined) return fill(shown, vars)
  if (typeof entry === 'string') return fill(entry, vars)
  return fill(ruPlural(Number(vars?.n ?? 0), entry), vars)
}

/** Translate into the current interface language. */
export function t(key: string, vars?: Vars): string {
  return translate(current, key, vars)
}

export function getLang(): Lang {
  return current
}

/** BCP-47 locale for dates and numbers in the given (default: current) language. */
export function localeOf(lang: Lang = current): string {
  return lang === 'ru' ? 'ru-RU' : 'az-AZ'
}

/** Business document language, defaulting to Azerbaijani. */
export function docLang(business?: { document_language?: string | null } | null): Lang {
  return business?.document_language === 'ru' ? 'ru' : 'az'
}

const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({
  lang: current,
  setLang: () => {},
})

if (typeof document !== 'undefined') document.documentElement.lang = current

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)

  const setLang = useCallback((next: Lang) => {
    current = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    document.documentElement.lang = next
    setLangState(next)
  }, [])

  // Remount the tree on a switch so every plain `t()` call re-renders.
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
