import { OrderRecord, StoreProfile } from '../types';

/**
 * Robust Thermal POS Receipt Printer for SS Café and Restaurant
 * Generates an isolated thermal receipt DOM and triggers reliable printing across
 * all desktop, mobile, tablet, and iframe browsers.
 */
export function printThermalReceipt(
  order: OrderRecord,
  storeProfile: StoreProfile,
  onToast?: (msg: string) => void
): boolean {
  if (!order || !storeProfile) {
    if (onToast) onToast('Cannot print: Order details missing.');
    return false;
  }

  const currency = storeProfile.currencySymbol || '₹';
  const logoHtml = storeProfile.logoUrl
    ? `<img src="${storeProfile.logoUrl}" alt="${storeProfile.name}" style="max-height: 50px; max-width: 120px; object-fit: contain; margin: 0 auto 6px; display: block;" />`
    : '';

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px dotted #bbb;">
        <td style="padding: 4px 0; font-weight: bold; vertical-align: top; width: 15%;">${item.quantity || 1}x</td>
        <td style="padding: 4px 0; vertical-align: top; width: 55%; text-align: left;">
          <div>${item.name || 'Item'}</div>
          ${
            item.customizationSummary
              ? `<div style="font-size: 10px; color: #555;">• ${item.customizationSummary}</div>`
              : ''
          }
        </td>
        <td style="padding: 4px 0; text-align: right; font-weight: bold; vertical-align: top; width: 30%;">
          ${currency}${(item.totalPrice || 0).toFixed(2)}
        </td>
      </tr>`
    )
    .join('');

  const discountHtml =
    order.bill && order.bill.discount > 0
      ? `
      <tr>
        <td colspan="2" style="padding: 2px 0; text-align: left;">Discount:</td>
        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #b00;">-${currency}${order.bill.discount.toFixed(2)}</td>
      </tr>`
      : '';

  const serviceFeeHtml =
    order.bill && order.bill.serviceCharge > 0
      ? `
      <tr>
        <td colspan="2" style="padding: 2px 0; text-align: left;">Service Fee:</td>
        <td style="padding: 2px 0; text-align: right;">${currency}${order.bill.serviceCharge.toFixed(2)}</td>
      </tr>`
      : '';

  const paymentStatusHtml =
    order.status === 'settled' || Boolean(order.bill?.settledAt)
      ? `<div style="margin: 8px 0; padding: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 11px; font-weight: bold; color: #166534; text-align: center;">
          ✓ PAID &amp; SETTLED via ${order.bill?.paymentMethod || 'Online / Cash'}
          ${order.bill?.settledAt ? `<div style="font-size: 9px; font-weight: normal; color: #444;">Settled at: ${order.bill.settledAt}</div>` : ''}
        </div>`
      : `<div style="margin: 8px 0; padding: 6px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 11px; font-weight: bold; color: #92400e; text-align: center;">
          PENDING PAYMENT
        </div>`;

  const upiInfoHtml = storeProfile.upiId
    ? `<div style="margin: 6px 0; font-size: 10px; color: #333; text-align: center; border-top: 1px dashed #ccc; padding-top: 6px;">
        <strong>UPI ID: ${storeProfile.upiId}</strong><br/>
        <span style="font-size: 9px; color: #666;">Pay via GPay / PhonePe / Paytm</span>
       </div>`
    : '';

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @page {
            size: auto;
            margin: 4mm 6mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            padding: 10px;
            max-width: 320px;
            margin: 0 auto;
          }
          .receipt-box {
            text-align: center;
          }
          .header-title {
            font-size: 16px;
            font-weight: 900;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .header-sub {
            font-size: 10px;
            color: #444;
            margin-bottom: 2px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          .info-table {
            width: 100%;
            font-size: 11px;
            margin: 4px 0;
          }
          .items-table {
            width: 100%;
            font-size: 11px;
            border-collapse: collapse;
            margin: 6px 0;
          }
          .totals-table {
            width: 100%;
            font-size: 11px;
            margin: 6px 0;
          }
          .grand-total {
            font-size: 15px;
            font-weight: 900;
          }
          .footer-note {
            font-size: 11px;
            font-style: italic;
            margin-top: 10px;
            text-align: center;
          }
          @media print {
            body {
              padding: 0;
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          ${logoHtml}
          <div class="header-title">${storeProfile.name}</div>
          ${storeProfile.address ? `<div class="header-sub">${storeProfile.address}</div>` : ''}
          ${storeProfile.phone ? `<div class="header-sub">Phone: ${storeProfile.phone}</div>` : ''}
          
          <div class="divider"></div>
          
          <table class="info-table">
            <tr>
              <td style="text-align: left; font-weight: bold;">Receipt: ${order.orderNumber}</td>
              <td style="text-align: right; font-weight: bold;">Table #${order.tableNumber}</td>
            </tr>
            <tr>
              <td style="text-align: left; color: #555; font-size: 10px;">${order.createdAt || new Date().toLocaleTimeString()}</td>
              <td style="text-align: right; color: #555; font-size: 10px;">Zone: ${order.diningZone || 'Dining'}</td>
            </tr>
            ${
              order.customerName
                ? `<tr><td colspan="2" style="text-align: left; font-size: 10px; padding-top: 2px;">Guest: <strong>${order.customerName}</strong></td></tr>`
                : ''
            }
          </table>

          <div class="divider"></div>

          <table class="items-table">
            <thead>
              <tr style="border-bottom: 1px solid #000; font-weight: bold;">
                <th style="text-align: left; padding-bottom: 3px;">Qty</th>
                <th style="text-align: left; padding-bottom: 3px;">Item</th>
                <th style="text-align: right; padding-bottom: 3px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <table class="totals-table">
            <tr>
              <td colspan="2" style="text-align: left;">Subtotal:</td>
              <td style="text-align: right;">${currency}${(order.bill?.subtotal || 0).toFixed(2)}</td>
            </tr>
            ${discountHtml}
            <tr>
              <td colspan="2" style="text-align: left;">Tax (${storeProfile.taxRate || 5}%):</td>
              <td style="text-align: right;">${currency}${(order.bill?.tax || 0).toFixed(2)}</td>
            </tr>
            ${serviceFeeHtml}
            <tr>
              <td colspan="3"><div class="double-divider"></div></td>
            </tr>
            <tr class="grand-total">
              <td colspan="2" style="text-align: left;">GRAND TOTAL:</td>
              <td style="text-align: right;">${currency}${(order.bill?.total || 0).toFixed(2)}</td>
            </tr>
          </table>

          ${paymentStatusHtml}
          ${upiInfoHtml}

          <div class="footer-note">
            Thank you for dining with ${storeProfile.name}!
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Remove any previously created print iframes
    const oldFrame = document.getElementById('thermal-print-iframe');
    if (oldFrame) {
      oldFrame.remove();
    }

    // Create a hidden iframe for isolated clean thermal printing
    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '350px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(receiptHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          if (onToast) onToast(`🖨️ Bill ${order.orderNumber} sent to printer!`);
        } catch (printErr) {
          console.warn('Iframe print blocked, falling back to window.print():', printErr);
          window.print();
          if (onToast) onToast(`🖨️ Opening print dialog...`);
        }
      }, 250);

      return true;
    } else {
      window.print();
      if (onToast) onToast(`🖨️ Opening print dialog...`);
      return true;
    }
  } catch (err) {
    console.error('Print failed:', err);
    try {
      window.print();
      if (onToast) onToast(`🖨️ Opening print dialog...`);
      return true;
    } catch {
      if (onToast) onToast('Print blocked by browser. Please use system print.');
      return false;
    }
  }
}
