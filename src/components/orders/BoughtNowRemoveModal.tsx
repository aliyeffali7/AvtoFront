import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export type BoughtNowAction = 'cancel_purchase' | 'keep'

/**
 * Asked when an order line that was bought just for the order ("Anbarda
 * yoxdur") is removed: was the purchase a mistake, or is the part real?
 * The default (focused) choice is cancelling the purchase.
 */
export default function BoughtNowRemoveModal({
  open, partName, busy = false, error = '', onChoose, onClose,
}: {
  open: boolean
  partName: string
  busy?: boolean
  error?: string
  onChoose: (action: BoughtNowAction) => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title="Bu hissə bu sifariş üçün alınıb. Nə edək?"
      subtitle={partName}
      onClose={onClose}
      footer={<Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Ləğv</Button>}
    >
      <div className="flex flex-col gap-3 pb-2">
        <div>
          <Button type="button" autoFocus loading={busy} onClick={() => onChoose('cancel_purchase')} className="w-full">
            Alışı ləğv et (səhv yazılıb)
          </Button>
          <p className="text-small text-text-3 mt-1.5">
            Hissə sifarişdən çıxır və alış da ləğv olunur: stok dəyişmir, kreditor borcu silinir, nağd ödənilibsə pul kassaya qayıdır.
          </p>
        </div>
        <div>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => onChoose('keep')} className="w-full">
            Anbarda saxla
          </Button>
          <p className="text-small text-text-3 mt-1.5">
            Hissə həqiqətən alınıb: sifarişdən çıxır, anbara qayıdır. Alış və borc olduğu kimi qalır.
          </p>
        </div>
        {error && <p role="alert" className="text-small text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
