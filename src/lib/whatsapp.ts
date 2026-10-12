import { formatCurrency } from '@/lib/utils'

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
}

function signature(business: Sender): string {
  return business.phone ? `— ${business.name}, ${business.phone}` : `— ${business.name}`
}

function greeting(name?: string): string {
  return name?.trim() ? `Salam, ${name.trim()}!` : 'Salam!'
}

export function carReadyMessage(
  order: { customer_name?: string; car_brand?: string; car_model?: string; plate_number: string; amount_due?: number },
  business: Sender,
): string {
  const car = [order.car_brand, order.car_model].filter(Boolean).join(' ')
  const vehicle = car ? `${car} (${order.plate_number})` : order.plate_number
  const due = Number(order.amount_due ?? 0)
  const amount = due > 0 ? ` Ödəniləcək məbləğ: ${formatCurrency(due)}.` : ''
  return `${greeting(order.customer_name)} ${vehicle} hazırdır, gəlib götürə bilərsiniz.${amount}\n${signature(business)}`
}

export function debtReminderMessage(
  debt: { customer_name?: string; plate_number?: string; amount: number },
  business: Sender,
): string {
  const scope = debt.plate_number ? `${debt.plate_number} üzrə ` : ''
  return `${greeting(debt.customer_name)} ${scope}${formatCurrency(debt.amount)} ödənilməmiş məbləğ qalıb. Xahiş edirik, ödənişi edəsiniz.\n${signature(business)}`
}

export function orderLinkMessage(order: { customer_name?: string; plate_number: string }, url: string, business: Sender): string {
  return `${greeting(order.customer_name)} ${order.plate_number} üzrə sifarişinizin detalları: ${url}\n${signature(business)}`
}
