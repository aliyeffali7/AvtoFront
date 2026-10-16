import { Business, CustomerDetail, Order } from '@/types'
import { mediaUrl } from '@/lib/apiUrl'
import { formatPhone, toLocalISODate } from '@/lib/utils'
import { formatPlate } from '@/components/ui/Plate'
import {
  pm, toDataUrl, loadBrand, buildHeader, buildFooter, plateBox, tableCells, sectionTitle, label, money, shortDate, asciiSlug,
  INK, TEXT_2, TEXT_3, BORDER, PAGE_MARGINS,
} from '@/lib/pdfBrand'

// "Müştəri tarixçəsi": every order of one customer in the Servo brand look
// (same fonts, header, footer, plate box and table styles as the service act —
// see lib/pdfBrand.ts). One table row per order, newest first, with the order's
// lines (services, parts, discount) as small sub-rows underneath.

const STATUS_WORD = { done: 'Tamamlandı', in_progress: 'İcrada', pending: 'Gözləyir' } as const
const PAYMENT_WORD = { paid: 'Ödənilib', partial: 'Qismən', unpaid: 'Ödənilməyib' } as const

interface Car {
  brand: string
  model: string
  year: string
  plate: string
  vin: string
}

const plateKey = (plate?: string) => (plate ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
const carName = (c: { brand?: string; model?: string; year?: string | number }) =>
  [[c.brand, c.model].filter(Boolean).join(' '), c.year].filter(Boolean).join(' ')

// The customer's own car first, then every other plate seen on an order.
function collectCars(customer: CustomerDetail, orders: Order[]): Car[] {
  const cars: Car[] = []
  const add = (c: Car) => {
    const key = plateKey(c.plate)
    const existing = key ? cars.find(x => plateKey(x.plate) === key) : cars.find(x => !x.plate && carName(x) === carName(c))
    if (existing) {
      if (!existing.vin && c.vin) existing.vin = c.vin
      return
    }
    if (c.plate || carName(c) || c.vin) cars.push(c)
  }
  add({ brand: customer.car_brand, model: customer.car_model, year: customer.car_year, plate: customer.car_plate, vin: customer.vin_code ?? '' })
  for (const o of orders) add({ brand: o.car_brand, model: o.car_model, year: o.car_year ?? '', plate: o.plate_number, vin: o.vin_code ?? '' })
  return cars
}

const short = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

export async function printCustomerPDF(customer: CustomerDetail, business?: Business | null) {
  const orders = [...(customer.orders ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const [brand, logo] = await Promise.all([loadBrand(), business?.logo ? toDataUrl(mediaUrl(business.logo)) : Promise.resolve('')])
  const { fonts } = brand
  const f = (font: string) => ({ font })
  const { th, td, num } = tableCells(fonts)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Header: logo + name + slogan | MÜŞTƏRİ TARİXÇƏSİ / export date ───
  content.push(...buildHeader({ fonts, logo, shopName: business?.name ?? '', slogan: business?.slogan, kind: 'MÜŞTƏRİ TARİXÇƏSİ', date: toLocalISODate() }))

  // ── Customer | cars ──────────────────────────────────────────────────
  const phone = formatPhone(customer.phone)
  const customerStack = [
    label('MÜŞTƏRİ'),
    { text: customer.full_name, fontSize: 12, bold: true, color: INK },
    phone ? { text: phone, ...f(fonts.mono), fontSize: 9.5, color: TEXT_2, margin: [0, 3, 0, 0] } : null,
  ].filter(Boolean)
  const cars = collectCars(customer, orders)
  const carsStack = [
    label(cars.length > 1 ? 'AVTOMOBİLLƏR' : 'AVTOMOBİL'),
    ...cars.map((c, i) => ({
      stack: [
        carName(c) ? { text: carName(c), fontSize: 12, bold: true, color: INK } : null,
        c.plate ? plateBox(c.plate, fonts, [0, 5, 0, c.vin ? 2 : 0]) : null,
        c.vin ? { text: `VIN  ${c.vin}`, ...f(fonts.mono), fontSize: 8, color: TEXT_2, margin: [0, 2, 0, 0] } : null,
      ].filter(Boolean),
      margin: [0, i === 0 ? 0 : 9, 0, 0],
    })),
  ]
  content.push({ columns: [{ width: '*', stack: customerStack }, { width: '*', stack: carsStack }], columnGap: 24 })

  // ── Totals ───────────────────────────────────────────────────────────
  const lineTotals = orders.map(o => {
    const services = o.services ?? []
    const products = o.products ?? []
    const servicesTotal = services.reduce((s, t) => s + Number(t.price), 0)
    const productsTotal = products.reduce((s, p) => s + (p.source === 'customer' ? 0 : Number(p.sell_price) * p.quantity), 0)
    const discount = Number(o.discount_amount ?? 0)
    const total = servicesTotal + productsTotal - discount
    const paid = Number(o.paid_amount ?? 0)
    return { services, products, discount, total, paid, remaining: Math.max(total - paid, 0) }
  })
  const grandTotal = lineTotals.reduce((s, t) => s + t.total, 0)
  const tablePaid = lineTotals.reduce((s, t) => s + t.paid, 0)
  const tableRemaining = lineTotals.reduce((s, t) => s + t.remaining, 0)
  const totalPaid = Number(customer.total_paid ?? 0)
  const totalDebt = Number(customer.total_debt ?? 0)

  const stat = (title: string, value: string, strong = false) => ({
    stack: [
      label(title, { margin: [0, 0, 0, 4] }),
      { text: value, ...f(fonts.mono), fontSize: strong ? 14 : 12, color: INK },
    ],
    margin: [10, 8, 10, 8],
  })
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [[
        stat('SİFARİŞ SAYI', String(orders.length)),
        stat('CƏMİ', `${money(grandTotal)} AZN`),
        stat('ÖDƏNİLİB', `${money(totalPaid)} AZN`),
        stat('BORC', `${money(totalDebt)} AZN`, true),
      ]],
    },
    layout: {
      hLineWidth: () => 1,
      hLineColor: (i: number) => (i === 0 ? INK : BORDER),
      vLineWidth: (i: number) => (i === 0 || i === 4 ? 0 : 1),
      vLineColor: () => BORDER,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 18, 0, 0],
    unbreakable: true,
  })

  // ── Orders table ─────────────────────────────────────────────────────
  // Columns: № · Tarix · Avtomobil · Görülən işlər · Status · Məbləğ · Ödənilib · Qalıq
  const widths = [26, 58, 82, '*', 58, 56, 56, 54]
  const COLS = widths.length
  const head = [
    th('№', 'center'),
    th('TARİX'),
    th('AVTOMOBİL'),
    th('GÖRÜLƏN İŞLƏR'),
    th('STATUS'),
    th('MƏBLƏĞ', 'right'),
    th('ÖDƏNİLİB', 'right'),
    th('QALIQ', 'right'),
  ].map(c => ({ ...c, margin: [4, 5, 4, 4] }))
  const pad = [4, 5, 4, 4]

  // Each order is ONE table row (a colSpan cell laid out with the same column
  // widths) so a row never splits across pages: the order line, then its lines.
  const sub = (left: string, amount: string, extra = {}) => ({
    columns: [
      { width: widths[0] as number, text: '' },
      { width: '*', text: left, fontSize: 8, color: TEXT_2, margin: [4, 0, 0, 0], ...extra },
      { width: widths[5] as number, text: amount, ...f(fonts.mono), fontSize: 8, color: TEXT_2, alignment: 'right', margin: [0, 0, 4, 0], ...extra },
      { width: (widths[6] as number) + (widths[7] as number), text: '' },
    ],
    columnGap: 0,
    margin: [0, 0, 0, 2],
  })
  const cellIn = (width: number | string, cell: object) => ({ width, ...cell })

  const body: unknown[][] = [head]
  orders.forEach((o, i) => {
    const t = lineTotals[i]
    const serviceNames = t.services.map(s => s.name).join(', ')
    const works = serviceNames ? short(serviceNames, 70) : t.products.length ? 'Ehtiyat hissələri' : '—'
    const mileage = o.mileage != null ? `Yürüş ${money(o.mileage).slice(0, -3)} ${o.mileage_unit ?? 'km'}` : ''
    const vin = o.vin_code ? `VIN ${o.vin_code}` : ''
    const meta = [mileage, vin].filter(Boolean).join('   ·   ')

    const details = [
      ...t.services.map(s => sub(s.name, money(Number(s.price)))),
      ...t.products.map(p =>
        p.source === 'customer'
          ? sub(`${p.product_name} × ${p.quantity}  ·  Müştəri gətirib`, '—', { color: TEXT_3 })
          : sub(`${p.product_name} × ${p.quantity}  ·  ${money(Number(p.sell_price))}`, money(Number(p.sell_price) * p.quantity)),
      ),
      ...(t.discount > 0 ? [sub('Endirim', `− ${money(t.discount)}`)] : []),
      ...(meta ? [{ text: meta, ...f(fonts.mono), fontSize: 7, color: TEXT_3, margin: [widths[0] as number + 4, 1, 0, 2] }] : []),
    ]

    const main = {
      columns: [
        cellIn(widths[0], td(String(i + 1), 'center', { ...f(fonts.mono), fontSize: 8, color: TEXT_3, margin: pad })),
        cellIn(widths[1], td(shortDate(o.created_at), 'left', { ...f(fonts.mono), fontSize: 8, margin: pad })),
        cellIn(widths[2], {
          stack: [
            { text: carName({ brand: o.car_brand, model: o.car_model }) || '—', fontSize: 9, color: INK },
            o.plate_number ? { text: formatPlate(o.plate_number), ...f(fonts.mono), fontSize: 7.5, color: TEXT_2, margin: [0, 1, 0, 0] } : null,
          ].filter(Boolean),
          margin: pad,
        }),
        cellIn('*', td(works, 'left', { fontSize: 8.5, color: TEXT_2, margin: pad })),
        cellIn(widths[4], {
          stack: [
            { text: STATUS_WORD[o.status] ?? '', fontSize: 8.5, color: INK },
            { text: PAYMENT_WORD[o.payment_status] ?? '', fontSize: 7.5, color: TEXT_3, margin: [0, 1, 0, 0] },
          ],
          margin: pad,
        }),
        cellIn(widths[5], num(money(t.total), { margin: pad, fontSize: 8.5 })),
        cellIn(widths[6], num(money(t.paid), { margin: pad, fontSize: 8.5 })),
        cellIn(widths[7], num(money(t.remaining), { margin: pad, fontSize: 8.5, color: t.remaining > 0 ? INK : TEXT_3 })),
      ],
      columnGap: 0,
    }
    body.push([{ colSpan: COLS, stack: [main, ...(details.length ? [{ stack: details, margin: [0, 0, 0, 4] }] : [])] }, ...Array.from({ length: COLS - 1 }, () => ({}))])
  })

  // Totals row: ink rule above, bold figures.
  const totalsIndex = body.length
  const tcell = (text: string, extra = {}) => num(text, { margin: [4, 6, 4, 6], fontSize: 9, ...extra })
  body.push([
    td('CƏMİ', 'left', { colSpan: 5, ...f(fonts.head), fontSize: 8.5, bold: true, characterSpacing: 1.2, margin: [4, 6, 4, 6] }),
    {}, {}, {}, {},
    tcell(money(grandTotal)),
    tcell(money(tablePaid)),
    tcell(money(tableRemaining)),
  ])

  content.push(sectionTitle('SİFARİŞLƏR', fonts))
  if (orders.length) {
    content.push({
      table: { headerRows: 1, dontBreakRows: true, widths, body },
      layout: {
        hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === totalsIndex || i === node.table.body.length ? 1 : i > 1 ? 1 : 0),
        hLineColor: (i: number, node: { table: { body: unknown[] } }) => (i === totalsIndex || i === node.table.body.length ? INK : BORDER),
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    })
  } else {
    content.push({ text: 'Sifariş yoxdur.', fontSize: 9.5, color: TEXT_3 })
  }

  const slug = asciiSlug(customer.full_name)
  await pm().createPdf({
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
    defaultStyle: { font: fonts.text, fontSize: 9.5, color: INK },
    info: { title: `Müştəri tarixçəsi — ${customer.full_name}` },
    content,
    footer: buildFooter(brand, business),
  }).download(`Musteri_tarixcesi_${slug || 'musteri'}.pdf`)
}
