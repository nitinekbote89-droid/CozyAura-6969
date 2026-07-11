import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmation, sendContactMessage } from '../../lib/email.js';
import { calculateShipping } from '../../lib/shipping.js';
import PaytmChecksum from '../../lib/PaytmChecksum.js';
const isProd = import.meta.env.PROD || process.env.NODE_ENV === 'production';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const jsonRes = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  // Allow test mock token if bypass secret header matches admin secret
  const bypassHeader = request.headers.get('x-test-bypass-secret');
  const adminSecret = import.meta.env.ADMIN_SECRET || process.env.ADMIN_SECRET || 'CozyAura@6969';
  if (token === 'mock_test_jwt_token' && bypassHeader && bypassHeader === adminSecret) {
    return { id: 'mock-test-user-id', email: 'vasantiekbote085@gmail.com' };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    return null;
  }
}

let catalogCache = null;
let catalogCacheTime = 0;
const CACHE_TTL = 30_000;

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const paytmMid = import.meta.env.PAYTM_MID || process.env.PAYTM_MID;
const paytmMerchantKey = import.meta.env.PAYTM_MERCHANT_KEY || process.env.PAYTM_MERCHANT_KEY;
const paytmWebsite = import.meta.env.PAYTM_WEBSITE || process.env.PAYTM_WEBSITE || 'WEBSTAGING';
const paytmEnvironment = import.meta.env.PAYTM_ENVIRONMENT || process.env.PAYTM_ENVIRONMENT || 'stage';


if (isProd && (!paytmMid || !paytmMerchantKey)) {
  console.error("FATAL: Paytm credentials are required in production mode.");
}

function getCanonicalItemsString(items) {
  if (!items || !Array.isArray(items)) return '[]';
  
  const sortedItems = [...items].sort((a, b) => {
    const idA = (a.product?.id || '').toLowerCase();
    const idB = (b.product?.id || '').toLowerCase();
    if (idA !== idB) return idA.localeCompare(idB);
    
    const vA = (a.variant?.name || 'Standard').toLowerCase();
    const vB = (b.variant?.name || 'Standard').toLowerCase();
    return vA.localeCompare(vB);
  });
  
  const minimal = sortedItems.map(it => ({
    product_id: it.product?.id,
    variant_name: it.variant?.name || 'Standard',
    quantity: it.quantity,
    price: Number(it.variant?.price || it.product?.price || 0)
  }));
  
  return JSON.stringify(minimal);
}

async function calculateCartTotalOnServer(items, couponCode, state, pincode, deliveryMethod, isGift = false) {
  if (!items || !Array.isArray(items)) return { subtotal: 0, discount: 0, shipping: 0, total: 0 };

  const productIds = items.map(it => it.product?.id).filter(Boolean);

  // Fetch products and variants in parallel (M4: pre-group variants into Map)
  const [{ data: dbProducts }, { data: dbVariants }] = await Promise.all([
    supabase.from('products').select('id, price, weight').in('id', productIds),
    supabase.from('product_variants').select('product_id, variant_name').in('product_id', productIds)
  ]);

  const variantIndex = {};
  (dbVariants || []).forEach(v => {
    const key = `${v.product_id}::${v.variant_name}`;
    variantIndex[key] = v;
  });

  let subtotal = 0;
  for (const item of items) {
    const dbProd = dbProducts?.find(p => p.id === item.product?.id);
    if (!dbProd) {
      throw new Error(`Invalid cart items`);
    }
    if (item.product) {
      item.product.weight = dbProd.weight;
    } else {
      item.product = { id: dbProd.id, weight: dbProd.weight };
    }
    const variantName = item.variant?.name || 'Standard';
    if (variantName !== 'Standard' && variantName !== '') {
      const key = `${item.product?.id}::${variantName}`;
      if (!variantIndex[key]) {
        throw new Error(`Invalid cart items`);
      }
    }
    const vPrice = item.variant?.price || dbProd.price;
    subtotal += (Number(vPrice) || dbProd.price) * item.quantity;
  }

  let discount = 0;
  let finalShipping = 0;
  if (subtotal > 0 && deliveryMethod !== 'Pickup') {
    finalShipping = calculateShipping(items, state, pincode);
  }
  if (couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('status', 'Active')
      .maybeSingle();
    if (coupon) {
      if (coupon.type === 'percent') {
        discount = Math.round(subtotal * (Math.min(coupon.discount, 100) / 100));
      } else if (coupon.type === 'fixed') {
        discount = coupon.discount;
      } else if (coupon.type === 'freeship') {
        if (deliveryMethod === 'Pickup') {
          throw new Error("Free shipping coupons cannot be applied to self-pickup orders.");
        }
        discount = 0;
        finalShipping = 0;
      }
    }
  }
  const finalTotal = Math.max(0, subtotal + (isGift ? 50 : 0) - discount + finalShipping);
  return { subtotal, discount, shipping: finalShipping, total: finalTotal };
}

