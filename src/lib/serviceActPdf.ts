import { Order, Business } from '@/types'
import { pm, toDataUrl } from '@/lib/printOrderPDF'
import { mediaUrl } from '@/lib/apiUrl'

// The customer-facing "Xidmət aktı" for one order (pdfmake, A4), in the
// "Variant B — Müasir" style the user picked: green top bar, light info strip,
// one airy table with section labels, guarantee card beside the totals and
// signatures at the bottom. Blocks the shop hasn't filled in are left out.

const ACCENT = '#1F4D36'
const INK = '#1F2A24'
const MUTED = '#6B7264'
const RULE = '#E2E5DF'
const SOFT = '#F1F3EF'
const WARM_BG = '#FBEFD5'
const WARM_INK = '#8A5A12'
const PAID_BG = '#E3EEE6'
const WHITE = '#FFFFFF'

const SIDE = 40
const PAGE_WIDTH = 595.28 - SIDE * 2

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']

function money(n: number) {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec}`
}

// 'YYYY-MM-DD' (a date) or a full ISO timestamp → local calendar parts.
function dateParts(value: string) {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (plain) return { y: Number(plain[1]), m: Number(plain[2]), d: Number(plain[3]) }
  const dt = new Date(value)
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
}

function longDate(value: string) {
  const { y, m, d } = dateParts(value)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function lines(text?: string) {
  return (text ?? '').split('\n').map(l => l.trim()).filter(Boolean)
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? 'S').slice(0, 2)).toUpperCase()
}

// Small uppercase label above a value.
function label(text: string, color = MUTED) {
  return { text, fontSize: 6.5, color, characterSpacing: 0.9, margin: [0, 0, 0, 3] }
}

// A soft card with a coloured bar on the left (guarantee, notes).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sideBarCard(stack: any[], bar = ACCENT, fill = SOFT) {
  return {
    table: { widths: ['*'], body: [[{ stack, margin: [10, 8, 10, 9] }]] },
    layout: {
      fillColor: () => fill,
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 ? 2.5 : 0),
      vLineColor: () => bar,
    },
  }
}

export async function printOrderPDF(order: Order, business?: Business | null) {
  const services = order.services ?? []
  const products = order.products ?? []
  const servicesTotal = services.reduce((s, t) => s + Number(t.price), 0)
  const productsTotal = products.reduce((s, p) => s + Number(p.sell_price) * p.quantity, 0)
  const discount = Number(order.discount_amount ?? 0)
  const total = servicesTotal + productsTotal - discount
  const paid = Number(order.paid_amount ?? 0)
  const remaining = Math.max(total - paid, 0)
  const customerName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')
  const actDate = order.completed_on ?? order.created_at
  const instagram = business?.instagram?.trim().replace(/^@/, '') ?? ''
  const shopName = business?.name ?? ''
  const contact = [business?.phone, business?.address].filter(Boolean).join(' · ')

  const [logo, signature] = await Promise.all([
    business?.logo ? toDataUrl(mediaUrl(business.logo)) : Promise.resolve(''),
    business?.signature ? toDataUrl(mediaUrl(business.signature)) : Promise.resolve(''),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Header: logo + name/contact | XİDMƏT AKTI № / date ──────────────
  const mark = logo
    ? { image: logo, fit: [64, 64], width: 64 }
    : {
        width: 46,
        table: { widths: [46], heights: [46], body: [[{ text: initials(shopName), bold: true, fontSize: 16, color: WHITE, alignment: 'center', margin: [0, 13, 0, 0] }]] },
        layout: { fillColor: () => ACCENT, hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      }
  content.push({
    columns: [
      mark,
      {
        width: '*',
        stack: [
          { text: shopName, fontSize: 16, bold: true, color: INK },
          contact ? { text: contact, fontSize: 9, color: MUTED, margin: [0, 3, 0, 0] } : null,
          business?.slogan ? { text: business.slogan, fontSize: 8.5, italics: true, color: MUTED, margin: [0, 2, 0, 0] } : null,
        ].filter(Boolean),
        margin: [12, logo ? 18 : 9, 0, 0],
      },
      {
        width: 'auto',
        stack: [
          { text: 'XİDMƏT AKTI', fontSize: 8, color: MUTED, characterSpacing: 1.2, alignment: 'right' },
          { text: `№ ${order.number ?? order.id}`, fontSize: 22, bold: true, color: ACCENT, alignment: 'right', margin: [0, 2, 0, 1] },
          { text: longDate(actDate), fontSize: 9, color: MUTED, alignment: 'right' },
        ],
        margin: [0, 6, 0, 0],
      },
    ],
    margin: [0, 0, 0, 16],
  })

  // ── Car strip: AVTOMOBİL | NİŞAN | YÜRÜŞ | VIN ───────────────────────
  const car = [[order.car_brand, order.car_model].filter(Boolean).join(' '), order.car_year].filter(Boolean).join(' · ')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strip: any[] = [{ stack: [label('AVTOMOBİL'), { text: car || '—', fontSize: 10, bold: true, color: INK }] }]
  if (order.plate_number) {
    strip.push({
      stack: [
        label('NİŞAN'),
        {
          table: { body: [[{ text: order.plate_number, bold: true, fontSize: 9.5, color: INK, margin: [4, 0.5, 4, -0.5] }]] },
          layout: { hLineWidth: () => 0.9, vLineWidth: () => 0.9, hLineColor: () => INK, vLineColor: () => INK, paddingTop: () => 1, paddingBottom: () => 1 },
        },
      ],
    })
  }
  if (order.mileage != null) {
    strip.push({ stack: [label('YÜRÜŞ'), { text: `${money(order.mileage).slice(0, -3)} ${order.mileage_unit ?? 'km'}`, fontSize: 10, bold: true, color: INK }] })
  }
  if (order.vin_code) {
    strip.push({ stack: [label('VIN'), { text: order.vin_code, fontSize: 8.5, bold: true, color: INK, margin: [0, 1, 0, 0] }] })
  }
  content.push({
    table: { widths: strip.map((_, i) => (i === 0 ? '*' : 'auto')), body: [strip.map(cell => ({ ...cell, margin: [10, 8, 14, 8] }))] },
    layout: {
      fillColor: () => SOFT,
      hLineWidth: () => 0,
      vLineWidth: (i: number, node: { table: { widths: unknown[] } }) => (i === 0 || i === node.table.widths.length ? 0 : 2.5),
      vLineColor: () => WHITE,
    },
  })

  // ── Customer · mechanic line ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const who: any[] = []
  if (customerName || order.customer_phone) {
    who.push({ text: 'Müştəri: ', color: MUTED })
    if (customerName) who.push({ text: customerName, bold: true, color: INK })
    if (order.customer_phone) who.push({ text: `${customerName ? ' · ' : ''}${order.customer_phone}`, color: MUTED })
  }
  if (order.mechanic_name) who.push({ text: `${who.length ? '      ' : ''}Usta: `, color: MUTED }, { text: order.mechanic_name, bold: true, color: INK })
  if (who.length) content.push({ text: who, fontSize: 9, margin: [0, 9, 0, 0] })

  // ── Complaint / diagnosis ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes: any[] = []
  if (order.description) notes.push({ stack: [label('MÜRACİƏT', ACCENT), { text: order.description, fontSize: 8.5, color: INK, lineHeight: 1.2 }] })
  if (order.diagnosis) notes.push({ stack: [label('DİAQNOSTİKA', ACCENT), { text: order.diagnosis, fontSize: 8.5, color: INK, lineHeight: 1.2 }] })
  if (notes.length) {
    content.push({ columns: notes.map(n => ({ width: '*', ...sideBarCard([n]) })), columnGap: 10, margin: [0, 12, 0, 0] })
  }

  // ── Items: one table, "İŞLƏR" and "EHTİYAT HİSSƏLƏRİ" sections ───────
  type Line = 'none' | 'rule' | 'ink' | 'accent'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[][] = []
  const below: Line[] = [] // line drawn under each body row
  const head = (text: string, alignment = 'left') => ({ text, fontSize: 7, color: MUTED, characterSpacing: 0.9, alignment, margin: [6, 0, 6, 5] })
  body.push([head('ADI'), head('SAY', 'center'), head('QİYMƏT', 'right'), head('MƏBLƏĞ', 'right')])
  below.push('ink')
  const section = (text: string) => {
    body.push([{ text, bold: true, fontSize: 8, color: ACCENT, characterSpacing: 1, colSpan: 4, margin: [6, 8, 6, 3] }, {}, {}, {}])
    below.push('accent')
  }
  const cell = (text: string, alignment = 'left', extra = {}) => ({ text, fontSize: 9, color: INK, alignment, margin: [6, 3.6, 6, 2.8], ...extra })
  if (services.length) {
    section('İŞLƏR')
    services.forEach(s => {
      body.push([cell(s.name), cell('1', 'center'), cell(money(Number(s.price)), 'right'), cell(money(Number(s.price)), 'right')])
      below.push('rule')
    })
  }
  if (products.length) {
    section('EHTİYAT HİSSƏLƏRİ')
    products.forEach(p => {
      const own = p.source === 'customer'
      body.push([
        cell('', 'left', { text: [p.product_name, ...(own ? [{ text: '  · müştəri gətirib', fontSize: 7.5, color: MUTED }] : [])] }),
        cell(String(p.quantity), 'center'),
        cell(own ? '—' : money(Number(p.sell_price)), 'right', own ? { color: MUTED } : {}),
        cell(own ? '—' : money(Number(p.sell_price) * p.quantity), 'right', own ? { color: MUTED } : {}),
      ])
      below.push('rule')
    })
  }
  const lineWidth = { none: 0, rule: 0.6, ink: 1.1, accent: 0.9 }
  const lineColor = { none: WHITE, rule: RULE, ink: INK, accent: ACCENT }
  content.push({
    table: { headerRows: 1, dontBreakRows: true, widths: ['*', 44, 74, 80], body },
    layout: {
      hLineWidth: (i: number) => (i === 0 ? 0 : lineWidth[below[i - 1]]),
      hLineColor: (i: number) => (i === 0 ? WHITE : lineColor[below[i - 1]]),
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 14, 0, 12],
  })

  // ── Guarantee / recommendations | totals ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const left: any[] = []
  // A short guarantee sits beside the totals (as in variant B); a long one —
  // some shops paste a full page of terms — goes full width under them and
  // may continue on the next page.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fullWidthGuarantee: any = null
  if (order.has_guarantee && business?.guarantee_text) {
    const text = business.guarantee_text.trim()
    const exclusions = lines(business.guarantee_exclusions)
    const long = text.length > 450 || lines(text).length > 6 || exclusions.length > 6
    const size = long ? 7.5 : 8.5
    const card = sideBarCard([
      label('ZƏMANƏT', ACCENT),
      { text, fontSize: size, color: INK, lineHeight: long ? 1.15 : 1.25 },
      ...(exclusions.length
        ? [
            { text: 'Zəmanətə daxil deyil:', fontSize: 7.5, bold: true, color: MUTED, margin: [0, 6, 0, 2] },
            { ul: exclusions, fontSize: 7.5, color: MUTED, lineHeight: 1.15 },
          ]
        : []),
    ])
    if (long) fullWidthGuarantee = { ...card, margin: [0, 16, 0, 0] }
    else left.push({ ...card, margin: [0, 0, 0, 8] })
  }
  const recommendations = lines(order.recommendations)
  if (recommendations.length) {
    left.push(sideBarCard([
      label('TÖVSİYƏ OLUNAN İŞLƏR', WARM_INK),
      { ol: recommendations, fontSize: 8.5, color: INK, lineHeight: 1.2 },
    ], WARM_INK, WARM_BG))
  }

  const row = (l: string, v: string) => [
    { text: l, fontSize: 9, color: MUTED, margin: [0, 2, 0, 2] },
    { text: v, fontSize: 9, color: INK, alignment: 'right', margin: [0, 2, 0, 2] },
  ]
  const sums = [
    ...(services.length ? [row('İşlər', `${money(servicesTotal)} AZN`)] : []),
    ...(products.length ? [row('Ehtiyat hissələri', `${money(productsTotal)} AZN`)] : []),
    ...(discount > 0 ? [row('Endirim', `-${money(discount)} AZN`)] : []),
  ]
  const totals = {
    stack: [
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            ...sums,
            [
              { text: 'Cəmi', fontSize: 13, bold: true, color: INK, margin: [0, 7, 0, 0] },
              { text: `${money(total)} AZN`, fontSize: 16, bold: true, color: INK, alignment: 'right', margin: [0, 5, 0, 0] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === sums.length ? 1.2 : 0),
          hLineColor: () => INK,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [[
            { text: remaining > 0 ? `Ödənilib: ${money(paid)} AZN` : 'Tam ödənilib', fontSize: 9, bold: true, color: remaining > 0 ? WARM_INK : ACCENT, margin: [10, 6, 0, 5] },
            { text: remaining > 0 ? `Qalıq: ${money(remaining)} AZN` : `${money(paid)} AZN`, fontSize: 9, bold: true, color: remaining > 0 ? WARM_INK : ACCENT, alignment: 'right', margin: [0, 6, 10, 5] },
          ]],
        },
        layout: { fillColor: () => (remaining > 0 ? WARM_BG : PAID_BG), hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 10, 0, 0],
      },
    ],
  }

  // Kept on one page by `pageBreakBefore` below. Not `unbreakable` and not
  // a `dontBreakRows` table: with nested tables pdfmake drops such a block
  // when it has to move to the next page, which lost the totals on long orders.
  content.push({
    id: 'bottom',
    columns: [{ width: '*', stack: left.length ? left : [{ text: '' }] }, { width: 210, ...totals }],
    columnGap: 22,
  })
  if (fullWidthGuarantee) content.push(fullWidthGuarantee)

  // ── Footer: signatures (last page) + contact line on every page ──────
  const footerLine = [shopName, business?.phone, business?.address, instagram ? `Instagram: @${instagram}` : '']
    .filter(Boolean)
    .join(' · ')
  const signBlock = (title: string, withSignature: boolean) => ({
    width: '*',
    stack: [
      withSignature && signature ? { image: signature, fit: [120, 30], margin: [0, 0, 0, 2] } : { text: ' ', fontSize: 1, margin: [0, 0, 0, 31] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 215, y2: 0, lineWidth: 0.9, lineColor: '#CFCBC0' }] },
      { text: title, fontSize: 8.5, color: MUTED, margin: [0, 5, 0, 0] },
    ],
  })
  const footer = (currentPage: number, pageCount: number) => ({
    margin: [SIDE, 0, SIDE, 0],
    stack: [
      currentPage === pageCount
        ? { columns: [signBlock('Servis', true), signBlock('Müştəri', false)], columnGap: PAGE_WIDTH - 430 }
        : { text: ' ', margin: [0, 0, 0, 44] },
      { text: footerLine, fontSize: 7.5, color: MUTED, alignment: 'center', margin: [0, 10, 0, 0] },
      pageCount > 1 ? { text: `Səhifə ${currentPage} / ${pageCount}`, fontSize: 7, color: MUTED, alignment: 'center', margin: [0, 2, 0, 0] } : null,
    ].filter(Boolean),
  })

  await pm().createPdf({
    pageSize: 'A4',
    pageMargins: [SIDE, 34, SIDE, 96],
    background: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 6, color: ACCENT }] }),
    defaultStyle: { font: 'Roboto', fontSize: 9, color: INK },
    info: { title: `Xidmət aktı № ${order.number ?? order.id}` },
    content,
    footer,
    // Move the guarantee + totals block to the next page whole rather than split it.
    pageBreakBefore: (node: { id?: string; pageNumbers: number[] }) => node.id === 'bottom' && node.pageNumbers.length > 1,
  }).download(`Xidmet_akti_${order.number ?? order.id}_${order.plate_number.replace(/\s+/g, '')}.pdf`)
}
