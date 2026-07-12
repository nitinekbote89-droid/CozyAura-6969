


function orderConfirmationHTML({ orderId, name, items, subtotal, discount, shipping, total, address, siteOrigin, giftCardFee = 0 }) {
  const base = siteOrigin || 'https://cozyaura-6969-production.up.railway.app';
  const formattedOrderId = String(orderId).startsWith('#') ? orderId : `#${orderId}`;
  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; color: #222222;">${item.product_name} (${item.variant_name})</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: center; color: #222222;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #222222;">₹${item.price}</td>
    </tr>
  `).join('');

  const giftCardRow = parseFloat(giftCardFee) > 0
    ? `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Personalized Gift Card</td><td style="padding:6px 12px;text-align:right;color:#222222;font-size:14px;">₹${parseFloat(giftCardFee).toFixed(2)}</td></tr>`
    : '';

  const discountRow = discount > 0
    ? `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Discount</td><td style="padding:6px 12px;text-align:right;color:#c0392b;font-size:14px;">-₹${discount}</td></tr>`
    : '';
  const shippingRow = shipping > 0
    ? `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Shipping</td><td style="padding:6px 12px;text-align:right;color:#222222;font-size:14px;">₹${shipping}</td></tr>`
    : `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Shipping</td><td style="padding:6px 12px;text-align:right;color:#27ae60;font-size:14px;font-weight:bold;">Free</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:Georgia,serif;color:#222222;">
  <table role="presentation" width="100%" style="background:#fafaf8;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #e0e0e0;">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">COZY<span style="font-style:italic;">AURA</span></h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;background:#ffffff;">
              <h2 style="margin:0 0 6px;color:#222222;font-size:20px;">Thank you, ${name}!</h2>
              <p style="margin:0 0 16px;color:#555555;font-size:15px;line-height:1.5;">
                Your order <strong style="color:#222222;">${formattedOrderId}</strong> has been confirmed. We'll notify you when it ships.
              </p>

              <table role="presentation" width="100%" style="border-collapse:collapse;">
                <tr style="background:#fafaf8;">
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#555555;font-weight:normal;">Item</th>
                  <th style="padding:10px 12px;text-align:center;font-size:13px;color:#555555;font-weight:normal;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:13px;color:#555555;font-weight:normal;">Price</th>
                </tr>
                ${itemsRows}
              </table>

              <table role="presentation" width="100%" style="margin-top:16px;">
                <tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Subtotal</td><td style="padding:6px 12px;text-align:right;color:#222222;font-size:14px;">₹${subtotal}</td></tr>
                ${giftCardRow}
                ${discountRow}
                ${shippingRow}
                <tr><td style="padding:6px 12px;border-top:2px solid #222222;color:#222222;font-size:16px;font-weight:bold;">Total</td><td style="padding:6px 12px;border-top:2px solid #222222;text-align:right;color:#222222;font-size:16px;font-weight:bold;">₹${total}</td></tr>
              </table>

              <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">

              <h3 style="margin:0 0 8px;color:#222222;font-size:15px;">Shipping to</h3>
              <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;">
                ${address.fname} ${address.lname}<br>
                ${address.address}<br>
                ${address.city}, ${address.state} — ${address.pincode}<br>
                ${address.phone}
              </p>

              <div style="text-align:center; margin-top:24px;">
                <a href="${base}/?page=ordersPage" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Go to Your Orders</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fafaf8;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#777777;font-size:12px;">CozyAura — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink, deliveryMethod, siteOrigin, items, subtotal, discount, shipping, total, address, giftCardFee = 0 }) {
  const isPickup = deliveryMethod === 'Pickup';
  const base = siteOrigin || 'https://cozyaura-6969-production.up.railway.app';
  const formattedOrderId = String(orderId).startsWith('#') ? orderId : `#${orderId}`;

  const hasDetails = items && items.length > 0;
  
  let detailsHtml = '';
  if (hasDetails) {
    const itemsRows = items.map(item => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; color: #222222;">${item.product_name} (${item.variant_name})</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: center; color: #222222;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #222222;">₹${item.price}</td>
      </tr>
    `).join('');

    const giftCardRow = parseFloat(giftCardFee) > 0
      ? `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Personalized Gift Card</td><td style="padding:6px 12px;text-align:right;color:#222222;font-size:14px;">₹${parseFloat(giftCardFee).toFixed(2)}</td></tr>`
      : '';

    const discountRow = parseFloat(discount) > 0
      ? `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Discount</td><td style="padding:6px 12px;text-align:right;color:#c0392b;font-size:14px;">-₹${discount}</td></tr>`
      : '';
    const shippingRow = parseFloat(shipping) > 0
      ? `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Shipping</td><td style="padding:6px 12px;text-align:right;color:#222222;font-size:14px;">₹${shipping}</td></tr>`
      : `<tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Shipping</td><td style="padding:6px 12px;text-align:right;color:#27ae60;font-size:14px;font-weight:bold;">Free</td></tr>`;

    detailsHtml = `
      <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:16px;">
        <tr style="background:#fafaf8;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#555555;font-weight:normal;">Item</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#555555;font-weight:normal;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#555555;font-weight:normal;">Price</th>
        </tr>
        ${itemsRows}
      </table>

      <table role="presentation" width="100%" style="margin-top:16px;">
        <tr><td style="padding:6px 12px;color:#555555;font-size:14px;">Subtotal</td><td style="padding:6px 12px;text-align:right;color:#222222;font-size:14px;">₹${subtotal}</td></tr>
        ${giftCardRow}
        ${discountRow}
        ${shippingRow}
        <tr><td style="padding:6px 12px;border-top:2px solid #222222;color:#222222;font-size:16px;font-weight:bold;">Total</td><td style="padding:6px 12px;border-top:2px solid #222222;text-align:right;color:#222222;font-size:16px;font-weight:bold;">₹${total}</td></tr>
      </table>

      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
    `;
  }

  if (isPickup) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:Georgia,serif;color:#222222;">
  <table role="presentation" width="100%" style="background:#fafaf8;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #e0e0e0;">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">COZY<span style="font-style:italic;">AURA</span></h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;background:#ffffff;">
              <h2 style="margin:0 0 6px;color:#222222;font-size:20px;">Your order is ready for pickup!</h2>
              <p style="margin:0 0 16px;color:#555555;font-size:15px;line-height:1.5;">
                Hi ${name}, your order <strong style="color:#222222;">${formattedOrderId}</strong> is ready for pickup at Cozy Aura Studio.
              </p>

              ${detailsHtml}

              <div style="background:#fafaf8; border:1px solid #e0e0e0; padding:16px; border-radius:6px; margin-top:16px; color:#222222;">
                <p style="margin:0 0 8px; color:#222222; font-size:14px; font-weight:bold;">Pickup Location:</p>
                <p style="margin:0 0 16px; color:#555555; font-size:14px; line-height:1.4;">
                  Cozy Aura Studio (2nd floor),<br>
                  above Vikrant Agencies, Subhash Chowk,<br>
                  Gunj Golai, Latur - 413512,<br>
                  Maharashtra, India<br>
                  Phone: +91 97303 18661
                </p>
                <p style="margin:0 0 8px; color:#222222; font-size:14px; font-weight:bold;">Pickup Hours:</p>
                <p style="margin:0; color:#555555; font-size:14px;">
                  Mon - Sat, 11:00 AM - 7:00 PM
                </p>
              </div>
              <div style="text-align:center; margin-top:24px;">
                <a href="${base}/?page=ordersPage" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Go to Your Orders</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fafaf8;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#777777;font-size:12px;">CozyAura — handcrafted with care</p>
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
    <div style="margin-top:24px; text-align:center;">
      <a href="${base}/?page=ordersPage" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Go to Your Orders</a>
    </div>
  `;

  let shippingInfoHtml = '';
  if (hasDetails && address) {
    shippingInfoHtml = `
      <h3 style="margin:20px 0 8px;color:#222222;font-size:15px;">Shipping to</h3>
      <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;">
        ${address.fname} ${address.lname}<br>
        ${address.address}<br>
        ${address.city}, ${address.state} — ${address.pincode}<br>
        ${address.phone}
      </p>
    `;
  }

  let trackingCardHtml = '';
  if (trackingNumber || courier) {
    trackingCardHtml = `
      <div style="background:#fafaf8; border:1px solid #e0e0e0; padding:16px; border-radius:6px; margin-top:16px; color:#222222;">
        <p style="margin:0 0 8px; color:#222222; font-size:14px; font-weight:bold;">Tracking Information:</p>
        <p style="margin:0 0 8px; color:#555555; font-size:14px;"><strong>Courier Partner:</strong> ${courier || 'N/A'}</p>
        <p style="margin:0 0 8px; color:#555555; font-size:14px;"><strong>Tracking Number:</strong> ${trackingNumber || 'N/A'}</p>
        ${trackingLink ? `<p style="margin:8px 0 0; color:#555555; font-size:14px;"><a href="${trackingLink}" target="_blank" style="color:var(--gold-dark);font-weight:bold;text-decoration:none;">Click here to track your package</a></p>` : ''}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:Georgia,serif;color:#222222;">
  <table role="presentation" width="100%" style="background:#fafaf8;padding:30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #e0e0e0;">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#b8975a;font-size:22px;letter-spacing:2px;">COZY<span style="font-style:italic;">AURA</span></h1>
              <p style="margin:4px 0 0;color:#a09080;font-size:13px;">Handcrafted Soya Candles</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;background:#ffffff;">
              <h2 style="margin:0 0 6px;color:#222222;font-size:20px;">Your order is on its way!</h2>
              <p style="margin:0 0 16px;color:#555555;font-size:15px;line-height:1.5;">
                Hi ${name}, your order <strong style="color:#222222;">${formattedOrderId}</strong> has been shipped.
              </p>

              ${detailsHtml}
              ${shippingInfoHtml}
              ${trackingCardHtml}
              ${trackSection}
            </td>
          </tr>
          <tr>
            <td style="background:#fafaf8;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#777777;font-size:12px;">CozyAura — handcrafted with care</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}



async function sendViaSMTP({ to, subject, html }) {
  const host = import.meta.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(import.meta.env.SMTP_PORT || '465', 10);
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('SMTP credentials (SMTP_USER/SMTP_PASS) not set — trying Brevo/SendGrid fallback for contact message');
    return false;
  }

  try {
    const nodemailerModule = await import('nodemailer');
    const nodemailer = nodemailerModule.default;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const fromName = import.meta.env.EMAIL_FROM_NAME || 'CozyAura Soya Candles';
    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      html
    });

    console.log(`Email sent via SMTP to ${to} (${subject}): ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email via SMTP to ${to} (${subject}):`, err.message);
    return false;
  }
}

async function sendViaResend({ to, subject, html }) {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const fromEmail = import.meta.env.EMAIL_FROM || 'onboarding@resend.dev';
  const fromName = import.meta.env.EMAIL_FROM_NAME || 'CozyAura';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `"${fromName}" <${fromEmail}>`,
        to: [to],
        subject,
        html
      })
    });

    if (res.ok) {
      console.log(`Email sent via Resend to ${to} (${subject})`);
      return true;
    } else {
      const errData = await res.json();
      console.error(`Resend API error:`, errData);
      return false;
    }
  } catch (err) {
    console.error(`Failed to send email via Resend to ${to}:`, err.message);
    return false;
  }
}

async function sendEmail({ to, subject, html }) {
  if (import.meta.env.RESEND_API_KEY) {
    const success = await sendViaResend({ to, subject, html });
    if (success) return true;
  }
  if (import.meta.env.SMTP_USER && import.meta.env.SMTP_PASS) {
    const success = await sendViaSMTP({ to, subject, html });
    if (success) return true;
  }
  console.error("No active email providers configured or all failed.");
  return false;
}

export async function sendOrderConfirmation({ email, name, orderId, items, subtotal, discount, shipping, total, address, siteOrigin, giftCardFee = 0 }) {
  return sendEmail({
    to: email,
    subject: `Order Confirmed — ${orderId}`,
    html: orderConfirmationHTML({ orderId, name, items, subtotal, discount, shipping, total, address, siteOrigin, giftCardFee })
  });
}

export async function sendOrderShipped({ email, name, orderId, trackingNumber, courier, trackingLink, deliveryMethod, siteOrigin, items, subtotal, discount, shipping, total, address, giftCardFee = 0 }) {
  const isPickup = deliveryMethod === 'Pickup';
  const formattedOrderId = String(orderId).startsWith('#') ? orderId : `#${orderId}`;
  const subject = isPickup ? `Order Ready for Pickup — ${formattedOrderId}` : `Order Shipped — ${formattedOrderId}`;
  return sendEmail({
    to: email,
    subject,
    html: orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink, deliveryMethod, siteOrigin, items, subtotal, discount, shipping, total, address, giftCardFee })
  });
}

export async function sendContactMessage({ name, email, subject, message }) {
  const ownerEmail = import.meta.env.STORE_OWNER_EMAIL || 'nitinekbote89@gmail.com';
  const mailHtml = `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message}</p>`;

  if (import.meta.env.SMTP_USER && import.meta.env.SMTP_PASS) {
    const success = await sendViaSMTP({
      to: ownerEmail,
      subject: `Contact: ${subject}`,
      html: mailHtml
    });
    if (success) return true;
  }

  return sendEmail({
    to: ownerEmail,
    subject: `Contact: ${subject}`,
    html: mailHtml
  });
}
