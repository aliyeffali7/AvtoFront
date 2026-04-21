import { Order, Business } from '@/types'

function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₼'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function printOrderPDF(order: Order, business?: Business | null) {
  const services = order.services ?? []
  const products = order.products ?? []
  const servicesTotal = services.reduce((s, t) => s + parseFloat(String(t.price)), 0)
  const productsTotal = products.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal = servicesTotal + productsTotal
  const paidAmount = Number(order.paid_amount ?? 0)
  const debt = grandTotal - paidAmount

  const customerName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')

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

  const html = `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <title>Sifariş #${order.id} — ${order.plate_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #111827; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .plate { font-size: 28px; font-weight: 800; font-family: monospace; letter-spacing: 0.08em; color: #111827; }
    .car-info { font-size: 16px; color: #374151; margin-top: 4px; }
    .meta { text-align: right; color: #6b7280; font-size: 13px; line-height: 1.6; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-done { background: #dcfce7; color: #166534; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 700; font-size: 16px; padding-top: 12px; border-top: 2px solid #e5e7eb; border-bottom: none; }
    .payment-row { margin-top: 16px; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .customer-block { background: #f9fafb; border-radius: 10px; padding: 14px 16px; }
    .customer-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 6px; }
    .customer-value { font-size: 14px; color: #111827; line-height: 1.8; }
    .description-block { background: #f9fafb; border-radius: 10px; padding: 14px 16px; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    .biz-header { display: flex; align-items: center; gap: 16px; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
    .biz-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
    .biz-logo-placeholder { width: 64px; height: 64px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .biz-name { font-size: 18px; font-weight: 800; color: #111827; line-height: 1.2; }
    .biz-meta { font-size: 13px; color: #6b7280; margin-top: 3px; line-height: 1.6; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>

  ${business ? `
  <div class="biz-header">
    ${business.logo
      ? `<img src="${business.logo.startsWith('http') ? business.logo : (import.meta.env.VITE_API_URL ?? '') + business.logo}" alt="Logo" class="biz-logo" />`
      : ''}
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
      <div style="margin-top:8px"><span class="badge badge-done">Tamamlandı</span></div>
    </div>
    <div class="meta">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:4px">Sifariş</div>
      <div style="font-size:20px;font-weight:800;color:#2563eb">#${order.id}</div>
      <div style="margin-top:6px">${fmtDate(order.created_at)}</div>
      <div>${order.estimated_days} gün</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Tapşırıq</div>
    <p style="color:#374151;line-height:1.6">${order.description}</p>
  </div>

  <div class="two-col" style="margin-bottom:22px">
    <div>
      <div class="section-title">İşlər və qiymətlər</div>
      <table>
        ${servicesRows}
      </table>
    </div>
    <div>
      <div class="section-title">İstifadə edilən məhsullar</div>
      <table>
        ${productsRows}
      </table>
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
      <span style="font-size:14px;font-weight:600;color:${paymentStatusColor}">${paymentStatusLabel}</span>
      ${order.payment_status !== 'unpaid' ? `<span style="font-size:16px;font-weight:800;color:${paymentStatusColor}">${fmt(paidAmount)}</span>` : ''}
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
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;color:#92400e;font-size:14px;line-height:1.6">${order.notes}</div>
  </div>` : ''}

  ${order.mechanic_name || order.mechanic_email ? `
  <div class="section">
    <div class="section-title">Usta</div>
    <div class="customer-block">
      <div class="customer-value">${order.mechanic_name ?? order.mechanic_email}</div>
    </div>
  </div>` : ''}

  <div class="footer">Bu sənəd avtomatik yaradılmışdır · ${new Date().toLocaleDateString('az-AZ')}</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}
