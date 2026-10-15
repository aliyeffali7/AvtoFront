/** YYYY-MM-DD in the user's own timezone. toISOString() is UTC — in Baku
 * (UTC+4) it returns yesterday between 00:00 and 04:00, and local month-start
 * midnight becomes the previous month's last day. */
export function toLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatCurrency(amount: number | string): string {
  return `${Number(amount).toFixed(2)} ₼`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getStatusLabel(status: 'pending' | 'in_progress' | 'done'): string {
  const labels = {
    pending: 'Gözləyir',
    in_progress: 'İcrada',
    done: 'Tamamlandı',
  }
  return labels[status]
}

/**
 * Auto-formats a search string as an Azerbaijan plate number when it starts
 * with a digit and contains at least one letter. Leaves names and phone
 * numbers (digits only) completely unchanged.
 *
 * "90 rk"    → "90-RK"
 * "90rk641"  → "90-RK-641"
 * "Murad"    → "Murad"   (unchanged)
 * "507..."   → "507..."  (unchanged)
 */
export function autoFormatSearch(value: string): string {
  const trimmed = value.trimStart()
  if (!/^\d/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) return value
  const clean = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const digits1 = clean.match(/^\d+/)?.[0] ?? ''
  const rest    = clean.slice(digits1.length)
  const letters = rest.match(/^[A-Z]+/)?.[0] ?? ''
  const digits2 = rest.slice(letters.length)
  let result = digits1
  if (letters) result += '-' + letters
  if (digits2) result += '-' + digits2
  return result
}

export function mapApiError(error: unknown): string {
  const genericMessage = 'Xəta baş verdi. Yenidən cəhd edin.'

  if (!error || typeof error !== 'object') return genericMessage

  const err = error as {
    code?: string
    response?: { data?: Record<string, unknown>; status?: number }
  }

  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'Server vaxtında cavab vermədi. Yenidən cəhd edin.'
    }
    return 'Bağlantı xətası. İnterneti yoxlayıb yenidən cəhd edin.'
  }
  if (err.response.status === 429) {
    return 'Çox sayda sorğu göndərildi. Bir neçə saniyə gözləyib yenidən cəhd edin.'
  }
  if (!err.response.data) return genericMessage

  const data = err.response.data
  const status = err.response.status

  if (status === 401) {
    return 'Email və ya şifrə yanlışdır'
  }

  if (typeof data.detail === 'string') {
    return data.detail
  }

  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const val = data[firstKey]
    const msg = Array.isArray(val) ? val[0] : typeof val === 'string' ? val : null
    if (typeof msg === 'string') {
      if (msg.includes('stok') || msg.includes('kifayət')) {
        return 'Kifayət qədər məhsul yoxdur'
      }
      return msg
    }
  }

  return genericMessage
}

/**
 * Shows an Azerbaijan phone as "+994 50 123 45 67". Accepts "0501234567",
 * "+994501234567", "994 50 123-45-67", "501234567"; anything that does not
 * parse is returned as typed.
 */
export function formatPhone(value?: string | null): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  let national: string
  if (digits.length === 12 && digits.startsWith('994')) national = digits.slice(3)
  else if (digits.length === 10 && digits.startsWith('0')) national = digits.slice(1)
  else if (digits.length === 9) national = digits
  else return value
  return `+994 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`
}
