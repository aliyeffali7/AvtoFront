import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export type BoughtNowAction = 'cancel_purchase' | 'keep'

export type BoughtNowPart = { name: string; quantity: number; supplier?: string }

/**
 * - remove: one bought-now line is taken off the order
 * - reduce: a bought-now line's quantity is lowered (parts = the removed units)
 * - order: the whole order is cancelled (one choice for every bought-now line)
 */
export type BoughtNowMode = 'remove' | 'reduce' | 'order'

const TITLES: Record<BoughtNowMode, string> = {
  remove: 'Bu hissə bu sifariş üçün alınıb. Nə edək?',
  reduce: 'Çıxarılan miqdar bu sifariş üçün alınıb. Nə edək?',
  order: 'Bu sifarişdə sifariş üçün alınmış hissələr var. Nə edək?',
}

/**
 * Asked when order parts that were bought just for the order ("Anbarda
 * yoxdur") are removed, reduced or the order is cancelled: was the purchase
 * a mistake, or is the part real? The default (focused) choice is cancelling
 * the purchase.
 */
export default function BoughtNowRemoveModal({
  open, parts, mode = 'remove', busy = false, error = '', onChoose, onClose,
}: {
  open: boolean
  parts: BoughtNowPart[]
  mode?: BoughtNowMode
  busy?: boolean
  error?: string
  onChoose: (action: BoughtNowAction) => void
  onClose: () => void
}) {
  const keepText = mode === 'order'
    ? 'Hissələr həqiqətən alınıb: sifariş ləğv olunur, hissələr anbara qayıdır. Alış və borc olduğu kimi qalır.'
    : mode === 'reduce'
      ? 'Hissə həqiqətən alınıb: çıxarılan miqdar anbara qayıdır. Alış və borc olduğu kimi qalır.'
      : 'Hissə həqiqətən alınıb: sifarişdən çıxır, anbara qayıdır. Alış və borc olduğu kimi qalır.'
  const cancelText = mode === 'order'
    ? 'Sifariş ləğv olunur və bu hissələrin alışı da ləğv olunur: stok dəyişmir, kreditor borcu silinir, nağd ödənilibsə pul kassaya qayıdır.'
    : 'Hissə sifarişdən çıxır və alış da ləğv olunur: stok dəyişmir, kreditor borcu silinir, nağd ödənilibsə pul kassaya qayıdır.'
  return (
    <Modal
      open={open}
      title={TITLES[mode]}
      onClose={onClose}
      footer={<Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Ləğv</Button>}
    >
      <div className="flex flex-col gap-3 pb-2">
        <ul className="flex flex-col gap-1 text-body text-text-1">
          {parts.map((p, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{p.name}{p.supplier ? <span className="text-text-3"> · {p.supplier}</span> : null}</span>
              <span className="font-mono tabular-nums shrink-0">{p.quantity} ədəd</span>
            </li>
          ))}
        </ul>
        <div>
          <Button type="button" autoFocus loading={busy} onClick={() => onChoose('cancel_purchase')} className="w-full">
            Alışı ləğv et (səhv yazılıb)
          </Button>
          <p className="text-small text-text-3 mt-1.5">{cancelText}</p>
        </div>
        <div>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => onChoose('keep')} className="w-full">
            Anbarda saxla
          </Button>
          <p className="text-small text-text-3 mt-1.5">{keepText}</p>
        </div>
        {error && <p role="alert" className="text-small text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
