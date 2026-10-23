import { formatCurrency } from '@/lib/utils'
import { docLang, translate } from '@/i18n'

// wa.me links only: WhatsApp opens with the text filled in and the user
// presses Send themselves — nothing is ever sent from Servo automatically.

/** Digits for wa.me; local "0XX…" / 9-digit numbers become Azerbaijan's 994XX…. */
function waDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `994${digits.slice(1)}`
  else if (digits.length === 9) digits = `994${digits}`
  return digits
}

/** True when the phone has enough digits to open a WhatsApp chat. */
export function hasWhatsAppNumber(phone?: string | null): boolean {
  return !!phone && waDigits(phone).length >= 11
}

/** wa.me link, optionally with a pre-filled message. */
export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/${waDigits(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

interface Sender {
  name: string
  phone?: string
  /** Customer-facing text follows the business's document language. */
  document_language?: string | null
}

function signature(business: Sender): string {
  return business.phone ? `— ${business.name}, ${business.phone}` : `— ${business.name}`
}

function greeting(business: Sender, name?: string): string {
  const lang = docLang(business)
  return name?.trim() ? translate(lang, 'Salam, {name}!', { name: name.trim() }) : translate(lang, 'Salam!')
}

export function carReadyMessage(
  order: { customer_name?: string; car_brand?: string; car_model?: string; plate_number: string; amount_due?: number },
  business: Sender,
): string {
  const lang = docLang(business)
  const car = [order.car_brand, order.car_model].filter(Boolean).join(' ')
  const vehicle = car ? `${car} (${order.plate_number})` : order.plate_number
  const due = Number(order.amount_due ?? 0)
  const amount = due > 0 ? ` ${translate(lang, 'Ödəniləcək məbləğ: {amount}.', { amount: formatCurrency(due) })}` : ''
  return `${greeting(business, order.customer_name)} ${translate(lang, '{vehicle} hazırdır, gəlib götürə bilərsiniz.', { vehicle })}${amount}
${signature(business)}`
}

export function debtReminderMessage(
  debt: { customer_name?: string; plate_number?: string; amount: number },
  business: Sender,
): string {
  const lang = docLang(business)
  const amount = formatCurrency(debt.amount)
  const body = debt.plate_number
    ? translate(lang, '{plate} üzrə {amount} ödənilməmiş məbləğ qalıb. Xahiş edirik, ödənişi edəsiniz.', { plate: debt.plate_number, amount })
    : translate(lang, '{amount} ödənilməmiş məbləğ qalıb. Xahiş edirik, ödənişi edəsiniz.', { amount })
  return `${greeting(business, debt.customer_name)} ${body}
${signature(business)}`
}

export function orderLinkMessage(order: { customer_name?: string; plate_number: string }, url: string, business: Sender): string {
  const body = translate(docLang(business), '{plate} üzrə sifarişinizin detalları: {url}', { plate: order.plate_number, url })
  return `${greeting(business, order.customer_name)} ${body}
${signature(business)}`
}
