import { createClient } from '@supabase/supabase-js';
import { a as sendOrderConfirmation } from '../../chunks/email_BVOhTcpL.mjs';
import { P as PaytmChecksum } from '../../chunks/PaytmChecksum_CaUG7DWM.mjs';
export { renderers } from '../../renderers.mjs';

const supabase = createClient(
  "https://fxihqzepiayehvszyita.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aWhxemVwaWF5ZWh2c3p5aXRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcxMjc5MCwiZXhwIjoyMDk3Mjg4NzkwfQ.Rbke2hVSbPZA5dp-XdLrlrFRTwnpRAnxTjke7RjOEPg"
);
async function POST({ request }) {
  let bodyParams = {};
  let customerName = "";
  let orderId = "";
  let txnStatus = "TXN_FAILURE";
  try {
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
    const paytmMid = undefined                          || process.env.PAYTM_MID;
    const paytmMerchantKey = undefined                                   || process.env.PAYTM_MERCHANT_KEY;
    const paytmEnvironment = undefined                                  || process.env.PAYTM_ENVIRONMENT || "stage";
    const isChecksumValid = PaytmChecksum.verifySignature(bodyParams, paytmMerchantKey, checksumHash);
    if (!isChecksumValid) {
      console.error("Paytm Callback Security Alert: Checksum verification failed!");
      return new Response("Signature mismatch", { status: 400 });
    }
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
    const paytmHost = paytmEnvironment === "prod" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
    const statusQueryUrl = `${paytmHost}/v3/order/status`;
    const statusRes = await fetch(statusQueryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statusQueryPayload)
    });
    if (!statusRes.ok) {
      throw new Error(`Paytm status query failed: HTTP ${statusRes.status}`);
    }
    const queryResult = await statusRes.json();
    const queryBody = queryResult.body || {};
    const queryResultInfo = queryBody.resultInfo || {};
    txnStatus = queryBody.status || queryResultInfo.resultStatus;
    if (txnStatus === "TXN_SUCCESS") {
      const txnId = queryBody.txnId || bodyParams.TXNID;
      const { data: intent, error: fetchIntentErr } = await supabase.from("payment_intents").select("*").eq("razorpay_order_id", orderIdParam).maybeSingle();
      if (fetchIntentErr || !intent) {
        console.warn(`Paytm Callback Warn: No active payment intent found for Paytm order ID: ${orderIdParam}`);
        const { data: processed } = await supabase.from("processed_payments").select("order_id").eq("payment_id", txnId).maybeSingle();
        if (processed) {
          orderId = processed.order_id;
          return new Response(null, {
            status: 302,
            headers: {
              "Location": `/?order_success=true&order_id=${orderId}`
            }
          });
        }
        return new Response("Intent not found", { status: 400 });
      }
      customerName = intent.name;
      const { data: orderNumber, error: rpcErr } = await supabase.rpc("place_order_securely", {
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
        p_total: null,
        // resolved via p_razorpay_order_id
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
      const rawItems = intent.raw_items || [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      try {
        await sendOrderConfirmation({
          email: intent.email,
          name: intent.name,
          orderId: orderNumber,
          items,
          subtotal: items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.quantity || 0), 0).toFixed(2),
          discount: parseFloat(intent.expected_total) > 0 ? (items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.quantity || 0), 0) - parseFloat(intent.expected_total)).toFixed(2) : "0.00",
          shipping: "0.00",
          // Free or dynamic shipping (can check shipping logic)
          total: parseFloat(intent.expected_total).toFixed(2),
          address: {
            fname: intent.name?.split(" ")[0] || "",
            lname: intent.name?.split(" ").slice(1).join(" ") || "",
            address: intent.shipping_address || "",
            city: intent.city || "",
            state: intent.state || "",
            pincode: intent.pincode || "",
            phone: intent.phone || ""
          },
          siteOrigin: new URL(request.url).origin
        });
      } catch (emailErr) {
        console.error("Paytm Callback Email Send Error:", emailErr.message);
      }
      await supabase.from("payment_intents").delete().eq("razorpay_order_id", orderIdParam);
      console.log(`Paytm Callback Success: Order ${orderNumber} successfully secured for transaction ${txnId}`);
    }
  } catch (err) {
    console.error("Paytm Callback Internal Error:", err.message);
  }
  if (txnStatus === "TXN_SUCCESS" && orderId) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `/?order_success=true&order_id=${orderId}&customer_name=${encodeURIComponent(customerName)}`
      }
    });
  } else {
    const errorMsg = bodyParams.RESPMSG || "Transaction was not successful";
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `/?payment_failed=true&error=${encodeURIComponent(errorMsg)}`
      }
    });
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
