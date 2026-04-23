import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { Order, Business, CustomerDetail } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? pdfFonts

const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']

function fmt(n: number | string) {
  return Number(n).toFixed(2) + ' ₼'
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

const BLUE     = '#2563eb'
const BLUE_BG  = '#eff6ff'
const BLUE_MID = '#dbeafe'
const BLUE_TEXT = '#1e40af'
const GRAY     = '#6b7280'
const DARK     = '#111827'
const GREEN    = '#16a34a'
const GREEN_BG = '#f0fdf4'
const AMBER    = '#d97706'
const AMBER_BG = '#fffbeb'
const RED      = '#dc2626'
const RED_BG   = '#fef2f2'
const LIGHT    = '#f8faff'
const BORDER   = '#bfdbfe'
const MUTED    = '#9ca3af'
const WHITE    = '#ffffff'
const HEADER_BG = '#2563eb'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tableHeader(cells: { text: string; width?: any; align?: string }[]) {
  return cells.map(c => ({
    text: c.text,
    fontSize: 9,
    bold: true,
    color: BLUE_TEXT,
    fillColor: BLUE_MID,
    alignment: (c.align ?? 'left') as 'left' | 'right' | 'center',
    margin: [6, 7, 6, 7],
    border: [false, false, false, false],
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tableRow(cells: { text: string; align?: string; bold?: boolean; color?: string }[], isLast: boolean, shade: boolean) {
  return cells.map(c => ({
    text: c.text,
    fontSize: 10,
    bold: c.bold ?? false,
    color: c.color ?? DARK,
    fillColor: shade ? LIGHT : WHITE,
    alignment: (c.align ?? 'left') as 'left' | 'right' | 'center',
    margin: [6, 6, 6, 6],
    border: [false, false, false, !isLast],
    borderColor: ['', '', '', BORDER],
  }))
}

function divider() {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER }],
    margin: [0, 12, 0, 12],
  }
}

function sectionTitle(text: string) {
  return {
    text,
    fontSize: 9,
    bold: true,
    color: BLUE,
    characterSpacing: 1.2,
    margin: [0, 0, 0, 6],
  }
}

export async function printOrderPDF(order: Order, business?: Business | null) {
  const services      = order.services  ?? []
  const products      = order.products  ?? []
  const servicesTotal = services.reduce((s, t) => s + parseFloat(String(t.price)), 0)
  const productsTotal = products.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal    = servicesTotal + productsTotal
  const paidAmount    = Number(order.paid_amount ?? 0)
  const debt          = grandTotal - paidAmount
  const customerName  = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')

  const statusText  = order.status === 'done' ? 'Tamamlandı' : order.status === 'in_progress' ? 'İcrada' : 'Gözləyir'
  const statusColor = order.status === 'done' ? GREEN : order.status === 'in_progress' ? BLUE : AMBER
  const statusBg    = order.status === 'done' ? GREEN_BG : order.status === 'in_progress' ? BLUE_BG : AMBER_BG

  const paymentText  = order.payment_status === 'paid' ? 'Tam ödənilib' : order.payment_status === 'partial' ? `Qismən ödənilib` : 'Ödənilməyib'
  const paymentColor = order.payment_status === 'paid' ? GREEN : order.payment_status === 'partial' ? AMBER : RED
  const paymentBg    = order.payment_status === 'paid' ? GREEN_BG : order.payment_status === 'partial' ? AMBER_BG : RED_BG

  let logoDataUrl = ''
  if (business?.logo) {
    const fullUrl = business.logo.startsWith('http') ? business.logo : (import.meta.env.VITE_API_URL ?? '') + business.logo
    logoDataUrl = await toDataUrl(fullUrl)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Top accent bar ────────────────────────────────────────
  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 4, r: 2, color: BLUE }],
    margin: [0, 0, 0, 20],
  })

  // ── Header: logo + business + doc title ──────────────────
  const bizStack = business ? [
    { text: business.name, fontSize: 16, bold: true, color: DARK },
    business.phone   ? { text: business.phone,   fontSize: 10, color: GRAY, margin: [0, 3, 0, 0] } : null,
    business.address ? { text: business.address, fontSize: 10, color: GRAY } : null,
  ].filter(Boolean) : []

  const docInfoStack = [
    { text: 'XİDMƏT AKTI', fontSize: 18, bold: true, color: HEADER_BG, alignment: 'right' },
    { text: `Tarix: ${fmtDate(order.created_at)}`, fontSize: 10, color: GRAY, alignment: 'right', margin: [0, 5, 0, 0] },
    {
      columns: [
        { text: '', width: '*' },
        {
          table: {
            body: [[{
              text: statusText,
              fontSize: 9,
              bold: true,
              color: statusColor,
              fillColor: statusBg,
              margin: [10, 4, 10, 4],
              border: [false, false, false, false],
            }]],
          },
          layout: 'noBorders',
          margin: [0, 6, 0, 0],
        },
      ],
    },
  ]

  if (logoDataUrl) {
    content.push({
      columns: [
        {
          stack: [
            { image: logoDataUrl, width: 70, margin: [0, 0, 0, 6] },
            ...bizStack,
          ],
          width: '*',
        },
        { stack: docInfoStack, width: 'auto' },
      ],
      margin: [0, 0, 0, 20],
    })
  } else {
    content.push({
      columns: [
        { stack: bizStack, width: '*' },
        { stack: docInfoStack, width: 'auto' },
      ],
      margin: [0, 0, 0, 20],
    })
  }

  // ── Full-width divider ────────────────────────────────────
  content.push(divider())

  // ── Car info + Customer side by side ─────────────────────
  const carRows = [
    ['Dövlət nişanı', { text: order.plate_number, bold: true, fontSize: 13, color: DARK }],
    ['Marka / Model', `${order.car_brand} ${order.car_model}`],
    order.car_year   ? ['İl',          order.car_year]                              : null,
    order.mileage != null ? ['Kilometraj',  `${order.mileage.toLocaleString()} km`] : null,
  ].filter(Boolean) as [string, string | object][]

  const customerRows = [
    customerName        ? ['Ad',    customerName]               : null,
    order.customer_phone? ['Əlaqə', order.customer_phone]       : null,
  ].filter(Boolean) as [string, string][]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function infoTable(rows: [string, any][]) {
    return {
      table: {
        widths: [90, '*'],
        body: rows.map(([label, value], i) => [
          {
            text: label,
            fontSize: 9,
            color: MUTED,
            fillColor: i % 2 === 0 ? LIGHT : WHITE,
            margin: [8, 6, 4, 6],
            border: [true, i === 0, false, i === rows.length - 1],
            borderColor: [BORDER, BORDER, BORDER, BORDER],
          },
          typeof value === 'string'
            ? {
                text: value,
                fontSize: 10,
                color: DARK,
                fillColor: i % 2 === 0 ? LIGHT : WHITE,
                margin: [8, 6, 8, 6],
                border: [false, i === 0, true, i === rows.length - 1],
                borderColor: [BORDER, BORDER, BORDER, BORDER],
              }
            : {
                ...value,
                fillColor: i % 2 === 0 ? LIGHT : WHITE,
                margin: [8, 4, 8, 4],
                border: [false, i === 0, true, i === rows.length - 1],
                borderColor: [BORDER, BORDER, BORDER, BORDER],
              },
        ]),
      },
      layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    }
  }

  if (customerRows.length > 0) {
    content.push({
      columns: [
        {
          stack: [
            sectionTitle('AVTOMOBIL'),
            infoTable(carRows),
          ],
          width: '55%',
        },
        { width: 16, text: '' },
        {
          stack: [
            sectionTitle('MÜŞTƏRİ'),
            infoTable(customerRows),
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 20],
    })
  } else {
    content.push({ stack: [sectionTitle('AVTOMOBIL'), infoTable(carRows)], margin: [0, 0, 0, 20] })
  }

  // ── Services table ────────────────────────────────────────
  if (services.length > 0) {
    content.push(sectionTitle('İŞLƏR VƏ XİDMƏTLƏR'))
    content.push({
      table: {
        widths: ['*', 90],
        body: [
          tableHeader([{ text: 'İşin adı' }, { text: 'Qiymət', align: 'right' }]),
          ...services.map((s, i) => tableRow([
            { text: s.name },
            { text: fmt(parseFloat(String(s.price))), align: 'right' },
          ], i === services.length - 1, i % 2 === 1)),
        ],
      },
      layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      margin: [0, 0, 0, 16],
    })
  }

  // ── Products table ────────────────────────────────────────
  if (products.length > 0) {
    content.push(sectionTitle('DƏYİŞƏN PARÇALAR'))
    content.push({
      table: {
        widths: [30, '*', 55, 60, 80],
        body: [
          tableHeader([
            { text: '#' },
            { text: 'Məhsul adı' },
            { text: 'Ədəd', align: 'center' },
            { text: 'Vahid qiymət', align: 'right' },
            { text: 'Məbləğ', align: 'right' },
          ]),
          ...products.map((p, i) => tableRow([
            { text: String(i + 1), color: MUTED },
            { text: p.product_name },
            { text: String(p.quantity), align: 'center' },
            { text: fmt(p.sell_price), align: 'right', color: GRAY },
            { text: fmt(p.sell_price * p.quantity), align: 'right', bold: true },
          ], i === products.length - 1, i % 2 === 1)),
        ],
      },
      layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      margin: [0, 0, 0, 16],
    })
  }

  // ── Notes / Mechanic ──────────────────────────────────────
  if (order.notes || order.mechanic_name) {
    const notesCols = []
    if (order.notes) {
      notesCols.push({
        stack: [
          sectionTitle('QEYDLƏR'),
          { text: order.notes, fontSize: 10, color: DARK, margin: [0, 2, 0, 0] },
        ],
        width: '*',
      })
    }
    if (order.mechanic_name) {
      notesCols.push({
        stack: [
          sectionTitle('USTA'),
          { text: order.mechanic_name, fontSize: 10, color: DARK, margin: [0, 2, 0, 0] },
        ],
        width: 'auto',
      })
    }
    if (notesCols.length === 2) {
      content.push({ columns: notesCols, columnGap: 20, margin: [0, 0, 0, 16] })
    } else {
      content.push({ stack: notesCols[0].stack, margin: [0, 0, 0, 16] })
    }
  }

  // ── Totals block ──────────────────────────────────────────
  content.push(divider())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRows: any[][] = []
  if (services.length > 0) totalRows.push([
    { text: 'İşlər cəmi', fontSize: 10, color: GRAY, border: [false,false,false,false], margin: [0,3,0,3], alignment: 'right' },
    { text: fmt(servicesTotal), fontSize: 10, color: GRAY, border: [false,false,false,false], margin: [0,3,0,3], alignment: 'right' },
  ])
  if (products.length > 0) totalRows.push([
    { text: 'Parçalar cəmi', fontSize: 10, color: GRAY, border: [false,false,false,false], margin: [0,3,0,3], alignment: 'right' },
    { text: fmt(productsTotal), fontSize: 10, color: GRAY, border: [false,false,false,false], margin: [0,3,0,3], alignment: 'right' },
  ])
  totalRows.push([
    { text: 'ÜMUMİ MƏBLƏĞ', fontSize: 13, bold: true, color: DARK, border: [false,true,false,false], borderColor: ['','',BORDER,''], margin: [0,8,0,6], alignment: 'right' },
    { text: fmt(grandTotal), fontSize: 13, bold: true, color: DARK, border: [false,true,false,false], borderColor: ['','',BORDER,''], margin: [0,8,0,6], alignment: 'right' },
  ])

  content.push({
    columns: [
      { text: '', width: '*' },
      {
        table: { widths: [130, 90], body: totalRows },
        layout: { hLineColor: () => BORDER, vLineWidth: () => 0, hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === node.table.body.length - 1 ? 0 : 0.5) },
        width: 'auto',
      },
    ],
    margin: [0, 0, 0, 12],
  })

  // ── Payment badge ─────────────────────────────────────────
  content.push({
    columns: [
      { text: '', width: '*' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [[
            { text: paymentText, fontSize: 11, bold: true, color: paymentColor, fillColor: paymentBg, border: [false,false,false,false], margin: [14, 9, 14, 9] },
            order.payment_status !== 'unpaid'
              ? { text: `Ödənilmiş: ${fmt(paidAmount)}${debt > 0 ? `  ·  Borc: ${fmt(debt)}` : ''}`, fontSize: 10, color: paymentColor, fillColor: paymentBg, border: [false,false,false,false], margin: [0, 9, 14, 9], alignment: 'right' }
              : { text: '', fillColor: paymentBg, border: [false,false,false,false] },
          ]],
        },
        layout: 'noBorders',
        width: 'auto',
      },
    ],
    margin: [0, 0, 0, 24],
  })

  // ── Footer ────────────────────────────────────────────────
  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 1, color: BORDER }],
    margin: [0, 0, 0, 10],
  })
  content.push({
    text: `Bu sənəd avtomatik yaradılmışdır · ${fmtDate(new Date().toISOString())}`,
    fontSize: 9, color: MUTED, alignment: 'center',
  })

  pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 12, color: DARK },
    content,
  }).download(`Sifaris_${order.id}_${order.plate_number}.pdf`)
}

