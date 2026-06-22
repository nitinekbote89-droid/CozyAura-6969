const SENDGRID_API = 'https://api.sendgrid.com/v3/mail/send';

function getFrom() {
  const name = import.meta.env.EMAIL_FROM_NAME || 'Lumière Soya Candles';
  const email = import.meta.env.EMAIL_FROM || 'lumiere@sendgrid.net';
  return { email, name };
}

function orderConfirmationHTML({ orderId, name, items, total, address }) {
  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e0d6;">${item.product_name} (${item.variant_name})</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e0d6; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e0d6; text-align: right;">₹${item.price}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table role="presentation" width="100%" style="background:#f5f0eb;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">LUMIERE</h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:20px;">Thank you, ${name}!</h2>
              <p style="margin:0 0 20px;color:#6b5d53;font-size:15px;line-height:1.5;">
                Your order <strong style="color:#1a1a2e;">${orderId}</strong> has been confirmed. We'll notify you when it ships.
              </p>

              <table role="presentation" width="100%" style="border-collapse:collapse;">
                <tr style="background:#f5f0eb;">
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b5d53;font-weight:normal;">Item</th>
                  <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b5d53;font-weight:normal;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b5d53;font-weight:normal;">Price</th>
                </tr>
                ${itemsRows}
              </table>

              <p style="text-align:right;font-size:16px;color:#1a1a2e;font-weight:bold;margin:16px 0 24px;">
                Total: ₹${total}
              </p>

              <hr style="border:none;border-top:1px solid #e8e0d6;margin:20px 0;">

              <h3 style="margin:0 0 8px;color:#1a1a2e;font-size:15px;">Shipping to</h3>
              <p style="margin:0;color:#6b5d53;font-size:14px;line-height:1.6;">
                ${address.fname} ${address.lname}<br>
                ${address.address}<br>
                ${address.city}, ${address.state} — ${address.pincode}<br>
                ${address.phone}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5f0eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#8c7d6e;font-size:12px;">Lumiere — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink }) {
  const trackSection = trackingLink
    ? `<a href="${trackingLink}" style="display:inline-block;background:#b8975a;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;margin-top:16px;">Track Your Order</a>`
    : trackingNumber
    ? `<p style="margin:8px 0 0;color:#6b5d53;font-size:14px;">Tracking No: <strong style="color:#1a1a2e;">${trackingNumber}</strong></p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table role="presentation" width="100%" style="background:#f5f0eb;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">LUMIERE</h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:20px;">Your order is on its way!</h2>
              <p style="margin:0 0 4px;color:#6b5d53;font-size:15px;line-height:1.5;">
                Hi ${name}, your order <strong style="color:#1a1a2e;">${orderId}</strong> has been shipped${courier ? ` via <strong>${courier}</strong>` : ''}.
              </p>
              <div style="text-align:center;">${trackSection}</div>
            </td>
          </tr>
          <tr>
            <td style="background:#f5f0eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#8c7d6e;font-size:12px;">Lumiere — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaSendGrid({ to, subject, html }) {
  const apiKey = import.meta.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set — email not sent');
    return false;
  }
  try {
    const from = getFrom();
    const res = await fetch(SENDGRID_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from,
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });
    if (res.ok) {
      console.log(`Email sent to ${to} (${subject})`);
      return true;
    } else {
      const data = await res.text();
      console.error(`SendGrid API error for ${to}:`, data);
      return false;
    }
  } catch (err) {
    console.error(`Failed to send email to ${to} (${subject}):`, err.message);
    return false;
  }
}

export async function sendOrderConfirmation({ email, name, orderId, items, total, address }) {
  return sendViaSendGrid({
    to: email,
    subject: `Order Confirmed — ${orderId}`,
    html: orderConfirmationHTML({ orderId, name, items, total, address })
  });
}

export async function sendOrderShipped({ email, name, orderId, trackingNumber, courier, trackingLink }) {
  return sendViaSendGrid({
    to: email,
    subject: `Order Shipped — ${orderId}`,
    html: orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink })
  });
}
