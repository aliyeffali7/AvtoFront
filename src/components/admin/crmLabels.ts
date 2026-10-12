import { LeadNoteKind, LeadObjection, LeadSource, LeadStage } from '@/types'
import { BadgeVariant } from '@/components/ui/Badge'

export const STAGES: { key: LeadStage; label: string; variant: BadgeVariant }[] = [
  { key: 'prospect', label: 'Potensial', variant: 'neutral' },
  { key: 'interested', label: 'Maraqlandı', variant: 'accent' },
  { key: 'demo', label: 'Demo edildi', variant: 'accent' },
  { key: 'trial', label: 'Sınaq müddətində', variant: 'warning' },
  { key: 'customer', label: 'Aktiv müştəri', variant: 'success' },
  { key: 'lost', label: 'İtirildi', variant: 'danger' },
]

export const stageOf = (key: LeadStage) => STAGES.find(s => s.key === key) ?? STAGES[0]

export const OBJECTIONS: { key: LeadObjection; label: string }[] = [
  { key: 'expensive', label: 'Bahadır' },
  { key: 'excel_enough', label: 'Excel/dəftər kifayətdir' },
  { key: 'no_time', label: 'Vaxtı yoxdur' },
  { key: 'other_software', label: 'Başqa proqram işlədir' },
  { key: 'mechanics_against', label: 'Ustalar istəmir' },
  { key: 'not_needed', label: 'Ehtiyac görmür' },
]

export const SOURCES: { key: LeadSource; label: string }[] = [
  { key: 'visit', label: 'Özüm getdim' },
  { key: 'referral', label: 'Tanış tövsiyə etdi' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'customer', label: 'Başqa müştəri' },
  { key: 'other', label: 'Digər' },
]

export const NOTE_KINDS: { key: LeadNoteKind; label: string }[] = [
  { key: 'visit', label: 'Görüş' },
  { key: 'call', label: 'Zəng' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'note', label: 'Qeyd' },
]

/** tel: link, spaces stripped. */
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export { whatsappLink } from '@/lib/whatsapp'