async function autoCleanExpiredIntents() {
  try {
    const { error } = await supabase.rpc('cleanup_expired_payment_intents');
    if (error) throw error;
  } catch (err) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('payment_intents').delete().lt('expires_at', sevenDaysAgo);
    } catch (e) {
      console.error("Direct cleanup fallback error:", e);
    }
  }
}
async function autoCleanExpiredLocks() {
  try {
    const { error } = await supabase.from('inventory_locks').delete().lt('expires_at', new Date().toISOString());
    if (error) throw error;
  } catch (err) {
    console.error("Auto clean expired locks error:", err);
  }
}

// H6: Throttle autoClean — run at most once every 5 minutes to avoid per-request DB overhead
let _lastAutoCleanTime = 0;
async function autoCleanInactiveVariants() {
  const now = Date.now();
  if (now - _lastAutoCleanTime < 5 * 60 * 1000) return; // 5-minute cooldown
  _lastAutoCleanTime = now;
  try {
    const { data: setRow } = await supabase.from('settings').select('value').eq('key', 'GLOBAL_FRAGRANCES').single();
    const globalFrags = setRow ? setRow.value : [];
    const { data: zeroStockVariants } = await supabase.from('product_variants').select('*').eq('stock', 0);
    if (zeroStockVariants && zeroStockVariants.length > 0) {
      const toDelete = zeroStockVariants.filter(v => {
        const name = v.variant_name.toLowerCase().trim();
        return !globalFrags.map(gf => gf.toLowerCase().trim()).includes(name);
      });
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map(v => v.id);
        await supabase.from('product_variants').delete().in('id', deleteIds);
      }
    }
    await autoCleanExpiredIntents();
    await autoCleanExpiredLocks();
  } catch (err) {
    console.error("Auto cleanup error:", err);
  }
}

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const now = Date.now();
    if (catalogCache && (now - catalogCacheTime) < CACHE_TTL) {
      return new Response(JSON.stringify(catalogCache), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    await autoCleanInactiveVariants();

    const [
      { data: setRow },
      { data: storefrontImagesRow },
      { data: coupons }
    ] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'GLOBAL_FRAGRANCES').single(),
      supabase.from('settings').select('value').eq('key', 'STOREFRONT_IMAGES').single(),
      supabase.from('coupons').select('*').eq('status', 'Active')
    ]);
    const fragrances = setRow ? setRow.value : [];
    const storefrontImages = storefrontImagesRow ? storefrontImagesRow.value : null;

    let dbProducts = [];
    let hasSalesView = false;
    try {
      const { data, error } = await supabase.from('products_with_sales').select('*').order('created_at', { ascending: false });
      if (data && !error) {
        dbProducts = data;
        hasSalesView = true;
      }
    } catch (e) {
      console.warn("View products_with_sales not available, using fallback calculation.");
    }

    if (!hasSalesView) {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      dbProducts = data || [];
    }

    const { data: dbVariants } = await supabase.from('product_variants').select('*');

    // M4: Pre-group variants by product ID to avoid nested O(P*V) filter loop
    const variantsByProductId = {};
    (dbVariants || []).forEach(v => {
      if (!variantsByProductId[v.product_id]) {
        variantsByProductId[v.product_id] = [];
      }
      variantsByProductId[v.product_id].push(v);
    });

    let salesMap = {};
    if (!hasSalesView) {
      const { data: dbOrderItems } = await supabase.from('order_items').select('product_id, quantity');
      if (dbOrderItems) {
        dbOrderItems.forEach(item => {
          salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
        });
      }
    }

    // Fetch back_in_stock_requests
    let requestsMap = {};
    let fragranceRequestsMap = {};
    try {
      const { data: dbRequests } = await supabase.from('back_in_stock_requests').select('product_id, variant_name');
      if (dbRequests) {
        dbRequests.forEach(req => {
          const pid = req.product_id;
          const vname = req.variant_name;
          requestsMap[pid] = (requestsMap[pid] || 0) + 1;
          if (!fragranceRequestsMap[pid]) {
            fragranceRequestsMap[pid] = {};
          }
          fragranceRequestsMap[pid][vname] = (fragranceRequestsMap[pid][vname] || 0) + 1;
        });
      }
    } catch (e) {
      console.warn("Table back_in_stock_requests not found in database.");
    }

    // Fetch active locks
    const { data: dbLocks } = await supabase.from('inventory_locks').select('*').gt('expires_at', new Date().toISOString());
    const locksMap = {};
    if (dbLocks) {
      dbLocks.forEach(lock => {
        const pid = lock.product_id;
        const vname = lock.variant_name;
        if (!locksMap[pid]) locksMap[pid] = {};
        locksMap[pid][vname] = (locksMap[pid][vname] || 0) + lock.quantity;
      });
    }

    const formattedInventory = dbProducts.map(p => {
      const pVars = variantsByProductId[p.id] || [];
      let fragranceStocks = {};
      let fragranceImages = {};

      pVars.forEach(v => {
        const lockedQty = (locksMap[p.id] && locksMap[p.id][v.variant_name]) || 0;
        fragranceStocks[v.variant_name] = Math.max(0, v.stock - lockedQty);
        if (v.image_url) fragranceImages[v.variant_name] = v.image_url;
      });

      const totalProductLocks = Object.values(locksMap[p.id] || {}).reduce((a, b) => a + b, 0);
      const availableProductStock = Math.max(0, p.stock - totalProductLocks);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        weight: p.weight,
        stock: availableProductStock,
        coverImage: p.cover_image,
        description: p.description,
        specifications: p.specifications,
        fragranceStocks,
        fragranceImages,
        totalSales: hasSalesView ? (p.total_sales || 0) : (salesMap[p.id] || 0),
        salesRank: hasSalesView ? (p.sales_rank || null) : null,
        requests: requestsMap[p.id] || 0,
        fragranceRequests: fragranceRequestsMap[p.id] || {}
      };
    });

    const responseBody = { success: true, data: { inventory: formattedInventory, coupons, fragrances, storefrontImages } };
    catalogCache = responseBody;
    catalogCacheTime = Date.now();
    return new Response(JSON.stringify(responseBody), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return jsonRes({ success: false, error: err.message }, 500);
  }
}

