import { Order, Business } from '@/types'
import { mediaUrl } from '@/lib/apiUrl'
import { formatPhone } from '@/lib/utils'
import {
  pm, toDataUrl, loadBrand, buildHeader, buildFooter, plateBox, tableCells, rowsLayout, sectionTitle, label, money,
  INK, TEXT_2, TEXT_3, BORDER, PAGE_WIDTH, PAGE_MARGINS,
} from '@/lib/pdfBrand'

// The customer-facing "Servis aktı" for one order (pdfmake, A4 portrait) in the
// Servo brand look: ink on white, hairline rules, grey table heads, numbers
// right-aligned. Signal red appears only in the tiny Servo mark in the footer.
// Blocks the shop has not filled in are left out. Fonts, header, footer, plate
// box and table styles are shared with the customer history (lib/pdfBrand.ts).

function lines(text?: string) {
  return (text ?? '').split('\n').map(l => l.trim()).filter(Boolean)
}

const PAYMENT_WORD = { paid: 'Ödənilib', partial: 'Qismən ödənilib', unpaid: 'Ödənilməyib' } as const

type LineNode = { table: { body: unknown[] } }

export async function printOrderPDF(order: Order, business?: Business | null) {
  const services = order.services ?? []
  const products = order.products ?? []
  const servicesTotal = services.reduce((s, t) => s + Number(t.price), 0)
  const productsTotal = products.reduce((s, p) => s + (p.source === 'customer' ? 0 : Number(p.sell_price) * p.quantity), 0)
  const discount = Number(order.discount_amount ?? 0)
  const total = servicesTotal + productsTotal - discount
  const paid = Number(order.paid_amount ?? 0)
  const remaining = Math.max(total - paid, 0)
  const customerName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')
  const actDate = order.completed_on ?? order.created_at
  const shopName = business?.name ?? ''
  const actNo = order.number != null ? String(order.number) : ''

  const [brand, logo, signature] = await Promise.all([
    loadBrand(),
    business?.logo ? toDataUrl(mediaUrl(business.logo)) : Promise.resolve(''),
    business?.signature ? toDataUrl(mediaUrl(business.signature)) : Promise.resolve(''),
  ])
  const { fonts } = brand
  const textFont = fonts.text
  const headFont = fonts.head
  const monoFont = fonts.mono
  const f = (font: string) => ({ font })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Header: logo + name + slogan | SERVİS AKTI № / date ──────────────
  content.push(...buildHeader({ fonts, logo, shopName, slogan: business?.slogan, kind: 'SERVİS AKTI', number: actNo, date: actDate }))

  // ── Info: Müştəri | Avtomobil ────────────────────────────────────────
  const phone = formatPhone(order.customer_phone)
  const carName = [[order.car_brand, order.car_model].filter(Boolean).join(' '), order.car_year].filter(Boolean).join(' ')
  const kv = (k: string, v: string, mono = false) => ({
    columns: [
      { text: k, width: 40, fontSize: 8.5, color: TEXT_3 },
      { text: v, width: '*', fontSize: 9.5, color: INK, ...(mono ? f(monoFont) : {}) },
    ],
    columnGap: 0,
    margin: [0, 2, 0, 0],
  })
  const customerStack = [
    label('MÜŞTƏRİ'),
    customerName ? { text: customerName, fontSize: 12, bold: true, color: INK } : null,
    phone ? { text: phone, ...f(monoFont), fontSize: 9.5, color: TEXT_2, margin: [0, 3, 0, 0] } : null,
    order.mechanic_name ? { ...kv('Usta', order.mechanic_name), margin: [0, 6, 0, 0] } : null,
  ].filter(Boolean)
  const mileage = order.mileage != null ? `${money(order.mileage).slice(0, -3)} ${order.mileage_unit ?? 'km'}` : ''
  const carStack = [
    label('AVTOMOBİL'),
    carName ? { text: carName, fontSize: 12, bold: true, color: INK } : null,
    order.plate_number ? plateBox(order.plate_number, fonts) : null,
    order.vin_code ? kv('VIN', order.vin_code, true) : null,
    mileage ? kv('Yürüş', mileage, true) : null,
  ].filter(Boolean)
  content.push({ columns: [{ width: '*', stack: customerStack }, { width: '*', stack: carStack }], columnGap: 24 })

  // ── Complaint / diagnosis ────────────────────────────────────────────
  const para = (title: string, text: string) => ({
    stack: [label(title), { text, fontSize: 9.5, color: TEXT_2, lineHeight: 1.25 }],
    margin: [0, 14, 0, 0],
  })
  if (order.description) content.push(para('MÜRACİƏT', order.description))
  if (order.diagnosis) content.push(para('DİAQNOSTİKA', order.diagnosis))

  // ── Tables ───────────────────────────────────────────────────────────
  const { th, td, num } = tableCells(fonts)
  const index = (i: number) => td(String(i + 1), 'center', { ...f(monoFont), fontSize: 8, color: TEXT_3 })
  const section = (title: string, headRow: unknown[], rows: unknown[][], widths: (string | number)[]) => {
    content.push(sectionTitle(title, fonts))
    content.push({ table: { headerRows: 1, dontBreakRows: true, widths, body: [headRow, ...rows] }, layout: rowsLayout })
  }
  if (services.length) {
    section(
      'İŞLƏR',
      [th('№', 'center'), th('AD'), th('MƏBLƏĞ', 'right')],
      services.map((s, i) => [index(i), td(s.name), num(money(Number(s.price)))]),
      [26, '*', 80],
    )
  }
  if (products.length) {
    section(
      'EHTİYAT HİSSƏLƏRİ',
      [th('№', 'center'), th('AD'), th('MİQDAR', 'right'), th('QİYMƏT', 'right'), th('MƏBLƏĞ', 'right')],
      products.map((p, i) => {
        const own = p.source === 'customer'
        return [
          index(i),
          td(own ? [p.product_name, { text: '   Müştəri gətirib', fontSize: 8, color: TEXT_3 }] : p.product_name),
          num(String(p.quantity)),
          num(own ? '—' : money(Number(p.sell_price)), own ? { color: TEXT_3 } : {}),
          num(own ? '—' : money(Number(p.sell_price) * p.quantity), own ? { color: TEXT_3 } : {}),
        ]
      }),
      [26, '*', 52, 68, 80],
    )
  }

  // ── Totals (right-aligned) ───────────────────────────────────────────
  const trow = (l: string, v: string, o: { big?: boolean; bold?: boolean } = {}) => [
    { text: l, fontSize: o.big ? 12 : 9.5, bold: o.big || o.bold, color: o.big ? INK : TEXT_2, margin: [0, o.big ? 5 : 2.5, 0, o.big ? 3 : 2.5] },
    { text: v, ...f(monoFont), fontSize: o.big ? 13 : 9.5, color: INK, alignment: 'right', margin: [0, o.big ? 4 : 2.5, 0, o.big ? 3 : 2.5] },
  ]
  const sumRows = [
    ...(services.length && products.length ? [trow('İşlər', `${money(servicesTotal)} AZN`), trow('Ehtiyat hissələri', `${money(productsTotal)} AZN`)] : []),
    ...(discount > 0 ? [trow('Endirim', `− ${money(discount)} AZN`)] : []),
  ]
  const totalsBody = [
    ...sumRows,
    trow('Cəmi', `${money(total)} AZN`, { bold: true }),
    trow('Ödənilib', `${money(paid)} AZN`),
    trow('Qalıq', `${money(remaining)} AZN`, { big: true }),
  ]
  const totals = {
    stack: [
      {
        table: { widths: ['*', 'auto'], body: totalsBody },
        layout: {
          // hairline above "Cəmi" when there are sub-rows, ink rule above "Qalıq"
          hLineWidth: (i: number, node: LineNode) => (i === node.table.body.length - 1 ? 1 : i === sumRows.length && sumRows.length > 0 ? 1 : 0),
          hLineColor: (i: number, node: LineNode) => (i === node.table.body.length - 1 ? INK : BORDER),
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      { text: PAYMENT_WORD[order.payment_status] ?? '', fontSize: 9, color: TEXT_2, alignment: 'right', margin: [0, 4, 0, 0] },
    ],
  }
  content.push({
    columns: [{ width: '*', text: '' }, { width: 215, ...totals }],
    margin: [0, 14, 0, 0],
    unbreakable: true,
  })

  // ── Guarantee ────────────────────────────────────────────────────────
  if (order.has_guarantee && business?.guarantee_text) {
    const text = business.guarantee_text.trim()
    const exclusions = lines(business.guarantee_exclusions)
    const rows = [
      [{ text: 'ZƏMANƏT', ...f(headFont), fontSize: 8.5, bold: true, color: INK, characterSpacing: 1.2, margin: [10, 9, 10, 4] }],
      [{ text, fontSize: 9, color: TEXT_2, lineHeight: 1.25, margin: [10, 0, 10, exclusions.length ? 6 : 9] }],
      ...(exclusions.length
        ? [[{
            stack: [
              { text: 'Zəmanətə daxil deyil:', fontSize: 8.5, bold: true, color: INK, margin: [0, 0, 0, 2] },
              { ul: exclusions, fontSize: 8.5, color: TEXT_2, lineHeight: 1.2 },
            ],
            margin: [10, 0, 10, 9],
          }]]
        : []),
    ]
    content.push({
      table: { widths: ['*'], body: rows },
      layout: {
        hLineWidth: (i: number, node: LineNode) => (i === 0 || i === node.table.body.length ? 1 : 0),
        vLineWidth: () => 1,
        hLineColor: () => INK,
        vLineColor: () => INK,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 18, 0, 0],
      unbreakable: true,
    })
  }

  // ── Recommendations ──────────────────────────────────────────────────
  const recommendations = lines(order.recommendations)
  if (recommendations.length) {
    content.push({
      stack: [label('TÖVSİYƏLƏR'), { ol: recommendations, fontSize: 9.5, color: TEXT_2, lineHeight: 1.25 }],
      margin: [0, 16, 0, 0],
    })
  }

  // ── Signatures ───────────────────────────────────────────────────────
  const signWidth = (PAGE_WIDTH - 40) / 2
  const signBlock = (title: string, withSignature: boolean) => ({
    width: '*',
    stack: [
      withSignature && signature ? { image: signature, fit: [120, 34], margin: [0, 0, 0, 2] } : { text: ' ', fontSize: 1, margin: [0, 0, 0, 36] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: signWidth, y2: 0, lineWidth: 0.8, lineColor: INK }] },
      { text: title, fontSize: 8.5, color: TEXT_3, margin: [0, 4, 0, 0] },
    ],
  })
  content.push({
    columns: [signBlock('Servis', true), signBlock('Müştəri', false)],
    columnGap: 40,
    margin: [0, 28, 0, 0],
    unbreakable: true,
  })

  const footer = buildFooter(brand, business)

  const fileNo = actNo ? `${actNo}_` : ''
  await pm().createPdf({
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
    defaultStyle: { font: textFont, fontSize: 9.5, color: INK },
    info: { title: `Servis aktı${actNo ? ` № ${actNo}` : ''}` },
    content,
    footer,
  }).download(`Servis_akti_${fileNo}${(order.plate_number ?? '').replace(/\s+/g, '')}.pdf`)
}
