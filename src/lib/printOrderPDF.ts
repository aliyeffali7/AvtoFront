import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { Order, Business } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? pdfFonts

const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']

function fmt(n: number) {
  return n.toFixed(2) + ' ₼'
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

const BLUE   = '#2563eb'
const GRAY   = '#6b7280'
const DARK   = '#111827'
const GREEN  = '#16a34a'
const AMBER  = '#d97706'
const RED    = '#dc2626'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const MUTED  = '#9ca3af'

function line() {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER }],
    margin: [0, 10, 0, 14],
  }
}

function sectionLabel(text: string) {
  return { text, fontSize: 8, bold: true, color: MUTED, characterSpacing: 1, margin: [0, 0, 0, 6] }
}

function infoBox(lines: string[], color = DARK) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: lines.map(l => ({ text: l, fontSize: 11, color })),
        fillColor: LIGHT,
        border: [false, false, false, false],
        margin: [10, 8, 10, 8],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12],
  }
}

export async function printOrderPDF(order: Order, business?: Business | null) {
  const services  = order.services  ?? []
  const products  = order.products  ?? []
  const servicesTotal  = services.reduce((s, t) => s + parseFloat(String(t.price)), 0)
  const productsTotal  = products.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal     = servicesTotal + productsTotal
  const paidAmount     = Number(order.paid_amount ?? 0)
  const debt           = grandTotal - paidAmount
  const customerName   = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')

  const paymentLabel =
    order.payment_status === 'paid'    ? 'Tam ödənilib' :
    order.payment_status === 'partial' ? `Qismən ödənilib — borc: ${fmt(debt)}` :
                                         'Ödənilməyib'
  const paymentColor =
    order.payment_status === 'paid'    ? GREEN :
    order.payment_status === 'partial' ? AMBER : RED
  const paymentBg =
    order.payment_status === 'paid'    ? '#f0fdf4' :
    order.payment_status === 'partial' ? '#fffbeb' : '#fef2f2'

  // Logo → base64
  let logoDataUrl = ''
  if (business?.logo) {
    const fullUrl = business.logo.startsWith('http')
      ? business.logo
      : (import.meta.env.VITE_API_URL ?? '') + business.logo
    logoDataUrl = await toDataUrl(fullUrl)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // ── Business header ───────────────────────────────────────
  if (business) {
    if (logoDataUrl) {
      content.push({
        columns: [
          { image: logoDataUrl, width: 90 },
          {
            stack: [
              { text: business.name, fontSize: 15, bold: true, color: DARK },
              business.phone   ? { text: business.phone,   fontSize: 10, color: GRAY, margin: [0, 4, 0, 0] } : null,
              business.address ? { text: business.address, fontSize: 10, color: GRAY } : null,
            ].filter(Boolean),
            margin: [0, 8, 0, 0],
          },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 0],
      })
    } else {
      content.push({
        stack: [
          { text: business.name, fontSize: 15, bold: true, color: DARK },
          business.phone   ? { text: business.phone,   fontSize: 10, color: GRAY, margin: [0, 3, 0, 0] } : null,
          business.address ? { text: business.address, fontSize: 10, color: GRAY } : null,
        ].filter(Boolean),
      })
    }
    content.push(line())
  }

  // ── Order hero ────────────────────────────────────────────
  content.push({
    columns: [
      {
        stack: [
          { text: order.plate_number, fontSize: 28, bold: true, color: DARK, characterSpacing: 1 },
          { text: `${order.car_brand} ${order.car_model}`, fontSize: 13, color: '#374151', margin: [0, 4, 0, 6] },
          {
            table: { body: [[{ text: 'Tamamlandı', fontSize: 9, bold: true, color: '#166534', fillColor: '#dcfce7', margin: [8, 3, 8, 3], border: [false,false,false,false] }]] },
            layout: 'noBorders',
          },
        ],
      },
      {
        stack: [
          { text: 'SİFARİŞ', fontSize: 8, bold: true, color: MUTED, alignment: 'right', characterSpacing: 1 },
          { text: `#${order.id}`, fontSize: 22, bold: true, color: BLUE, alignment: 'right' },
          { text: fmtDate(order.created_at), fontSize: 10, color: GRAY, alignment: 'right', margin: [0, 6, 0, 2] },
          { text: `${order.estimated_days} gün`, fontSize: 10, color: GRAY, alignment: 'right' },
        ],
      },
    ],
    margin: [0, 0, 0, 0],
  })

  content.push(line())

  // ── Tapşırıq ──────────────────────────────────────────────
  if (order.description) {
    content.push(sectionLabel('TAPŞIRIQ'))
    content.push({ text: order.description, fontSize: 11, color: '#374151', lineHeight: 1.5, margin: [0, 0, 0, 14] })
  }

  // ── Services table ────────────────────────────────────────
  if (services.length > 0) {
    content.push(sectionLabel('İŞLƏR VƏ QİYMƏTLƏR'))
    content.push({
      table: {
        widths: ['*', 80],
        body: [
          ...services.map((s, i) => [
            { text: s.name, fontSize: 11, border: [false, false, false, i < services.length - 1], borderColor: ['','','',BORDER], margin: [0, 5, 0, 5] },
            { text: fmt(parseFloat(String(s.price))), fontSize: 11, alignment: 'right', border: [false, false, false, i < services.length - 1], borderColor: ['','','',BORDER], margin: [0, 5, 0, 5] },
          ]),
          [
            { text: 'Cəmi', bold: true, fontSize: 11, border: [false, true, false, false], borderColor: ['','',BORDER,''], margin: [0, 6, 0, 0] },
            { text: fmt(servicesTotal), bold: true, fontSize: 11, alignment: 'right', border: [false, true, false, false], borderColor: ['','',BORDER,''], margin: [0, 6, 0, 0] },
          ],
        ],
      },
      layout: { hLineColor: () => BORDER, vLineWidth: () => 0 },
      margin: [0, 0, 0, 14],
    })
  }

  // ── Products table ────────────────────────────────────────
  if (products.length > 0) {
    content.push(sectionLabel('İSTİFADƏ EDİLƏN MƏHSULLAR'))
    content.push({
      table: {
        widths: [30, '*', 60, 80],
        body: [
          [
            { text: '#',        fontSize: 9, bold: true, color: MUTED, border: [false,false,false,true], borderColor: ['','','',BORDER], margin: [0,0,0,4] },
            { text: 'Məhsul',   fontSize: 9, bold: true, color: MUTED, border: [false,false,false,true], borderColor: ['','','',BORDER], margin: [0,0,0,4] },
            { text: 'Ədəd',     fontSize: 9, bold: true, color: MUTED, alignment: 'center', border: [false,false,false,true], borderColor: ['','','',BORDER], margin: [0,0,0,4] },
            { text: 'Məbləğ',   fontSize: 9, bold: true, color: MUTED, alignment: 'right',  border: [false,false,false,true], borderColor: ['','','',BORDER], margin: [0,0,0,4] },
          ],
          ...products.map((p, i) => [
            { text: String(i + 1), fontSize: 11, color: GRAY, border: [false,false,false,i < products.length - 1], borderColor: ['','','',BORDER], margin: [0,5,0,5] },
            { text: p.product_name, fontSize: 11, border: [false,false,false,i < products.length - 1], borderColor: ['','','',BORDER], margin: [0,5,0,5] },
            { text: String(p.quantity), fontSize: 11, alignment: 'center', border: [false,false,false,i < products.length - 1], borderColor: ['','','',BORDER], margin: [0,5,0,5] },
            { text: fmt(p.sell_price * p.quantity), fontSize: 11, alignment: 'right', border: [false,false,false,i < products.length - 1], borderColor: ['','','',BORDER], margin: [0,5,0,5] },
          ]),
        ],
      },
      layout: { hLineColor: () => BORDER, vLineWidth: () => 0 },
      margin: [0, 0, 0, 14],
    })
  }

  // ── Grand total ───────────────────────────────────────────
  content.push(line())
  content.push({
    columns: [
      { text: 'Ümumi məbləğ', fontSize: 14, bold: true, color: DARK },
      { text: fmt(grandTotal), fontSize: 14, bold: true, color: DARK, alignment: 'right' },
    ],
    margin: [0, 0, 0, 10],
  })
  content.push({
    table: {
      widths: ['*', 'auto'],
      body: [[
        { text: paymentLabel, fontSize: 12, bold: true, color: paymentColor, fillColor: paymentBg, border: [false,false,false,false], margin: [12, 9, 0, 9] },
        order.payment_status !== 'unpaid'
          ? { text: fmt(paidAmount), fontSize: 13, bold: true, color: paymentColor, fillColor: paymentBg, alignment: 'right', border: [false,false,false,false], margin: [0, 9, 12, 9] }
          : { text: '', fillColor: paymentBg, border: [false,false,false,false] },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 16],
  })

  // ── Customer ──────────────────────────────────────────────
  if (customerName || order.customer_phone) {
    content.push(sectionLabel('MÜŞTƏRİ'))
    const lines: string[] = []
    if (customerName)        lines.push(customerName)
    if (order.customer_phone) lines.push(order.customer_phone)
    content.push(infoBox(lines))
  }

  // ── Notes ─────────────────────────────────────────────────
  if (order.notes) {
    content.push(sectionLabel('ƏLAVƏ QEYDLƏR'))
    content.push(infoBox([order.notes], '#92400e'))
  }

  // ── Mechanic ──────────────────────────────────────────────
  if (order.mechanic_name || order.mechanic_email) {
    content.push(sectionLabel('USTA'))
    content.push(infoBox([order.mechanic_name ?? order.mechanic_email ?? '']))
  }

  // ── Footer ────────────────────────────────────────────────
  content.push(line())
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