export async function POST({ request }) {
  try {
    await autoCleanInactiveVariants();
    const body = await request.json();

    if (body.action === 'increment_views') {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'site_views_daily')
          .maybeSingle();

        const dailyCounts = data?.value || {};
        
        // Get today's date in Indian Standard Time (IST)
        const todayStr = new Date().toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).split('/').reverse().join('-');

        if (!dailyCounts[todayStr]) dailyCounts[todayStr] = 0;
        dailyCounts[todayStr] += 1;

        await supabase
          .from('settings')
          .update({ value: dailyCounts })
          .eq('key', 'site_views_daily');

        return jsonRes({ success: true, todayViews: dailyCounts[todayStr] });
      } catch (err) {
        return jsonRes({ success: false, error: err.message }, 500);
      }
    }

    if (body.action === 'acquire_locks') {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized session token." }), { status: 401 });
      }

      const { session_id, items, expires_in_minutes } = body;
      if (!session_id || !items) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields." }), { status: 400 });
      }

      // Prepend user ID to lock session ID to isolate users and prevent lock injection
      const lockSessionId = `sess_${user.id}_${session_id}`;

      // Delete any existing locks for this user's session first to prevent infinite lock hoarding DoS
      await supabase.from('inventory_locks').delete().eq('session_id', lockSessionId);

      const formattedItems = items.map(it => ({
        product_id: it.product.id,
        variant_name: it.variant?.name || 'Standard',
        quantity: it.quantity
      }));

      const { data: success, error } = await supabase.rpc('acquire_stock_locks', {
        p_session_id: lockSessionId,
        p_items: formattedItems,
        p_expires_in_minutes: expires_in_minutes || 10
      });

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }

      if (!success) {
        return new Response(JSON.stringify({ success: false, error: "Stock unavailable. One or more items in your cart are already locked or out of stock." }), { status: 409 });
      }

      return new Response(JSON.stringify({ success: true, message: "Inventory locks acquired." }), { status: 200 });
    }

    if (body.action === 'release_locks') {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized session token." }), { status: 401 });
      }

      const { session_id } = body;
      if (!session_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing session_id." }), { status: 400 });
      }

      const lockSessionId = `sess_${user.id}_${session_id}`;
      const { error } = await supabase.from('inventory_locks').delete().eq('session_id', lockSessionId);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, message: "Inventory locks released." }), { status: 200 });
    }

    if (body.action === 'register_notification') {
      const { product_id, variant_name, email } = body;
      if (!product_id || !variant_name || !email) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields." }), { status: 400 });
      }
      const emailTrimmed = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        return new Response(JSON.stringify({ success: false, error: "Invalid email address format." }), { status: 400 });
      }
      
      const { error } = await supabase.from('back_in_stock_requests').insert([{
        product_id,
        variant_name: variant_name.toLowerCase().trim(),
        email: emailTrimmed
      }]);
      
      if (error && error.code !== '23505') {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      
      return new Response(JSON.stringify({ success: true, message: "Notification registered." }), { status: 200 });
    }

    if (body.action === 'new_message') {
      // 1. Honeypot check (Stealth rejection)
      if (body.company_name_hp && body.company_name_hp.trim() !== '') {
        console.warn("Spam honeypot triggered on contact form submission.");
        return new Response(JSON.stringify({ success: true, message: "Message sent! We'll get back to you soon." }), { status: 200 });
      }

      const { name, email, phone, subject, message } = body;
      if (!name || !email || !phone || !subject || !message) {
        return new Response(JSON.stringify({ success: false, error: "All contact fields are required." }), { status: 400 });
      }

      const emailTrimmed = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        return new Response(JSON.stringify({ success: false, error: "Invalid email address format." }), { status: 400 });
      }

      const words = message.trim().split(/\s+/).filter(Boolean);
      if (words.length > 200) {
        return new Response(JSON.stringify({ success: false, error: "Message exceeds the maximum limit of 200 words." }), { status: 400 });
      }

      // 2. Email-based rate limiting (max 3 messages per hour)
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error: countErr } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_email', emailTrimmed)
          .gt('created_at', oneHourAgo);

        if (!countErr && (count || 0) >= 3) {
          return new Response(JSON.stringify({ success: false, error: "Too many messages sent. Please try again in an hour." }), { status: 429 });
        }
      } catch (err) {
        console.warn("Rate-limit check skipped due to query error:", err.message);
      }

      const { error: dbErr } = await supabase.from('messages').insert({
        name: name.trim(),
        user_email: emailTrimmed,
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim()
      });

      if (dbErr) {
        console.error("Failed to insert message into Supabase database:", dbErr);
        return new Response(JSON.stringify({ success: false, error: "Database error: " + dbErr.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, message: "Message sent! We'll get back to you soon." }), { status: 200 });
    }

    if (body.action === 'create_payment_intent') {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized session token." }), { status: 401 });
      }

      const { items, couponCode, name, phone, addressId, shippingAddress, city, state, pincode, addressLabel, sessionId, deliveryMethod, giftCardLayoutId, isGift } = body;
      
      if (!items || !name) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields for payment intent." }), { status: 400 });
      }

      const email = user.email;

      let calculated;
      try {
        calculated = await calculateCartTotalOnServer(items, couponCode, state, pincode, deliveryMethod, isGift === true || isGift === 'true');
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
      }

      let razorpayOrderId = 'order_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      let txnToken = 'mock_token_' + Math.random().toString(36).substring(2, 15);

      if (paytmMid && paytmMerchantKey) {
        try {
          const paytmParams = {
            body: {
              requestType: "Payment",
              mid: paytmMid,
              websiteName: paytmWebsite,
              orderId: razorpayOrderId,
              txnAmount: {
                value: calculated.total.toFixed(2),
                currency: "INR"
              },
              userInfo: {
                custId: email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
              },
              callbackUrl: `${new URL(request.url).origin}/api/paytm-callback`
            }
          };

          const signature = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), paytmMerchantKey);
          paytmParams.head = {
            signature: signature
          };

          const paytmHost = paytmEnvironment === 'prod' ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
          const rRes = await fetch(`${paytmHost}/theia/api/v1/initiateTransaction?mid=${paytmMid}&orderId=${razorpayOrderId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paytmParams)
          });

          if (!rRes.ok) {
            const errorText = await rRes.text();
            throw new Error(`Paytm initiateTransaction failed: ${errorText}`);
          }

          const rJson = await rRes.json();
          const rBody = rJson.body || {};
          const rResultInfo = rBody.resultInfo || {};
          if (rResultInfo.resultStatus !== 'S' && rResultInfo.resultStatus !== 'SUCCESS') {
            throw new Error(rResultInfo.resultMsg || "Failed to initiate payment transaction");
          }

          txnToken = rBody.txnToken;
        } catch (err) {
          if (isProd) {
            return new Response(JSON.stringify({ success: false, error: "Paytm payment initiation failed: " + err.message }), { status: 500 });
          }
          console.warn("Paytm API call failed, falling back to mock Order ID in development:", err.message);
          razorpayOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 15);
        }
      } else if (isProd) {
        return new Response(JSON.stringify({ success: false, error: "Paytm credentials are missing in production environment." }), { status: 500 });
      }

      const canonicalItems = getCanonicalItemsString(items);
      const itemsSummary = items.map(i => `${i.product.name} (${i.variant?.name || 'Standard'}) x${i.quantity}`).join(', ');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      
      const formattedRawItems = items.map(it => ({
        product_id: it.product?.id,
        product_name: it.product?.name,
        variant_name: it.variant?.name || 'Standard',
        price: Number(it.variant?.price || it.product?.price || 0),
        quantity: it.quantity
      }));

      // Prepend user ID to lock session ID to isolate users and prevent lock injection
      const lockSessionId = `sess_${user.id}_${sessionId || ('sess_' + Date.now().toString(36))}`;

      const { error: intentErr } = await supabase.from('payment_intents').insert([{
        razorpay_order_id: razorpayOrderId,
        expected_total: calculated.total,
        expected_items: canonicalItems,
        expires_at: expiresAt,
        email: email.toLowerCase().trim(),
        name,
        phone: phone || '',
        address_id: addressId || null,
        shipping_address: shippingAddress || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        address_label: addressLabel || 'Home',
        items_summary: itemsSummary,
        raw_items: formattedRawItems,
        session_id: lockSessionId,
        gift_card_layout_id: giftCardLayoutId || null
      }]);

      if (intentErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to store payment intent: " + intentErr.message }), { status: 500 });
      }

      return new Response(JSON.stringify({
        success: true,
        razorpayOrderId,
        expectedTotal: calculated.total,
        paytmMid: paytmMid || 'mock_mid',
        txnToken
      }), { status: 200 });
    }

    if (body.action === 'new_order') {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized session token." }), { status: 401 });
      }

      const { 
        paymentId, 
        razorpayOrderId, 
        razorpaySignature, 
        total, 
        items, 
        rawItems, 
        addressId, 
        fname, 
        lname, 
        name, 
        phone, 
        shippingAddress, 
        city, 
        state, 
        pincode, 
        addressLabel, 
        sessionId,
        couponCode,
        deliveryMethod,
        giftCardLayoutId,
        isGift
      } = body;

      // H2: Null-guard paymentId BEFORE calling .startsWith()
      if (!paymentId) {
        return new Response(JSON.stringify({ success: false, error: "Missing payment ID." }), { status: 400 });
      }

      const userEmail = user.email.toLowerCase().trim();
      // M17: Use sessionId from client; do NOT fall back to email (causes multi-tab lock conflicts)
      const lockSessionId = `sess_${user.id}_${sessionId || ('sess_' + Date.now().toString(36))}`;

      const cartItems = rawItems?.items || [];
      // H7: Harden COD — reject empty/malformed cart before total check
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Cart is empty or malformed. Cannot place order." }), { status: 400 });
      }
      const formattedRawItems = cartItems.map(it => ({
        product_id: it.product?.id,
        product_name: it.product?.name,
        variant_name: it.variant?.name || 'Standard',
        price: Number(it.variant?.price || it.product?.price || 0),
        quantity: it.quantity
      }));

      // Validate stock availability before any order
      for (const ri of formattedRawItems) {
        const isStandard = ri.variant_name === 'Standard' || ri.variant_name === '' || !ri.variant_name;
        let dbStock = 0;
        if (isStandard) {
          const { data: dbProd, error: prodErr } = await supabase
            .from('products')
            .select('stock')
            .eq('id', ri.product_id)
            .maybeSingle();
          if (prodErr || !dbProd) {
            return new Response(JSON.stringify({ success: false, error: "Insufficient stock" }), { status: 400 });
          }
          dbStock = dbProd.stock;
        } else {
          const { data: dbVar, error: varErr } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('product_id', ri.product_id)
            .eq('variant_name', ri.variant_name)
            .maybeSingle();
          if (varErr || !dbVar) {
            return new Response(JSON.stringify({ success: false, error: "Insufficient stock" }), { status: 400 });
          }
          dbStock = dbVar.stock;
        }

        if (dbStock < ri.quantity) {
          return new Response(JSON.stringify({ success: false, error: "Insufficient stock" }), { status: 400 });
        }
      }

      const isCOD = paymentId.startsWith('cod_');

      if (!isCOD) {
        if (!paymentId || !razorpayOrderId || !razorpaySignature) {
          return new Response(JSON.stringify({ success: false, error: "Missing Paytm verification tokens." }), { status: 400 });
        }

        if (paytmMid && paytmMerchantKey) {
          try {
            const parsedParams = JSON.parse(razorpaySignature);
            const isChecksumValid = PaytmChecksum.verifySignature(parsedParams, paytmMerchantKey, parsedParams.CHECKSUMHASH);
            if (!isChecksumValid) {
              return new Response(JSON.stringify({ success: false, error: "Paytm signature verification failed. Security alert!" }), { status: 400 });
            }

            const statusQueryBody = {
              mid: paytmMid,
              orderId: razorpayOrderId
            };
            const queryChecksum = await PaytmChecksum.generateSignature(statusQueryBody, paytmMerchantKey);

            const statusQueryPayload = {
              body: statusQueryBody,
              head: {
                signature: queryChecksum
              }
            };

            const paytmHost = paytmEnvironment === 'prod' ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
            const statusRes = await fetch(`${paytmHost}/v3/order/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(statusQueryPayload)
            });

            if (!statusRes.ok) {
              throw new Error(`HTTP ${statusRes.status}`);
            }

            const queryResult = await statusRes.json();
            const queryBody = queryResult.body || {};
            const queryResultInfo = queryBody.resultInfo || {};
            const txnStatus = queryBody.status || queryResultInfo.resultStatus;

            if (txnStatus !== 'TXN_SUCCESS') {
              return new Response(JSON.stringify({ success: false, error: `Paytm payment status: ${queryResultInfo.resultMsg || txnStatus}` }), { status: 400 });
            }
          } catch (err) {
            if (isProd) {
              return new Response(JSON.stringify({ success: false, error: "Paytm payment verification failed: " + err.message }), { status: 500 });
            }
            console.warn("Paytm verification failed in development mode, bypassing check:", err.message);
          }
        } else if (isProd) {
          return new Response(JSON.stringify({ success: false, error: "Paytm credentials are missing in production environment." }), { status: 500 });
        }

        const { data: intent, error: fetchIntentErr } = await supabase
          .from('payment_intents')
          .select('*')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (fetchIntentErr || !intent) {
          return new Response(JSON.stringify({ success: false, error: "Payment checkout session not found or already consumed." }), { status: 400 });
        }

        if (new Date(intent.expires_at) < new Date()) {
          return new Response(JSON.stringify({ success: false, error: "Payment checkout session expired. Please re-check out." }), { status: 400 });
        }

        const clientCanonical = getCanonicalItemsString(cartItems);
        if (clientCanonical !== intent.expected_items) {
          return new Response(JSON.stringify({ success: false, error: "Cart items mismatch. The items in the checkout do not match the payment authorization." }), { status: 400 });
        }

        const clientTotalNum = parseFloat(String(total).replace(/[^0-9.]/g, ''));
        if (Math.abs(clientTotalNum - Number(intent.expected_total)) > 0.01) {
          return new Response(JSON.stringify({ success: false, error: "Cart total mismatch. The amount paid does not match the cart total." }), { status: 400 });
        }

      }
      let recalculated;
      try {
        recalculated = await calculateCartTotalOnServer(cartItems, couponCode || null, state, pincode, deliveryMethod, isGift === true || isGift === 'true');
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
      }

      if (isCOD) {
        const clientTotalNum = parseFloat(String(total).replace(/[^0-9.]/g, ''));
        if (Math.abs(clientTotalNum - recalculated.total) > 0.01) {
          return new Response(JSON.stringify({ success: false, error: "COD total mismatch. Cart total verification failed." }), { status: 400 });
        }
      }

      // Resolve giftCardLayoutId from payment intent if not supplied in body (for online payments)
      let finalLayoutId = giftCardLayoutId || null;
      if (!isCOD && razorpayOrderId && !finalLayoutId) {
        const { data: intent } = await supabase
          .from('payment_intents')
          .select('gift_card_layout_id')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();
        if (intent && intent.gift_card_layout_id) {
          finalLayoutId = intent.gift_card_layout_id;
        }
      }

      const { data: orderNumber, error: rpcErr } = await supabase.rpc('place_order_securely', {
        p_payment_id: paymentId,
        p_order_id: null,
        p_email: userEmail,
        p_name: name || `${fname} ${lname}`,
        p_phone: phone || '',
        p_address_id: addressId || null,
        p_shipping_address: shippingAddress || '',
        p_city: city || '',
        p_state: state || '',
        p_pincode: pincode || '',
        p_address_label: addressLabel || 'Home',
        p_total: isCOD ? recalculated.total : null,
        p_discount: recalculated.discount || 0,
        p_shipping: recalculated.shipping || 0,
        p_items_summary: items,
        p_raw_items: formattedRawItems,
        p_session_id: lockSessionId,
        p_razorpay_order_id: isCOD ? null : razorpayOrderId,
        p_gift_card_layout_id: finalLayoutId
      });

      if (rpcErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to securely place order: " + rpcErr.message }), { status: 500 });
      }

      if (deliveryMethod === 'Pickup') {
        await supabase.from('orders').update({ delivery_method: 'Pickup' }).eq('id', orderNumber);
      }

      if (!isCOD) {
        await supabase.from('payment_intents').delete().eq('razorpay_order_id', razorpayOrderId);
        try {
          recalculated = await calculateCartTotalOnServer(cartItems, couponCode || null, state, pincode, deliveryMethod, isGift === true || isGift === 'true');
        } catch (e) {
          recalculated = { subtotal: 0, discount: 0, shipping: 0, total: 0 };
        }
      }

      sendOrderConfirmation({
        email: userEmail,
        name: name || `${fname} ${lname}`,
        orderId: orderNumber,
        items: formattedRawItems,
        subtotal: recalculated.subtotal.toFixed(2),
        discount: recalculated.discount.toFixed(2),
        shipping: recalculated.shipping.toFixed(2),
        total: parseFloat(String(total).replace(/[^0-9.]/g, '')).toFixed(2),
        address: {
          fname: fname || (name?.split(' ')[0] || ''),
          lname: lname || (name?.split(' ').slice(1).join(' ') || ''),
          address: shippingAddress || '',
          city: city || '',
          state: state || '',
          pincode: pincode || '',
          phone: phone || ''
        },
        siteOrigin: new URL(request.url).origin,
        giftCardFee: (finalLayoutId || isGift === true || isGift === 'true') ? '50.00' : '0.00'
      });

      return new Response(JSON.stringify({ 
        success: true, 
        orderId: orderNumber, 
        message: "Secure transaction completed." 
      }), { status: 200 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // C3: JWT-authenticated address & profile actions
    // All actions below require a valid Supabase access token matching the email.
    // ─────────────────────────────────────────────────────────────────────────
    const isAuthAction = [
      'get_or_create_profile', 
      'add_address', 
      'edit_address', 
      'delete_address',
      'get_wishlist',
      'add_to_wishlist',
      'remove_from_wishlist'
    ].includes(body.action);
    if (isAuthAction) {
      const authedUser = await getAuthenticatedUser(request);
      if (!authedUser) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: invalid session." }), { status: 401 });
      }
      const requestedEmail = (body.email || '').toLowerCase().trim();
      if (authedUser.email?.toLowerCase() !== requestedEmail) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: email mismatch." }), { status: 403 });
      }
    }

    // M5: Shared helper — ensure user profile row exists
    async function ensureUserExists(email) {
      let { data: user } = await supabase.from('users').select('email').eq('email', email).maybeSingle();
      if (!user) {
        const { data: inserted, error } = await supabase.from('users').insert([{ email }]).select().maybeSingle();
        if (error) throw new Error("Profile sync failed: " + error.message);
        user = inserted;
      }
      return user;
    }

    if (body.action === 'get_or_create_profile') {
      const email = body.email.toLowerCase().trim();
      try { await ensureUserExists(email); } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
      }
      const { data: addresses } = await supabase.from('user_addresses').select('*').eq('user_email', email);
      return new Response(JSON.stringify({
        success: true,
        user: { email, addresses: addresses || [] }
      }), { status: 200 });
    }

    if (body.action === 'add_address') {
      const email = body.email.toLowerCase().trim();
      try { await ensureUserExists(email); } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
      }
      const { count, error: countErr } = await supabase.from('user_addresses')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', email)
        .neq('label', 'Pickup');
      if (countErr) console.error("Error checking address count:", countErr);
      if ((count || 0) >= 5) {
        return new Response(JSON.stringify({ success: false, error: 'Maximum of 5 saved addresses reached.' }), { status: 400 });
      }
      if (body.isDefault) {
        await supabase.from('user_addresses').update({ is_default: false }).eq('user_email', email);
      }
      const { data: newAddr, error } = await supabase.from('user_addresses').insert([{
        user_email: email,
        label: body.label || 'Home',
        fname: body.fname,
        lname: body.lname,
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        phone: body.phone,
        is_default: body.isDefault || false
      }]).select().single();
      if (error) return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true, address: newAddr }), { status: 200 });
    }

    if (body.action === 'edit_address') {
      const email = body.email.toLowerCase().trim();
      try { await ensureUserExists(email); } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
      }
      if (!body.addressId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing addressId.' }), { status: 400 });
      }
      if (body.isDefault) {
        await supabase.from('user_addresses').update({ is_default: false }).eq('user_email', email);
      }
      const { data: updatedAddr, error } = await supabase.from('user_addresses').update({
        label: body.label,
        fname: body.fname,
        lname: body.lname,
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        phone: body.phone,
        is_default: body.isDefault || false
      }).eq('id', body.addressId).eq('user_email', email).select().maybeSingle();
      if (error) return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      if (!updatedAddr) return new Response(JSON.stringify({ success: false, error: "Address not found." }), { status: 404 });
      return new Response(JSON.stringify({ success: true, address: updatedAddr }), { status: 200 });
    }

    if (body.action === 'delete_address') {
      const email = body.email.toLowerCase().trim();
      const { error } = await supabase.from('user_addresses').delete().eq('id', body.addressId).eq('user_email', email);
      if (error) return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }


    if (body.action === 'get_wishlist') {
      const email = body.email ? body.email.toLowerCase().trim() : '';
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: "Email is required." }), { status: 400 });
      }
      const { data, error } = await supabase
        .from('wishlist')
        .select('product_id, variant_name')
        .eq('user_email', email);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }

    if (body.action === 'add_to_wishlist') {
      const { email, product_id, variant_name } = body;
      const cleanEmail = email ? email.toLowerCase().trim() : '';
      const cleanVariant = variant_name ? variant_name.toLowerCase().trim() : '';
      if (!cleanEmail || !product_id || !cleanVariant) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields." }), { status: 400 });
      }
      const { error } = await supabase
        .from('wishlist')
        .upsert({
          user_email: cleanEmail,
          product_id,
          variant_name: cleanVariant
        }, { onConflict: 'user_email,product_id,variant_name' });
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (body.action === 'remove_from_wishlist') {
      const { email, product_id, variant_name } = body;
      const cleanEmail = email ? email.toLowerCase().trim() : '';
      const cleanVariant = variant_name ? variant_name.toLowerCase().trim() : '';
      if (!cleanEmail || !product_id || !cleanVariant) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields." }), { status: 400 });
      }
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_email', cleanEmail)
        .eq('product_id', product_id)
        .eq('variant_name', cleanVariant);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (body.action === 'track_order') {
      const rawQuery = (body.query || '').trim();
      if (!rawQuery || rawQuery.length < 5) {
        return new Response(JSON.stringify({ success: false, error: "Search query too short." }), { status: 400 });
      }
      const queryVal = rawQuery.toLowerCase();

      // H3: Push filtering to DB using .or() with sanitized inputs
      const sanitize = (s) => s.replace(/'/g, "''").replace(/,/g, '');
      const sanitizedQuery = sanitize(rawQuery);
      const sanitizedVal = sanitize(queryVal).replace(/[+\s]/g, '');
      const { data: matchedOrders, error: orderFetchErr } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${sanitizedQuery},shipping_email.eq.${sanitizedVal},shipping_phone.ilike.%${sanitizedVal}%`)
        .order('date', { ascending: false })
        .limit(50);

      if (orderFetchErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to query orders." }), { status: 500 });
      }

      const userMatches = matchedOrders || [];

      const matchedIds = userMatches.map(o => o.id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', matchedIds);

      const trackingPayload = userMatches.map(o => {
        const items = orderItems ? orderItems.filter(oi => oi.order_id === o.id) : [];
        return {
          id: o.id,
          date: o.date,
          total: `₹${o.total}`,
          status: o.status,
          shipping: o.shipping || 0,
          discount: o.discount || 0,
          trackingNumber: o.tracking_number,
          courier: o.courier,
          trackingLink: o.tracking_link || '',
          itemsString: o.items_summary,
          deliveryMethod: o.delivery_method || 'Shipping',
          shippingInfo: {
            fname: o.shipping_fname || '',
            lname: o.shipping_lname || '',
            email: o.shipping_email || '',
            address: o.shipping_address || '',
            city: o.shipping_city || '',
            state: o.shipping_state || '',
            pincode: o.shipping_pincode || '',
            phone: o.shipping_phone || ''
          },
          itemsBreakdown: items.map(it => ({
            name: it.product_name,
            variant: it.variant_name,
            price: it.price,
            quantity: it.quantity
          }))
        };
      });

      return new Response(JSON.stringify({ success: true, data: trackingPayload }), { status: 200 });
    }

    if (body.action === 'submit_feedback') {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized session token." }), { status: 401 });
      }

      const orderId = (body.orderId || '').trim();
      const rating = parseInt(body.rating) || 0;
      const comment = (body.comment || '').trim();

      if (!orderId) {
        return new Response(JSON.stringify({ success: false, error: "Missing Order ID." }), { status: 400 });
      }
      if (rating < 1 || rating > 5) {
        return new Response(JSON.stringify({ success: false, error: "Invalid rating." }), { status: 400 });
      }

      // Fetch order to link user_email and customer_name
      const { data: orderRow } = await supabase
        .from('orders')
        .select('shipping_email, shipping_fname, shipping_lname')
        .eq('id', orderId)
        .maybeSingle();

      if (!orderRow) {
        return new Response(JSON.stringify({ success: false, error: "Order not found." }), { status: 404 });
      }

      // Verify ownership: the verified user email must match the order's shipping email!
      if (orderRow.shipping_email?.toLowerCase() !== user.email.toLowerCase()) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: You do not own this order." }), { status: 403 });
      }

      const userEmail = orderRow.shipping_email;
      const customerName = `${orderRow.shipping_fname || ''} ${orderRow.shipping_lname || ''}`.trim();

      // Insert/update feedback record in feedbacks database table
      const { data, error } = await supabase
        .from('feedbacks')
        .upsert([{ 
          order_id: orderId,
          user_email: userEmail,
          customer_name: customerName,
          rating: rating, 
          comment: comment 
        }]);

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (body.action === 'save_gift_card_layout') {
      const { id, templatePath, elements } = body;
      if (!id || templatePath === undefined || !elements) {
        return new Response(JSON.stringify({ success: false, error: "Missing required layout fields." }), { status: 400 });
      }
      
      const { error } = await supabase
        .from('gift_card_layouts')
        .upsert([{
          id,
          template_path: templatePath,
          elements
        }]);

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: "Action route exception." }), { status: 400 });

  } catch (err) {
    return jsonRes({ success: false, error: err.message }, 500);
  }
}
