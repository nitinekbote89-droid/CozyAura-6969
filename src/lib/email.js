const SENDGRID_API = 'https://api.sendgrid.com/v3/mail/send';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

function getFrom() {
  const name = import.meta.env.EMAIL_FROM_NAME || 'CozyAura Soya Candles';
  const email = import.meta.env.EMAIL_FROM || 'cozyaura@sendgrid.net';
  return { email, name };
}

function orderConfirmationHTML({ orderId, name, items, subtotal, discount, shipping, total, address }) {
  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e0d6;">${item.product_name} (${item.variant_name})</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e0d6; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e0d6; text-align: right;">₹${item.price}</td>
    </tr>
  `).join('');

  const discountRow = discount > 0
    ? `<tr><td style="padding:6px 12px;color:#6b5d53;font-size:14px;">Discount</td><td style="padding:6px 12px;text-align:right;color:#c0392b;font-size:14px;">-₹${discount}</td></tr>`
    : '';
  const shippingRow = shipping > 0
    ? `<tr><td style="padding:6px 12px;color:#6b5d53;font-size:14px;">Shipping</td><td style="padding:6px 12px;text-align:right;color:#6b5d53;font-size:14px;">₹${shipping}</td></tr>`
    : `<tr><td style="padding:6px 12px;color:#6b5d53;font-size:14px;">Shipping</td><td style="padding:6px 12px;text-align:right;color:#27ae60;font-size:14px;">Free</td></tr>`;

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
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">COZY<span style="font-style:italic;">AURA</span></h1>
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

              <table role="presentation" width="100%" style="margin-top:16px;">
                <tr><td style="padding:6px 12px;color:#6b5d53;font-size:14px;">Subtotal</td><td style="padding:6px 12px;text-align:right;color:#1a1a2e;font-size:14px;">₹${subtotal}</td></tr>
                ${discountRow}
                ${shippingRow}
                <tr><td style="padding:6px 12px;border-top:2px solid #1a1a2e;color:#1a1a2e;font-size:16px;font-weight:bold;">Total</td><td style="padding:6px 12px;border-top:2px solid #1a1a2e;text-align:right;color:#1a1a2e;font-size:16px;font-weight:bold;">₹${total}</td></tr>
              </table>

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
              <p style="margin:0;color:#8c7d6e;font-size:12px;">CozyAura — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink, deliveryMethod, siteOrigin }) {
  const isPickup = deliveryMethod === 'Pickup';
  const base = siteOrigin || 'https://cozyaura.in';

  if (isPickup) {
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
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">COZY<span style="font-style:italic;">AURA</span></h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:20px;">Your order is ready for pickup!</h2>
              <p style="margin:0 0 16px;color:#6b5d53;font-size:15px;line-height:1.5;">
                Hi ${name}, your order <strong style="color:#1a1a2e;">${orderId}</strong> is ready for pickup at Cozy Aura Studio.
              </p>
              <div style="background:#fcf9f5; border:1px solid #e8e0d6; padding:16px; border-radius:6px; margin-top:16px;">
                <p style="margin:0 0 8px; color:#1a1a2e; font-size:14px; font-weight:bold;">Pickup Location:</p>
                <p style="margin:0 0 16px; color:#6b5d53; font-size:14px; line-height:1.4;">
                  Cozy Aura Studio (2nd floor),<br>
                  above Vikrant Agencies, Subhash Chowk,<br>
                  Gunj Golai, Latur - 413512,<br>
                  Maharashtra, India
                </p>
                <p style="margin:0 0 8px; color:#1a1a2e; font-size:14px; font-weight:bold;">Pickup Hours:</p>
                <p style="margin:0; color:#6b5d53; font-size:14px;">
                  Mon - Sat, 11:00 AM - 7:00 PM
                </p>
              </div>
              <div style="text-align:center; margin-top:24px;">
                <a href="https://cozyaura-6969-production.up.railway.app/?page=ordersPage" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Go to Your Orders</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f5f0eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#8c7d6e;font-size:12px;">CozyAura — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  const trackSection = `
    <div style="margin-top:16px; text-align:center;">
      <a href="https://cozyaura-6969-production.up.railway.app/?page=ordersPage" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Go to Your Orders</a>
    </div>
  `;

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
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">COZY<span style="font-style:italic;">AURA</span></h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:20px;">Your order is on its way!</h2>
              <p style="margin:0 0 4px;color:#6b5d53;font-size:15px;line-height:1.5;">
                Hi ${name}, your order <strong style="color:#1a1a2e;">${orderId}</strong> has been shipped.
              </p>
              ${trackSection}
            </td>
          </tr>
          <tr>
            <td style="background:#f5f0eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#8c7d6e;font-size:12px;">CozyAura — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaBrevo({ to, subject, html }) {
  const apiKey = import.meta.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY not set — trying SendGrid fallback');
    return false;
  }
  try {
    const from = getFrom();
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      })
    });
    if (res.ok) {
      console.log(`Email sent via Brevo to ${to} (${subject})`);
      return true;
    } else {
      const data = await res.text();
      console.error(`Brevo API error for ${to}:`, data);
      return false;
    }
  } catch (err) {
    console.error(`Failed to send email via Brevo to ${to} (${subject}):`, err.message);
    return false;
  }
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
      console.log(`Email sent via SendGrid to ${to} (${subject})`);
      return true;
    } else {
      const data = await res.text();
      console.error(`SendGrid API error for ${to}:`, data);
      return false;
    }
  } catch (err) {
    console.error(`Failed to send email via SendGrid to ${to} (${subject}):`, err.message);
    return false;
  }
}

async function sendEmail({ to, subject, html }) {
  if (import.meta.env.BREVO_API_KEY) {
    const success = await sendViaBrevo({ to, subject, html });
    if (success) return true;
  }
  return sendViaSendGrid({ to, subject, html });
}

export async function sendOrderConfirmation({ email, name, orderId, items, subtotal, discount, shipping, total, address }) {
  return sendEmail({
    to: email,
    subject: `Order Confirmed — ${orderId}`,
    html: orderConfirmationHTML({ orderId, name, items, subtotal, discount, shipping, total, address })
  });
}

export async function sendOrderShipped({ email, name, orderId, trackingNumber, courier, trackingLink, deliveryMethod, siteOrigin }) {
  const isPickup = deliveryMethod === 'Pickup';
  const subject = isPickup ? `Order Ready for Pickup — ${orderId}` : `Order Shipped — ${orderId}`;
  return sendEmail({
    to: email,
    subject,
    html: orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink, deliveryMethod, siteOrigin })
  });
}

export async function sendContactMessage({ name, email, subject, message }) {
  const ownerEmail = import.meta.env.STORE_OWNER_EMAIL || 'nitinekbote89@gmail.com';
  return sendEmail({
    to: ownerEmail,
    subject: `Contact: ${subject}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message}</p>`
  });
}
