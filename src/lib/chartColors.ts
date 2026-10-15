// Validated against dataviz skill's palette validator (scripts/validate_palette.js)
// against this app's actual chart surface (#F4F4F4). Both sets PASS all hard gates;
// the CVD/contrast checks that land in the WARN band require direct labels or a
// legend rather than color alone — components using these must always label.

export const CHART_INCOME = '#008300'
export const CHART_EXPENSE = '#e34948'

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  parts: '#2a78d6',
  salary: '#eb6834',
  rent: '#1baf7a',
  utilities: '#eda100',
  other: '#e87ba4',
  // slots 6–7 (validated as one 7-slot set with the five above)
  write_off: '#008300',
  cogs: '#4a3aa7',
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  parts: 'Ehtiyat hissə',
  salary: 'Əmək haqqı',
  rent: 'İcarə',
  utilities: 'Kommunal',
  other: 'Digər',
  cogs: 'Maya dəyəri',
  write_off: 'Anbar itkisi',
}

export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  service: 'Xidmət',
  parts_sale: 'Hissə satışı',
  discount: 'Endirim',
  other: 'Digər gəlir',
}

export const CHART_SEQUENTIAL = '#090909' // brand accent — single-series magnitude only
