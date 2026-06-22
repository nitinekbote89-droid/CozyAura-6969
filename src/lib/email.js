import nodemailer from 'nodemailer';

let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: import.meta.env.SMTP_HOST,
      port: parseInt(import.meta.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: import.meta.env.SMTP_USER,
        pass: import.meta.env.SMTP_PASS
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });
  }
  return _transporter;
}

const fromAddr = `"${import.meta.env.EMAIL_FROM_NAME}" <${import.meta.env.EMAIL_FROM}>`;

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

export async function sendOrderConfirmation({ email, name, orderId, items, total, address }) {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: fromAddr,
      to: email,
      subject: `Order Confirmed — ${orderId}`,
      html: orderConfirmationHTML({ orderId, name, items, total, address })
    });
    console.log(`Order confirmation email sent to ${email} (${orderId}): ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`Failed to send order confirmation to ${email} (${orderId}):`, err.message);
    return false;
  }
}

export async function sendOrderShipped({ email, name, orderId, trackingNumber, courier, trackingLink }) {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: fromAddr,
      to: email,
      subject: `Order Shipped — ${orderId}`,
      html: orderShippedHTML({ orderId, name, trackingNumber, courier, trackingLink })
    });
    console.log(`Shipping notification sent to ${email} (${orderId}): ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`Failed to send shipping notification to ${email} (${orderId}):`, err.message);
    return false;
  }
}
