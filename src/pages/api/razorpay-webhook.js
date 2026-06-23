import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmation } from '../../lib/email.js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST({ request }) {
  try {
    const rawBody = await request.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("Webhook payload is not valid JSON.");
      return new Response("Invalid JSON", { status: 200 }); // Always 200
    }

    // 1. Signature verification using webhook secret
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = import.meta.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

    const isProdEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
    if (!webhookSecret && isProdEnv) {
      console.error("FATAL: RAZORPAY_WEBHOOK_SECRET is not set in production. Rejecting all webhook events.");
      return new Response("Webhook configuration error", { status: 200 });
    }
    if (webhookSecret && signature) {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expectedSignature, 'hex');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        console.error("Webhook signature mismatch — request rejected.");
        return new Response("Invalid signature", { status: 200 });
      }
    } else if (!webhookSecret) {
      console.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping verification (development only).");
    } else {
      console.warn("No x-razorpay-signature header in request — rejecting.");
      return new Response("Missing signature header", { status: 200 });
    }

    // 2. Only process payment.captured event
    if (body.event === 'payment.captured') {
      const paymentId = body.payload?.payment?.entity?.id;
      const razorpayOrderId = body.payload?.payment?.entity?.order_id;

      if (!paymentId || !razorpayOrderId) {
        console.error("Webhook payload missing payment ID or order ID.");
        return new Response("Invalid payload parameters", { status: 200 });
      }

      // 3. Intent Lookup Guard
      const { data: intent, error: fetchIntentErr } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId)
        .single();

      if (fetchIntentErr || !intent) {
        console.warn(`Webhook Warn: No active payment intent found for order ID: ${razorpayOrderId}`);
        return new Response("Intent not found", { status: 200 });
      }

      // NOTE: OPERATIONAL DESIGN DECISION (EXPIRY BYPASS)
      // We deliberately bypass the payment intent `expires_at` check on the webhook recovery route.
      // Unlike browser sessions which might be stale or replayed, the webhook represents a cryptographically
      // verified capture event directly from Razorpay's servers. If a user paid at minute 29 but the webhook
      // delivery was delayed and arrives at minute 31, we must fulfill the order because the customer's
      // money has already been collected. Bypassing expiration here prevents collecting money without creating an order.
      const { data: orderNumber, error: rpcErr } = await supabase.rpc('place_order_securely', {
        p_payment_id: paymentId,
        p_order_id: null,
        p_email: intent.email,
        p_name: intent.name,
        p_phone: intent.phone,
        p_address_id: intent.address_id,
        p_shipping_address: intent.shipping_address,
        p_city: intent.city,
        p_state: intent.state,
        p_pincode: intent.pincode,
        p_address_label: intent.address_label,
        p_total: null, // will be resolved in place_order_securely via p_razorpay_order_id
        p_items_summary: intent.items_summary,
        p_raw_items: intent.raw_items,
        p_session_id: intent.session_id,
        p_razorpay_order_id: razorpayOrderId
      });

      if (rpcErr) {
        console.error(`Webhook Order Placement Error for order ID ${razorpayOrderId}:`, rpcErr.message);
        return new Response("Database placement failed", { status: 200 });
      }

      // 5. Send order confirmation email (non-blocking)
      const rawItems = intent.raw_items || [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      sendOrderConfirmation({
        email: intent.email,
        name: intent.name,
        orderId: orderNumber,
        items,
        total: items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.quantity || 0), 0).toFixed(2),
        address: {
          fname: intent.name?.split(' ')[0] || '',
          lname: intent.name?.split(' ').slice(1).join(' ') || '',
          address: intent.shipping_address || '',
          city: intent.city || '',
          state: intent.state || '',
          pincode: intent.pincode || '',
          phone: intent.phone || ''
        }
      });

      // 6. Clean up payment intent on successful placement
      await supabase.from('payment_intents').delete().eq('razorpay_order_id', razorpayOrderId);
      console.log(`Webhook Success: Order ${orderNumber} successfully secured for payment ${paymentId}`);
    }

  } catch (err) {
    console.error("Fatal Webhook Internal Error:", err.message);
  }

  // Always return 200 OK to prevent infinite retries from Razorpay
  return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
}
