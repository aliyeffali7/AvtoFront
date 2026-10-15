import { formatCurrency } from '@/lib/utils'

export type MoneyMeaning = 'neutral' | 'income' | 'expense' | 'receivable' | 'payable' | 'profit'

const MEANING: Record<MoneyMeaning, { color: string; sign: 'auto' | 'always'; word?: string }> = {
  neutral: { color: 'text-text-1', sign: 'auto' },
  income: { color: 'text-success', sign: 'always' },
  expense: { color: 'text-danger', sign: 'always' },
  receivable: { color: 'text-danger', sign: 'auto', word: 'Alınacaq' },
  payable: { color: 'text-warning', sign: 'auto', word: 'Ödəniləcək' },
  profit: { color: '', sign: 'always' },
}

/** Tabular money. Meaning is never colour alone: always a +/− sign or a word. */
export default function Money({
  value,
  meaning = 'neutral',
  sign,
  word,
  showWord = true,
  className = '',
}: {
  value: number | string
  meaning?: MoneyMeaning
  /** Override the sign behaviour of the meaning */
  sign?: 'auto' | 'always' | 'none'
  word?: string
  showWord?: boolean
  className?: string
}) {
  const m = MEANING[meaning]
  const n = Number(value) || 0
  let color = m.color
  if (meaning === 'profit') color = n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-text-1'
  const mode = sign ?? m.sign
  const prefix = n < 0 ? '−' : mode === 'always' && n > 0 ? '+' : ''
  const label = word ?? m.word
  return (
    <span className={`inline-flex items-baseline justify-end gap-2 ${className}`}>
      {label && showWord && <span className="font-sans text-label uppercase text-text-3">{label}</span>}
      <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${color}`}>
        {prefix}
        {formatCurrency(Math.abs(n))}
      </span>
    </span>
  )
}
