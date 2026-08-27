// Validated against dataviz skill's palette validator (scripts/validate_palette.js)
// against this app's actual chart surface (#F7F5EF). Both sets PASS all hard gates;
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
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  parts: 'Ehtiyat hissə',
  salary: 'Əmək haqqı',
  rent: 'İcarə',
  utilities: 'Kommunal',
  other: 'Digər',
}

export const CHART_SEQUENTIAL = '#1F4D36' // brand accent — single-series magnitude only
