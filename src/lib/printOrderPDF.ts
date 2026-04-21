import html2pdf from 'html2pdf.js'
import { Order, Business } from '@/types'

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

export async function printOrderPDF(order: Order, business?: Business | null) {
  const services = order.services ?? []
  const products = order.products ?? []
  const servicesTotal = services.reduce((s, t) => s + parseFloat(String(t.price)), 0)
  const productsTotal = products.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal = servicesTotal + productsTotal
  const paidAmount = Number(order.paid_amount ?? 0)
  const debt = grandTotal - paidAmount

  const customerName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')

  // Resolve logo to base64 so html2canvas can render it without CORS issues
  let logoDataUrl = ''
  if (business?.logo) {
    const fullUrl = business.logo.startsWith('http')
      ? business.logo
      : (import.meta.env.VITE_API_URL ?? '') + business.logo
    logoDataUrl = await toDataUrl(fullUrl)
  }

  const servicesRows = services.length
    ? services.map(s => `
        <tr>
          <td>${s.name}</td>
          <td style="text-align:right">${fmt(parseFloat(String(s.price)))}</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="color:#9ca3af">İş qeyd edilməyib</td></tr>'

  const productsRows = products.length
    ? products.map(p => `
        <tr>
          <td>${p.product_name} <span style="color:#9ca3af;font-size:12px">× ${p.quantity}</span></td>
          <td style="text-align:right">${fmt(p.sell_price * p.quantity)}</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="color:#9ca3af">Məhsul yoxdur</td></tr>'

  const paymentStatusLabel =
    order.payment_status === 'paid' ? 'Tam ödənilib' :
    order.payment_status === 'partial' ? `Qismən ödənilib (Borc: ${fmt(debt)})` :
    'Ödənilməyib'

  const paymentStatusColor =
    order.payment_status === 'paid' ? '#16a34a' :
    order.payment_status === 'partial' ? '#d97706' :
    '#dc2626'

  const content = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111827; background: #fff; }
    .wrap { padding: 28px; }
    .biz-header { display: flex; align-items: center; gap: 14px; padding-bottom: 18px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .biz-logo { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
    .biz-name { font-size: 17px; font-weight: 800; color: #111827; }
    .biz-meta { font-size: 12px; color: #6b7280; margin-top: 3px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 2px solid #e5e7eb; }
    .plate { font-size: 26px; font-weight: 800; font-family: monospace; letter-spacing: 0.08em; color: #111827; }
    .car-info { font-size: 14px; color: #374151; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; margin-top: 8px; }
    .meta { text-align: right; color: #6b7280; font-size: 12px; line-height: 1.6; }
    .order-num { font-size: 20px; font-weight: 800; color: #2563eb; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 700; font-size: 15px; padding-top: 10px; border-top: 2px solid #e5e7eb; border-bottom: none; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
    .payment-row { margin-top: 12px; padding: 10px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .customer-block { background: #f9fafb; border-radius: 8px; padding: 12px 14px; }
    .customer-value { font-size: 13px; color: #111827; line-height: 1.8; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
  </style>

  <div class="wrap">
    ${business ? `
    <div class="biz-header">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="biz-logo" />` : ''}
      <div>
        <div class="biz-name">${business.name}</div>
        <div class="biz-meta">
          ${business.phone ? `<div>${business.phone}</div>` : ''}
          ${business.address ? `<div>${business.address}</div>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div class="header">
      <div>
        <div class="plate">${order.plate_number}</div>
        <div class="car-info">${order.car_brand} ${order.car_model}</div>
        <div><span class="badge">Tamamlandı</span></div>
      </div>
      <div class="meta">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:3px">Sifariş</div>
        <div class="order-num">#${order.id}</div>
        <div style="margin-top:5px">${fmtDate(order.created_at)}</div>
        <div>${order.estimated_days} gün</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Tapşırıq</div>
      <p style="color:#374151;line-height:1.6;font-size:13px">${order.description}</p>
    </div>

    <div class="two-col">
      <div>
        <div class="section-title">İşlər və qiymətlər</div>
        <table>${servicesRows}</table>
      </div>
      <div>
        <div class="section-title">İstifadə edilən məhsullar</div>
        <table>${productsRows}</table>
      </div>
    </div>

    <div class="section">
      <table>
        <tr class="total-row">
          <td>Ümumi məbləğ</td>
          <td style="text-align:right">${fmt(grandTotal)}</td>
        </tr>
      </table>
      <div class="payment-row" style="background:${order.payment_status === 'paid' ? '#f0fdf4' : order.payment_status === 'partial' ? '#fffbeb' : '#fef2f2'}">
        <span style="font-size:13px;font-weight:600;color:${paymentStatusColor}">${paymentStatusLabel}</span>
        ${order.payment_status !== 'unpaid' ? `<span style="font-size:15px;font-weight:800;color:${paymentStatusColor}">${fmt(paidAmount)}</span>` : ''}
      </div>
    </div>

    ${(customerName || order.customer_phone) ? `
    <div class="section">
      <div class="section-title">Müştəri</div>
      <div class="customer-block">
        <div class="customer-value">
          ${customerName ? `<div>${customerName}</div>` : ''}
          ${order.customer_phone ? `<div>${order.customer_phone}</div>` : ''}
        </div>
      </div>
    </div>` : ''}

    ${order.notes ? `
    <div class="section">
      <div class="section-title">Əlavə qeydlər</div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;color:#92400e;font-size:13px;line-height:1.6">${order.notes}</div>
    </div>` : ''}

    ${order.mechanic_name || order.mechanic_email ? `
    <div class="section">
      <div class="section-title">Usta</div>
      <div class="customer-block">
        <div class="customer-value">${order.mechanic_name ?? order.mechanic_email}</div>
      </div>
    </div>` : ''}

    <div class="footer">Bu sənəd avtomatik yaradılmışdır · ${new Date().toLocaleDateString('az-AZ')}</div>
  </div>`

  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  el.style.top = '0'
  el.style.width = '794px'
  el.innerHTML = content
  document.body.appendChild(el)

  await html2pdf()
    .set({
      margin: 0,
      filename: `Sifaris_${order.id}_${order.plate_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(el)
    .save()

  document.body.removeChild(el)
}