export async function printCustomerPDF(customer: CustomerDetail, business?: Business | null) {
  const orders = [...(customer.orders ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  let logoDataUrl = ''
  if (business?.logo) {
    const fullUrl = business.logo.startsWith('http') ? business.logo : (import.meta.env.VITE_API_URL ?? '') + business.logo
    logoDataUrl = await toDataUrl(fullUrl)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Top accent bar ────────────────────────────────────────
  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 4, r: 2, color: BLUE }],
    margin: [0, 0, 0, 20],
  })

  // ── Header ────────────────────────────────────────────────
  const bizStack = business ? [
    { text: business.name, fontSize: 16, bold: true, color: DARK },
    business.phone   ? { text: business.phone,   fontSize: 10, color: GRAY, margin: [0, 3, 0, 0] } : null,
    business.address ? { text: business.address, fontSize: 10, color: GRAY } : null,
  ].filter(Boolean) : []

  const docInfoStack = [
    { text: 'MÜŞTƏRİ HESABATI', fontSize: 16, bold: true, color: HEADER_BG, alignment: 'right' },
    { text: `Tarix: ${fmtDate(new Date().toISOString())}`, fontSize: 10, color: GRAY, alignment: 'right', margin: [0, 5, 0, 0] },
  ]

  if (logoDataUrl) {
    content.push({
      columns: [
        { stack: [{ image: logoDataUrl, width: 70, margin: [0, 0, 0, 6] }, ...bizStack], width: '*' },
        { stack: docInfoStack, width: 'auto' },
      ],
      margin: [0, 0, 0, 20],
    })
  } else {
    content.push({ columns: [{ stack: bizStack, width: '*' }, { stack: docInfoStack, width: 'auto' }], margin: [0, 0, 0, 20] })
  }

  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 1, color: BORDER }],
    margin: [0, 0, 0, 16],
  })

  // ── Customer info card ────────────────────────────────────
  content.push({ text: customer.full_name, fontSize: 20, bold: true, color: DARK })
  const metaParts = [
    customer.phone,
    [customer.car_brand, customer.car_model, customer.car_year].filter(Boolean).join(' '),
    customer.car_plate,
  ].filter(Boolean)
  if (metaParts.length) content.push({ text: metaParts.join('   ·   '), fontSize: 10, color: GRAY, margin: [0, 4, 0, 12] })

  // Summary stats row
  const totalPaid = customer.total_paid ?? 0
  const totalDebt = customer.total_debt ?? 0
  content.push({
    table: {
      widths: ['*', '*', '*'],
      body: [[
        { text: `${fmt(totalPaid)}\nÖdənilmiş`, fontSize: 12, bold: true, color: GREEN, fillColor: GREEN_BG, alignment: 'center', margin: [0, 12, 0, 12], border: [false,false,false,false] },
        { text: `${fmt(totalDebt)}\nBorc`, fontSize: 12, bold: true, color: totalDebt > 0 ? RED : GRAY, fillColor: totalDebt > 0 ? RED_BG : LIGHT, alignment: 'center', margin: [0, 12, 0, 12], border: [false,false,false,false] },
        { text: `${orders.length}\nSifariş`, fontSize: 12, bold: true, color: BLUE, fillColor: BLUE_BG, alignment: 'center', margin: [0, 12, 0, 12], border: [false,false,false,false] },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 20],
  })

  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 1, color: BORDER }],
    margin: [0, 0, 0, 16],
  })

  // ── Orders ────────────────────────────────────────────────
  let grandTotal = 0

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const services      = order.services  ?? []
    const products      = order.products  ?? []
    const servicesTotal = services.reduce((s, t) => s + parseFloat(String(t.price)), 0)
    const productsTotal = products.reduce((s, p) => s + p.sell_price * p.quantity, 0)
    const orderTotal    = servicesTotal + productsTotal
    grandTotal += orderTotal

    const statusText  = order.status === 'done' ? 'Tamamlandı' : order.status === 'in_progress' ? 'İcrada' : 'Gözləyir'
    const statusColor = order.status === 'done' ? GREEN : order.status === 'in_progress' ? BLUE : AMBER
    const statusBg    = order.status === 'done' ? GREEN_BG : order.status === 'in_progress' ? BLUE_BG : AMBER_BG

    // Order header row
    content.push({
      table: {
        widths: ['*', 'auto'],
        body: [[
          {
            stack: [
              { text: order.plate_number, fontSize: 14, bold: true, color: WHITE, characterSpacing: 1 },
              { text: `${order.car_brand} ${order.car_model}${order.mileage != null ? ` · ${order.mileage.toLocaleString()} km` : ''}`, fontSize: 9, color: '#93c5fd', margin: [0, 2, 0, 0] },
            ],
            fillColor: HEADER_BG,
            border: [false, false, false, false],
            margin: [12, 8, 12, 8],
          },
          {
            stack: [
              { text: fmtDate(order.created_at), fontSize: 9, color: '#93c5fd', alignment: 'right' },
              {
                table: { body: [[{ text: statusText, fontSize: 8, bold: true, color: statusColor, fillColor: statusBg, margin: [8, 3, 8, 3], border: [false,false,false,false] }]] },
                layout: 'noBorders',
                margin: [0, 4, 0, 0],
              },
            ],
            fillColor: HEADER_BG,
            border: [false, false, false, false],
            margin: [8, 8, 12, 8],
          },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 0],
    })

    // Services
    if (services.length > 0) {
      content.push({
        table: {
          widths: ['*', 90],
          body: [
            tableHeader([{ text: 'İşlər' }, { text: 'Qiymət', align: 'right' }]),
            ...services.map((s, si) => tableRow([
              { text: s.name },
              { text: fmt(parseFloat(String(s.price))), align: 'right' },
            ], si === services.length - 1, si % 2 === 1)),
          ],
        },
        layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        margin: [0, 0, 0, 0],
      })
    }

    // Products
    if (products.length > 0) {
      content.push({
        table: {
          widths: [22, '*', 45, 55, 70],
          body: [
            tableHeader([{ text: '#' }, { text: 'Parça' }, { text: 'Ədəd', align: 'center' }, { text: 'Vahid', align: 'right' }, { text: 'Məbləğ', align: 'right' }]),
            ...products.map((p, pi) => tableRow([
              { text: String(pi + 1), color: MUTED },
              { text: p.product_name },
              { text: String(p.quantity), align: 'center' },
              { text: fmt(p.sell_price), align: 'right', color: GRAY },
              { text: fmt(p.sell_price * p.quantity), align: 'right', bold: true },
            ], pi === products.length - 1, pi % 2 === 1)),
          ],
        },
        layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        margin: [0, 0, 0, 0],
      })
    }

    // Order total + payment
    const paidAmount = Number(order.paid_amount ?? 0)
    const debt = orderTotal - paidAmount
    const paymentColor = order.payment_status === 'paid' ? GREEN : order.payment_status === 'partial' ? AMBER : RED
    const paymentBg    = order.payment_status === 'paid' ? GREEN_BG : order.payment_status === 'partial' ? AMBER_BG : RED_BG
    const paymentText  = order.payment_status === 'paid' ? 'Tam ödənilib' : order.payment_status === 'partial' ? `Qismən · borc: ${fmt(debt)}` : 'Ödənilməyib'

    content.push({
      table: {
        widths: ['*', 'auto', 'auto'],
        body: [[
          { text: paymentText, fontSize: 9, bold: true, color: paymentColor, fillColor: paymentBg, border: [false,false,false,false], margin: [10, 7, 10, 7] },
          { text: 'Cəmi:', fontSize: 10, color: GRAY, fillColor: LIGHT, border: [false,false,false,false], alignment: 'right', margin: [10, 7, 6, 7] },
          { text: fmt(orderTotal), fontSize: 11, bold: true, color: DARK, fillColor: LIGHT, border: [false,false,false,false], alignment: 'right', margin: [0, 7, 10, 7] },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, i < orders.length - 1 ? 20 : 0],
    })

    if (i < orders.length - 1) {
      content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER }], margin: [0, 4, 0, 16] })
    }
  }

  // ── Grand total ───────────────────────────────────────────
  content.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 1, color: BORDER }], margin: [0, 16, 0, 12] })
  content.push({
    columns: [
      { text: 'ÜMUMİ CƏMİ', fontSize: 14, bold: true, color: DARK },
      { text: fmt(grandTotal), fontSize: 14, bold: true, color: DARK, alignment: 'right' },
    ],
    margin: [0, 0, 0, 24],
  })

  // ── Footer ────────────────────────────────────────────────
  content.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 1, color: BORDER }], margin: [0, 0, 0, 10] })
  content.push({ text: `Bu sənəd avtomatik yaradılmışdır · ${fmtDate(new Date().toISOString())}`, fontSize: 9, color: MUTED, alignment: 'center' })

  pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 12, color: DARK },
    content,
  }).download(`Musteri_${customer.full_name.replace(/\s+/g, '_')}.pdf`)
}
