import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmation } from '../../lib/email.js';
import PaytmChecksum from '../../lib/PaytmChecksum.js';

let supabase;
let _env = {};
function initSupabase(context) {
  const env = context.locals?.runtime?.env || context.platform?.env || {};
  _env = env;
  const url = env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || globalThis.SUPABASE_URL || globalThis.PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL || process.env?.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY || globalThis.SUPABASE_SERVICE_ROLE_KEY || globalThis.PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
  supabase = createClient(url, key);
}

export async function POST(context) {
  initSupabase(context);
  const { request } = context;
  let bodyParams = {};
  let customerName = '';
  let orderId = '';
  let txnStatus = 'TXN_FAILURE';

  try {
    // 1. Read urlencoded form POST body parameters
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      bodyParams[key] = value;
    }

    const orderIdParam = bodyParams.ORDERID;
    const checksumHash = bodyParams.CHECKSUMHASH;

    if (!orderIdParam || !checksumHash) {
      console.error("Paytm Callback Error: Missing ORDERID or CHECKSUMHASH in callback parameters.");
      return new Response("Missing parameters", { status: 400 });
    }

    // 2. Fetch Paytm Credentials from Env
    const paytmMid = _env.PAYTM_MID || import.meta.env.PAYTM_MID || process.env?.PAYTM_MID;
    const paytmMerchantKey = _env.PAYTM_MERCHANT_KEY || import.meta.env.PAYTM_MERCHANT_KEY || process.env?.PAYTM_MERCHANT_KEY;
    const paytmEnvironment = _env.PAYTM_ENVIRONMENT || import.meta.env.PAYTM_ENVIRONMENT || process.env?.PAYTM_ENVIRONMENT || 'stage';

    // 3. Verify Paytm Signature
    const isChecksumValid = PaytmChecksum.verifySignature(bodyParams, paytmMerchantKey, checksumHash);
    if (!isChecksumValid) {
      console.error("Paytm Callback Security Alert: Checksum verification failed!");
      return new Response("Signature mismatch", { status: 400 });
    }

    // 4. Double check Paytm Status Query API for absolute security
    const statusQueryBody = {
      mid: paytmMid,
      orderId: orderIdParam
    };
    const queryChecksum = await PaytmChecksum.generateSignature(statusQueryBody, paytmMerchantKey);

    const statusQueryPayload = {
      body: statusQueryBody,
      head: {
        signature: queryChecksum
      }
    };

    const paytmHost = paytmEnvironment === 'prod' ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
    const statusQueryUrl = `${paytmHost}/v3/order/status`;

    const statusRes = await fetch(statusQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusQueryPayload)
    });

    if (!statusRes.ok) {
      throw new Error(`Paytm status query failed: HTTP ${statusRes.status}`);
    }

    const queryResult = await statusRes.json();
    const queryBody = queryResult.body || {};
    const queryResultInfo = queryBody.resultInfo || {};
    txnStatus = queryBody.status || queryResultInfo.resultStatus;

    if (txnStatus === 'TXN_SUCCESS') {
      const txnId = queryBody.txnId || bodyParams.TXNID;

      // 5. Look up the payment intent
      const { data: intent, error: fetchIntentErr } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('razorpay_order_id', orderIdParam)
        .maybeSingle();

      if (fetchIntentErr || !intent) {
        console.warn(`Paytm Callback Warn: No active payment intent found for Paytm order ID: ${orderIdParam}`);
        // If order already placed (e.g. via client new_order flow first), redirect to success
        const { data: processed } = await supabase
          .from('processed_payments')
          .select('order_id')
          .eq('payment_id', txnId)
          .maybeSingle();

        if (processed) {
          orderId = processed.order_id;
          return new Response(null, {
            status: 302,
            headers: {
              'Location': `/?order_success=true&order_id=${orderId}`
            }
          });
        }
        return new Response("Intent not found", { status: 400 });
      }

      customerName = intent.name;

      // 6. Securely place order in database
      const { data: orderNumber, error: rpcErr } = await supabase.rpc('place_order_securely', {
        p_payment_id: txnId,
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
        p_total: null, // resolved via p_razorpay_order_id
        p_items_summary: intent.items_summary,
        p_raw_items: intent.raw_items,
        p_session_id: intent.session_id,
        p_razorpay_order_id: orderIdParam
      });

      if (rpcErr) {
        console.error(`Paytm Callback Database Placement Error for Paytm order ${orderIdParam}:`, rpcErr.message);
        return new Response("Database placement failed", { status: 500 });
      }

      orderId = orderNumber;

      // 7. Send order confirmation email
      const rawItems = intent.raw_items || [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      const subtotalVal = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.quantity || 0), 0);
      const giftCardFeeVal = (intent.gift_card_layout_id || (intent.items_summary && intent.items_summary.toLowerCase().includes('personalized gift card'))) ? 50 : 0;
      const expectedTotalVal = parseFloat(intent.expected_total) || 0;
      const calculatedDiscount = Math.max(0, subtotalVal + giftCardFeeVal - expectedTotalVal);

      try {
        await sendOrderConfirmation({
          email: intent.email,
          name: intent.name,
          orderId: orderNumber,
          items,
          subtotal: subtotalVal.toFixed(2),
          discount: calculatedDiscount.toFixed(2),
          shipping: '0.00', 
          total: expectedTotalVal.toFixed(2),
          address: {
            fname: intent.name?.split(' ')[0] || '',
            lname: intent.name?.split(' ').slice(1).join(' ') || '',
            address: intent.shipping_address || '',
            city: intent.city || '',
            state: intent.state || '',
            pincode: intent.pincode || '',
            phone: intent.phone || ''
          },
          siteOrigin: new URL(request.url).origin,
          giftCardFee: giftCardFeeVal.toFixed(2)
        }, _env);
      } catch (emailErr) {
        console.error("Paytm Callback Email Send Error:", emailErr.message);
      }

      // 8. Cleanup payment intent
      await supabase.from('payment_intents').delete().eq('razorpay_order_id', orderIdParam);
      console.log(`Paytm Callback Success: Order ${orderNumber} successfully secured for transaction ${txnId}`);
    }

  } catch (err) {
    console.error("Paytm Callback Internal Error:", err.message);
  }

  // Redirect browser to success or failure page
  if (txnStatus === 'TXN_SUCCESS' && orderId) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/?order_success=true&order_id=${orderId}&customer_name=${encodeURIComponent(customerName)}`
      }
    });
  } else {
    const errorMsg = bodyParams.RESPMSG || "Transaction was not successful";
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/?payment_failed=true&error=${encodeURIComponent(errorMsg)}`
      }
    });
  }
}
