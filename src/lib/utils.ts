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

export function getStatusColor(
  status: 'pending' | 'in_progress' | 'done'
): string {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
  }
  return colors[status]
}

export function mapApiError(error: unknown): string {
  const genericMessage = 'Xəta baş verdi. Yenidən cəhd edin.'

  if (!error || typeof error !== 'object') return genericMessage

  const err = error as {
    response?: { data?: Record<string, unknown>; status?: number }
  }

  if (!err.response?.data) return genericMessage

  const data = err.response.data

  if (err.response.status === 401) {
    return 'Email və ya şifrə yanlışdır'
  }

  if (typeof data.detail === 'string') {
    return 'Email və ya şifrə yanlışdır'
  }

  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const val = data[firstKey]
    if (Array.isArray(val) && typeof val[0] === 'string') {
      return val[0]
    }
  }

  return genericMessage
}
