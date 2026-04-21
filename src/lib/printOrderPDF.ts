import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { Order, Business } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? pdfFonts

function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₼'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
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

// pdfmake uses a grey line as separator
function divider() {
  return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 8, 0, 12] }
}

export async function printOrderPDF(order: Order, business?: Business | null) {
  const services = order.services ?? []
  const products = order.products ?? []
  const servicesTotal = services.reduce((s, t) => s + parseFloat(String(t.price)), 0)
  const productsTotal = products.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal = servicesTotal + productsTotal
  const paidAmount = Number(order.paid_amount ?? 0)
  const debt = grandTotal - paidAmount
  const customerName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')

  const paymentLabel =
    order.payment_status === 'paid' ? 'Tam ödənilib' :
    order.payment_status === 'partial' ? `Qismən ödənilib (Borc: ${fmt(debt)})` :
    'Ödənilməyib'
  const paymentColor =
    order.payment_status === 'paid' ? '#16a34a' :
    order.payment_status === 'partial' ? '#d97706' : '#dc2626'

  // Resolve logo to base64
  let logoDataUrl = ''
  if (business?.logo) {
    const fullUrl = business.logo.startsWith('http')
      ? business.logo
      : (import.meta.env.VITE_API_URL ?? '') + business.logo
    logoDataUrl = await toDataUrl(fullUrl)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Business header ─────────────────────────────────────
  if (business) {
    const bizLeft = logoDataUrl
      ? [{ image: logoDataUrl, width: 52, height: 52, margin: [0, 0, 12, 0] }]
      : []
    const bizInfo = [
      { text: business.name, fontSize: 16, bold: true, color: '#111827' },
      business.phone ? { text: business.phone, fontSize: 11, color: '#6b7280', margin: [0, 2, 0, 0] } : null,
      business.address ? { text: business.address, fontSize: 11, color: '#6b7280' } : null,
    ].filter(Boolean)

    content.push({
      columns: [
        ...bizLeft,
        { stack: bizInfo, margin: [0, 4, 0, 0] },
      ],
      margin: [0, 0, 0, 0],
    })
    content.push(divider())
  }

  // ── Order header ─────────────────────────────────────────
  content.push({
    columns: [
      {
        stack: [
          { text: order.plate_number, fontSize: 26, bold: true, color: '#111827', characterSpacing: 2 },
          { text: `${order.car_brand} ${order.car_model}`, fontSize: 13, color: '#374151', margin: [0, 3, 0, 5] },
          {
            table: { body: [[{ text: 'Tamamlandı', fontSize: 10, bold: true, color: '#166534', fillColor: '#dcfce7', margin: [6, 3, 6, 3] }]] },
            layout: 'noBorders',
          },
        ],
      },
      {
        stack: [
          { text: 'SİFARİŞ', fontSize: 9, bold: true, color: '#9ca3af', alignment: 'right' },
          { text: `#${order.id}`, fontSize: 20, bold: true, color: '#2563eb', alignment: 'right' },
          { text: fmtDate(order.created_at), fontSize: 11, color: '#6b7280', alignment: 'right', margin: [0, 4, 0, 0] },
          { text: `${order.estimated_days} gün`, fontSize: 11, color: '#6b7280', alignment: 'right' },
        ],
      },
    ],
    margin: [0, 0, 0, 0],
  })

  content.push(divider())

  // ── Tapşırıq ─────────────────────────────────────────────
  if (order.description) {
    content.push({ text: 'TAPŞIRIQ', fontSize: 9, bold: true, color: '#9ca3af', margin: [0, 0, 0, 4] })
    content.push({ text: order.description, fontSize: 12, color: '#374151', lineHeight: 1.5, margin: [0, 0, 0, 14] })
  }

  // ── Services + Products side by side ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servicesBody: any[][] = [
    [{ text: 'İŞLƏR VƏ QİYMƏTLƏR', fontSize: 9, bold: true, color: '#9ca3af', border: [false, false, false, false] },
     { text: '', border: [false, false, false, false] }],
    ...services.map(s => [
      { text: s.name, fontSize: 11, border: [false, false, false, true], borderColor: ['', '', '', '#f3f4f6'], margin: [0, 3, 0, 3] },
      { text: fmt(parseFloat(String(s.price))), fontSize: 11, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f3f4f6'], margin: [0, 3, 0, 3] },
    ]),
  ]
  if (!services.length) {
    servicesBody.push([{ text: 'İş qeyd edilməyib', fontSize: 11, color: '#9ca3af', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productsBody: any[][] = [
    [{ text: 'İSTİFADƏ EDİLƏN MƏHSULLAR', fontSize: 9, bold: true, color: '#9ca3af', border: [false, false, false, false] },
     { text: '', border: [false, false, false, false] }],
    ...products.map(p => [
      { text: `${p.product_name} × ${p.quantity}`, fontSize: 11, border: [false, false, false, true], borderColor: ['', '', '', '#f3f4f6'], margin: [0, 3, 0, 3] },
      { text: fmt(p.sell_price * p.quantity), fontSize: 11, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f3f4f6'], margin: [0, 3, 0, 3] },
    ]),
  ]
  if (!products.length) {
    productsBody.push([{ text: 'Məhsul yoxdur', fontSize: 11, color: '#9ca3af', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }])
  }

  content.push({
    columns: [
      { table: { widths: ['*', 'auto'], body: servicesBody }, layout: { hLineColor: () => '#f3f4f6', vLineWidth: () => 0 }, margin: [0, 0, 12, 0] },
      { table: { widths: ['*', 'auto'], body: productsBody }, layout: { hLineColor: () => '#f3f4f6', vLineWidth: () => 0 } },
    ],
    margin: [0, 0, 0, 14],
  })

  // ── Total + payment ───────────────────────────────────────
  content.push(divider())
  content.push({
    columns: [
      { text: 'Ümumi məbləğ', fontSize: 14, bold: true },
      { text: fmt(grandTotal), fontSize: 14, bold: true, alignment: 'right' },
    ],
    margin: [0, 0, 0, 8],
  })
  content.push({
    table: {
      widths: ['*', 'auto'],
      body: [[
        { text: paymentLabel, fontSize: 12, bold: true, color: paymentColor, border: [false, false, false, false], margin: [10, 8, 0, 8] },
        order.payment_status !== 'unpaid'
          ? { text: fmt(paidAmount), fontSize: 14, bold: true, color: paymentColor, alignment: 'right', border: [false, false, false, false], margin: [0, 8, 10, 8] }
          : { text: '', border: [false, false, false, false] },
      ]],
    },
    layout: { fillColor: () => order.payment_status === 'paid' ? '#f0fdf4' : order.payment_status === 'partial' ? '#fffbeb' : '#fef2f2' },
    margin: [0, 0, 0, 14],
  })

  // ── Customer ──────────────────────────────────────────────
  if (customerName || order.customer_phone) {
    content.push({ text: 'MÜŞTƏRİ', fontSize: 9, bold: true, color: '#9ca3af', margin: [0, 0, 0, 6] })
    content.push({
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            customerName ? { text: customerName, fontSize: 12 } : null,
            order.customer_phone ? { text: order.customer_phone, fontSize: 12, color: '#6b7280' } : null,
          ].filter(Boolean),
          fillColor: '#f9fafb', border: [false, false, false, false], margin: [12, 10, 12, 10],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    })
  }

  // ── Notes ─────────────────────────────────────────────────
  if (order.notes) {
    content.push({ text: 'ƏLAVƏ QEYDLƏR', fontSize: 9, bold: true, color: '#9ca3af', margin: [0, 0, 0, 6] })
    content.push({
      table: {
        widths: ['*'],
        body: [[{ text: order.notes, fontSize: 12, color: '#92400e', fillColor: '#fffbeb', border: [false, false, false, false], margin: [12, 10, 12, 10] }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    })
  }

  // ── Mechanic ──────────────────────────────────────────────
  if (order.mechanic_name || order.mechanic_email) {
    content.push({ text: 'USTA', fontSize: 9, bold: true, color: '#9ca3af', margin: [0, 0, 0, 6] })
    content.push({
      table: {
        widths: ['*'],
        body: [[{ text: order.mechanic_name ?? order.mechanic_email ?? '', fontSize: 12, fillColor: '#f9fafb', border: [false, false, false, false], margin: [12, 10, 12, 10] }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    })
  }

  // ── Footer ────────────────────────────────────────────────
  content.push(divider())
  content.push({
    text: `Bu sənəd avtomatik yaradılmışdır · ${new Date().toLocaleDateString('az-AZ')}`,
    fontSize: 10, color: '#9ca3af', alignment: 'center', margin: [0, 4, 0, 0],
  })

  pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 12, color: '#111827' },
    content,
  }).download(`Sifaris_${order.id}_${order.plate_number}.pdf`)
}
