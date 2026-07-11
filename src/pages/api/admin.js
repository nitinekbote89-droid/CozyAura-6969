import { createClient } from '@supabase/supabase-js';
import { sendOrderShipped } from '../../lib/email.js';

const supabase = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

async function autoCleanInactiveVariants() {
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
  } catch (err) {
    console.error("Auto cleanup error:", err);
  }
}

async function uploadToCloudinary(base64Payload, identifierToken) {
  try {
    const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureContextString = `public_id=${identifierToken}&timestamp=${timestamp}${apiSecret}`;

    const crypto = await import('crypto');
    const signature = crypto.createHash('sha256').update(signatureContextString).digest('hex');

    const formData = new URLSearchParams();
    formData.append('file', base64Payload);
    formData.append('public_id', identifierToken);
    formData.append('signature_algorithm', 'sha256');
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const parsedAsset = await cloudinaryResponse.json();
    const url = parsedAsset.secure_url || "";
    if (url && url.includes('/image/upload/')) {
      const maxWidth = 800;
      return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:eco,w_${maxWidth}/`);
    }
    return url;
  } catch (e) {
    console.error("Cloudinary upload error:", e);
    return base64Payload;
  }
}

async function deleteFromCloudinary(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  try {
    const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary credentials missing for deletion.");
      return;
    }
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const bodyParams = new URLSearchParams();
    publicIds.forEach(id => bodyParams.append('public_ids[]', id));
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to delete from Cloudinary:", errText);
    } else {
      console.log("Successfully deleted from Cloudinary:", publicIds);
    }
  } catch (err) {
    console.error("Error deleting from Cloudinary:", err);
  }
}

function extractPublicId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'res.cloudinary.com' && !parsed.hostname.endsWith('.cloudinary.com')) {
      return null;
    }
    const parts = url.split('/image/upload/');
    if (parts.length < 2) return null;
    let subPath = parts[1];
    subPath = subPath.replace(/^(?:.*\/)?v\d+\//, '');
    const dotIdx = subPath.lastIndexOf('.');
    if (dotIdx !== -1) {
      subPath = subPath.substring(0, dotIdx);
    }
    return subPath;
  } catch (e) {
    return null;
  }
}

function optimizeImageUrl(url, width) {
  if (!url || !url.includes('/image/upload/')) return url;
  if (url.includes('/image/upload/f_auto')) {
    let result = url.replace(/([,/])w_\d+/, `$1w_${width}`);
    result = result.replace(/,q_auto(?![:\w])/, ',q_auto:eco');
    return result;
  }
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:eco,w_${width}/`);
}

async function executeCloudinaryCleanup() {
  try {
    // 1. Fetch all products, product_variants, and storefront images to get active images
    const { data: dbProducts } = await supabase.from('products').select('cover_image');
    const { data: dbVariants } = await supabase.from('product_variants').select('image_url');
    const { data: dbSettings } = await supabase.from('settings').select('value').eq('key', 'STOREFRONT_IMAGES').maybeSingle();
    const storefrontImages = dbSettings?.value || {};

    const activePublicIds = new Set();

    if (dbProducts) {
      dbProducts.forEach(p => {
        const id = extractPublicId(p.cover_image);
        if (id) activePublicIds.add(id);
      });
    }

    if (dbVariants) {
      dbVariants.forEach(v => {
        const id = extractPublicId(v.image_url);
        if (id) activePublicIds.add(id);
      });
    }

    if (storefrontImages) {
      Object.values(storefrontImages).forEach(val => {
        if (val && typeof val === 'string') {
          const id = extractPublicId(val);
          if (id) activePublicIds.add(id);
        }
      });
    }

    // 2. Fetch all images from Cloudinary using Admin API
    const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ success: false, error: "Cloudinary credentials missing." }), { status: 500 });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const fetchRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=500`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return new Response(JSON.stringify({ success: false, error: "Failed to query Cloudinary list: " + errText }), { status: 500 });
    }

    const cloudData = await fetchRes.json();
    const unusedPublicIds = [];

    if (cloudData.resources) {
      for (const r of cloudData.resources) {
        // Only check and delete images created by this store (starts with cover_, var_, or sf_) to be safe
        if (r.public_id.startsWith('cover_') || r.public_id.startsWith('var_') || r.public_id.startsWith('sf_')) {
          if (!activePublicIds.has(r.public_id)) {
            unusedPublicIds.push(r.public_id);
          }
        }
      }
    }

    // 3. Delete unused images from Cloudinary in bulk
    let deletedCount = 0;
    if (unusedPublicIds.length > 0) {
      const bodyParams = new URLSearchParams();
      unusedPublicIds.forEach(id => {
        bodyParams.append('public_ids[]', id);
      });

      const deleteRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      if (!deleteRes.ok) {
        const errText = await deleteRes.text();
        return new Response(JSON.stringify({ success: false, error: "Failed to delete unused assets from Cloudinary: " + errText }), { status: 500 });
      }
      deletedCount = unusedPublicIds.length;
    }

    return new Response(JSON.stringify({ success: true, deletedCount, deletedIds: unusedPublicIds }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

// Background scheduler for long-running server instances
let isSchedulerRunning = false;
function runCleanupInBackground() {
  console.log("[Scheduler] Starting automatic daily Cloudinary image cleanup...");
  executeCloudinaryCleanup()
    .then(res => res.json())
    .then(json => {
      console.log(`[Scheduler] Automatic cleanup finished. Deleted ${json.deletedCount || 0} assets.`);
    })
    .catch(err => {
      console.error("[Scheduler] Automatic cleanup error:", err);
    });
}

function startAutomaticCleanupSchedule() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  const targetHour = 15; // 3:00 PM (15:00) daily
  const now = new Date();
  let nextTrigger = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, 0, 0, 0);
  if (nextTrigger <= now) {
    nextTrigger.setDate(nextTrigger.getDate() + 1);
  }
  const delay = nextTrigger - now;
  console.log(`[Scheduler] Image cleanup scheduled daily at 3:00 PM. Next run in ${(delay / 1000 / 60 / 60).toFixed(2)} hours.`);

  setTimeout(() => {
    runCleanupInBackground();
    setInterval(runCleanupInBackground, 24 * 60 * 60 * 1000);
  }, delay);
}

// Start schedule on load
if (typeof process !== 'undefined') {
  startAutomaticCleanupSchedule();
}

export async function GET({ request }) {
  try {
    await autoCleanInactiveVariants();
    const url = new URL(request.url);
    const adminSecret = import.meta.env.ADMIN_SECRET;
    if (!adminSecret) {
      return new Response(JSON.stringify({ success: false, error: "Server misconfiguration: ADMIN_SECRET not set." }), { status: 503 });
    }
    if (request.headers.get('x-admin-secret') !== adminSecret) {
      return new Response(JSON.stringify({ success: false, error: "Access Denied." }), { status: 401 });
    }

    const action = url.searchParams.get('action');
    if (action === 'clean_unused_images') {
      return await executeCloudinaryCleanup();
    }

    // ─── GET GREETING CARD ASSETS ───────────────────────────────────────────
    if (action === 'get_greeting_card_assets') {
      const [{ data: templates, error: tErr }, { data: stickers, error: sErr }] = await Promise.all([
        supabase.from('card_templates').select('*').order('created_at', { ascending: true }),
        supabase.from('stickers').select('*').order('created_at', { ascending: true })
      ]);
      
      if (tErr || sErr) {
        return new Response(JSON.stringify({ success: false, error: (tErr?.message || sErr?.message) }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true, templates: templates || [], stickers: stickers || [] }), { status: 200 });
    }

    // ─── GET CUSTOMER PROFILE ────────────────────────────────────────────────
    if (action === 'get_customer_profile') {
      const email = (url.searchParams.get('email') || '').trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: 'Email parameter required.' }), { status: 400 });
      }

      const [{ data: addrs }, { data: orders }, { data: wishlist }] = await Promise.all([
        supabase.from('user_addresses').select('user_email, fname, lname, phone, is_default').eq('user_email', email).limit(5),
        supabase.from('orders').select('id, total, status, date, delivery_method').eq('shipping_email', email).order('date', { ascending: false }).limit(200),
        supabase.from('wishlist').select('product_id, variant_name').eq('user_email', email).limit(100)
      ]);

      // Resolve best name + phone from addresses or orders
      const defaultAddr = (addrs || []).find(a => a.is_default) || (addrs || [])[0];
      let fname = defaultAddr?.fname || '';
      let lname = defaultAddr?.lname || '';
      let phone = defaultAddr?.phone || '';

      if ((!fname || !lname) && orders && orders.length > 0) {
        const latestOrder = orders[0];
        if (!fname) fname = latestOrder.shipping_fname || '';
        if (!lname) lname = latestOrder.shipping_lname || '';
        if (!phone) phone = latestOrder.shipping_phone || '';
      }

      const customer = {
        email,
        fname: (fname || '').trim(),
        lname: (lname || '').trim(),
        phone: (phone || '').trim(),
        ordersCount: (orders || []).length,
        wishlistCount: (wishlist || []).length,
        recentOrders: (orders || []).map(o => ({
          id: o.id,
          total: o.total,
          status: o.status,
          date: o.date,
          deliveryMethod: o.delivery_method || 'Shipping'
        }))
      };

      return new Response(JSON.stringify({ success: true, customer }), { status: 200 });
    }

    // ─── GET GIFT CARD LAYOUT ───────────────────────────────────────────────
    if (action === 'get_gift_card_layout') {
      const layoutId = (url.searchParams.get('layoutId') || '').trim();
      if (!layoutId) {
        return new Response(JSON.stringify({ success: false, error: 'Layout ID required.' }), { status: 400 });
      }

      const { data: layout, error } = await supabase
        .from('gift_card_layouts')
        .select('*')
        .eq('id', layoutId)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      if (!layout) {
        return new Response(JSON.stringify({ success: false, error: 'Layout not found.' }), { status: 404 });
      }

      return new Response(JSON.stringify({ success: true, layout }), { status: 200 });
    }

    // ─── GET ORDER DETAILS ──────────────────────────────────────────────────
    if (action === 'get_order_details') {
      const orderId = (url.searchParams.get('orderId') || '').trim();
      if (!orderId) {
        return new Response(JSON.stringify({ success: false, error: 'Order ID required.' }), { status: 400 });
      }

      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (!o) {
        return new Response(JSON.stringify({ success: false, error: 'Order not found.' }), { status: 404 });
      }

      const { data: order_items } = await supabase.from('order_items').select('*').eq('order_id', o.id);

      const structuralItems = (order_items || []).map(m => ({
        product: { id: m.product_id, name: m.product_name, price: m.price },
        variant: { name: m.variant_name, price: m.price },
        quantity: m.quantity
      }));

      const compositeOrder = {
        id: o.id, date: o.date, total: `₹ ${o.total}`,
        discount: o.discount || 0, shipping: o.shipping || 0,
        status: o.status,
        deliveryMethod: o.delivery_method || 'Shipping',
        trackingNumber: o.tracking_number, courier: o.courier,
        trackingLink: o.tracking_link || '',
        itemsSummary: o.items_summary || '',
        giftCardLayoutId: o.gift_card_layout_id || null,
        shippingInfo: {
          fname: o.shipping_fname || '',
          lname: o.shipping_lname || '',
          email: o.shipping_email || '',
          address: o.shipping_address || '',
          city: o.shipping_city || '',
          state: o.shipping_state || '',
          pincode: o.shipping_pincode || '',
          phone: o.shipping_phone || '',
          whatsapp: o.shipping_phone || ''
        },
        items: structuralItems
      };

      return new Response(JSON.stringify({ success: true, order: compositeOrder }), { status: 200 });
    }

    // ─── SERVER-SIDE CUSTOMER SEARCH ────────────────────────────────────────
    if (action === 'search_customers') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (!q || q.length < 2) {
        return new Response(JSON.stringify({ success: true, customers: [] }), { status: 200 });
      }

      // Search users table by email
      const { data: usersByEmail } = await supabase
        .from('users')
        .select('email')
        .ilike('email', `%${q}%`)
        .limit(30);

      // Search user_addresses by name or phone
      const { data: addrMatches } = await supabase
        .from('user_addresses')
        .select('user_email, fname, lname, phone, is_default')
        .or(`fname.ilike.%${q}%,lname.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(30);

      // Search orders by shipping email (catches guest customers too)
      const { data: orderMatches } = await supabase
        .from('orders')
        .select('shipping_email, shipping_fname, shipping_lname, shipping_phone, id, total, status, date')
        .ilike('shipping_email', `%${q}%`)
        .order('date', { ascending: false })
        .limit(30);

      // Collect all unique emails from all sources
      const emailSet = new Set();
      (usersByEmail || []).forEach(u => { if (u.email) emailSet.add(u.email.toLowerCase().trim()); });
      (addrMatches || []).forEach(a => { if (a.user_email) emailSet.add(a.user_email.toLowerCase().trim()); });
      (orderMatches || []).forEach(o => { if (o.shipping_email) emailSet.add(o.shipping_email.toLowerCase().trim()); });

      if (emailSet.size === 0) {
        return new Response(JSON.stringify({ success: true, customers: [] }), { status: 200 });
      }

      // For each found email, fetch their full profile in parallel
      const emailArr = Array.from(emailSet).slice(0, 30);
      const profilePromises = emailArr.map(async (email) => {
        const [{ data: addrs }, { data: orders }, { data: wishlist }] = await Promise.all([
          supabase.from('user_addresses').select('user_email, fname, lname, phone, is_default').eq('user_email', email).limit(5),
          supabase.from('orders').select('id, total, status, date, delivery_method').eq('shipping_email', email).order('date', { ascending: false }).limit(200),
          supabase.from('wishlist').select('product_id, variant_name').eq('user_email', email).limit(100)
        ]);

        // Resolve best name + phone from addresses or orders
        const defaultAddr = (addrs || []).find(a => a.is_default) || (addrs || [])[0];
        let fname = defaultAddr?.fname || '';
        let lname = defaultAddr?.lname || '';
        let phone = defaultAddr?.phone || '';

        if ((!fname || !lname) && orders && orders.length > 0) {
          const latestOrder = orders[0];
          if (!fname) fname = latestOrder.shipping_fname || '';
          if (!lname) lname = latestOrder.shipping_lname || '';
          if (!phone) phone = latestOrder.shipping_phone || '';
        }

        return {
          email,
          fname: (fname || '').trim(),
          lname: (lname || '').trim(),
          phone: (phone || '').trim(),
          ordersCount: (orders || []).length,
          wishlistCount: (wishlist || []).length,
          recentOrders: (orders || []).map(o => ({
            id: o.id,
            total: o.total,
            status: o.status,
            date: o.date,
            deliveryMethod: o.delivery_method || 'Shipping'
          }))
        };
      });

      const customers = await Promise.all(profilePromises);
      return new Response(JSON.stringify({ success: true, customers }), { status: 200 });
    }

    // Pagination: 200 orders per page
    const PAGE_SIZE = 200;
    const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));
    const pageStart = page * PAGE_SIZE;
    const pageEnd = pageStart + PAGE_SIZE - 1;

    // Pagination for users
    const USER_PAGE_SIZE = 100;
    const userPage = Math.max(0, parseInt(url.searchParams.get('userPage') || '0', 10));
    const userPageStart = userPage * USER_PAGE_SIZE;
    const userPageEnd = userPageStart + USER_PAGE_SIZE - 1;

    // Pagination for feedbacks
    const FEEDBACK_PAGE_SIZE = 100;
    const feedbackPage = Math.max(0, parseInt(url.searchParams.get('feedbackPage') || '0', 10));
    const feedbackPageStart = feedbackPage * FEEDBACK_PAGE_SIZE;
    const feedbackPageEnd = feedbackPageStart + FEEDBACK_PAGE_SIZE - 1;

    let dbProducts = [];
    let hasSalesView = false;
    try {
      const { data, error } = await supabase.from('products_with_sales').select('*');
      if (data && !error) {
        dbProducts = data;
        hasSalesView = true;
      }
    } catch (e) {
      console.warn("View products_with_sales not available, using fallback calculation.");
    }

    if (!hasSalesView) {
      const { data } = await supabase.from('products').select('*');
      dbProducts = data || [];
    }

    const tab = url.searchParams.get('tab') || 'dashboard';
    const searchQuery = url.searchParams.get('q') || '';

    let ordersQuery = supabase.from('orders').select('*', { count: 'exact' }).order('date', { ascending: false });
    if (searchQuery.trim()) {
      const trimmed = searchQuery.trim();
      const withHash = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
      ordersQuery = ordersQuery.or(`id.eq.${trimmed},id.eq.${withHash},shipping_email.ilike.%${trimmed}%,shipping_fname.ilike.%${trimmed}%,shipping_lname.ilike.%${trimmed}%`);
    }
    ordersQuery = ordersQuery.range(pageStart, pageEnd);

    const promises = [
      supabase.from('product_variants').select('*'),
      ordersQuery,
      supabase.from('coupons').select('*'),
      supabase.from('settings').select('*').eq('key', 'GLOBAL_FRAGRANCES').single(),
      supabase.from('settings').select('*').eq('key', 'STOREFRONT_IMAGES').single(),
      supabase.from('settings').select('*').eq('key', 'site_views_daily').maybeSingle(),
    ];

    let usersPromiseIdx = -1;
    let addressesPromiseIdx = -1;
    let wishlistPromiseIdx = -1;
    let feedbacksPromiseIdx = -1;
    let messagesPromiseIdx = -1;
    let ordersEmailsPromiseIdx = -1;
    let wishlistEmailsPromiseIdx = -1;

    if (tab === 'customers') {
      let usersQuery = supabase.from('users').select('email', { count: 'exact' }).order('email', { ascending: true });
      if (searchQuery.trim()) {
        usersQuery = usersQuery.ilike('email', `%${searchQuery.trim()}%`);
      }
      usersQuery = usersQuery.range(userPageStart, userPageEnd);

      usersPromiseIdx = promises.push(usersQuery) - 1;
      addressesPromiseIdx = promises.push(supabase.from('user_addresses').select('user_email, fname, lname, phone, is_default').limit(500)) - 1;
      wishlistPromiseIdx = promises.push(supabase.from('wishlist').select('user_email, product_id, variant_name').limit(500)) - 1;
      ordersEmailsPromiseIdx = promises.push(supabase.from('orders').select('shipping_email')) - 1;
      wishlistEmailsPromiseIdx = promises.push(supabase.from('wishlist').select('user_email')) - 1;
    } else if (tab === 'feedback') {
      let feedbacksQuery = supabase.from('feedbacks').select('*, users(email)', { count: 'exact' }).order('created_at', { ascending: false });
      if (searchQuery.trim()) {
        feedbacksQuery = feedbacksQuery.or(`user_email.ilike.%${searchQuery.trim()}%,comment.ilike.%${searchQuery.trim()}%`);
      }
      feedbacksQuery = feedbacksQuery.range(feedbackPageStart, feedbackPageEnd);
      feedbacksPromiseIdx = promises.push(feedbacksQuery) - 1;

      let messagesQuery = supabase.from('messages').select('*, users(email)', { count: 'exact' }).order('id', { ascending: false });
      if (searchQuery.trim()) {
        messagesQuery = messagesQuery.or(`name.ilike.%${searchQuery.trim()}%,user_email.ilike.%${searchQuery.trim()}%,phone.ilike.%${searchQuery.trim()}%,subject.ilike.%${searchQuery.trim()}%,message.ilike.%${searchQuery.trim()}%`);
      }
      messagesQuery = messagesQuery.range(feedbackPageStart, feedbackPageEnd);
      messagesPromiseIdx = promises.push(messagesQuery) - 1;
    }

    const results = await Promise.all(promises);

    const product_variants = results[0].data;
    const orders = results[1].data;
    const totalOrderCount = results[1].count;
    const coupons = results[2].data;
    const settings = results[3].data;
    const storefront_images_setting = results[4].data;
    const site_views_setting = results[5].data;
    
    const dailyViewsMap = site_views_setting?.value || {};
    let totalViews = 0;
    Object.values(dailyViewsMap).forEach(v => {
      totalViews += (Number(v) || 0);
    });

    const todayStr = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');

    const todayViews = dailyViewsMap[todayStr] || 0;

    const viewsHistory = Object.entries(dailyViewsMap).map(([date, count]) => ({
      date,
      count: Number(count) || 0
    })).sort((a, b) => b.date.localeCompare(a.date));

    const users = usersPromiseIdx !== -1 ? results[usersPromiseIdx].data : [];
    let totalUserCount = usersPromiseIdx !== -1 ? results[usersPromiseIdx].count : 0;
    if (usersPromiseIdx === -1) {
      const { count: dbUsersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      totalUserCount = dbUsersCount || 0;
    }
    const user_addresses = addressesPromiseIdx !== -1 ? results[addressesPromiseIdx].data : [];
    const wishlist = wishlistPromiseIdx !== -1 ? results[wishlistPromiseIdx].data : [];
    const feedbacks = feedbacksPromiseIdx !== -1 ? results[feedbacksPromiseIdx].data : [];
    const totalFeedbackCount = feedbacksPromiseIdx !== -1 ? results[feedbacksPromiseIdx].count : 0;
    const messages = messagesPromiseIdx !== -1 ? results[messagesPromiseIdx].data : [];
    const totalMessagesCount = messagesPromiseIdx !== -1 ? results[messagesPromiseIdx].count : 0;
    const allOrdersEmails = ordersEmailsPromiseIdx !== -1 ? results[ordersEmailsPromiseIdx].data : [];
    const allWishlistEmails = wishlistEmailsPromiseIdx !== -1 ? results[wishlistEmailsPromiseIdx].data : [];

    // Only fetch order_items for the current page's orders (not all 5000)
    const currentPageOrderIds = (orders || []).map(o => o.id);
    const { data: order_items } = currentPageOrderIds.length > 0
      ? await supabase.from('order_items').select('*').in('order_id', currentPageOrderIds)
      : { data: [] };

    const totalPages = Math.ceil((totalOrderCount || 0) / PAGE_SIZE);
    const totalUserPages = Math.ceil((totalUserCount || 0) / USER_PAGE_SIZE);
    const totalFeedbackPages = Math.ceil((totalFeedbackCount || 0) / FEEDBACK_PAGE_SIZE);
    const totalMessagePages = Math.ceil((totalMessagesCount || 0) / FEEDBACK_PAGE_SIZE);

    const ordersCountMap = {};
    (allOrdersEmails || []).forEach(o => {
      const em = o.shipping_email?.toLowerCase().trim();
      if (em) ordersCountMap[em] = (ordersCountMap[em] || 0) + 1;
    });

    const wishlistCountMap = {};
    (allWishlistEmails || []).forEach(w => {
      const em = w.user_email?.toLowerCase().trim();
      if (em) wishlistCountMap[em] = (wishlistCountMap[em] || 0) + 1;
    });

    let salesMap = {};
    if (!hasSalesView && order_items) {
      order_items.forEach(item => {
        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
      });
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

    const variantsByProductId = {};
    (product_variants || []).forEach(v => {
      if (!variantsByProductId[v.product_id]) variantsByProductId[v.product_id] = [];
      variantsByProductId[v.product_id].push(v);
    });

    const deepInventoryMap = dbProducts.map(p => {
      const vars = variantsByProductId[p.id] || [];
      let fragranceStocks = {};
      let fragranceImages = {};
      vars.forEach(v => {
        fragranceStocks[v.variant_name] = v.stock;
        if(v.image_url) fragranceImages[v.variant_name] = v.image_url;
      });
      return {
        id: p.id, name: p.name, category: p.category, price: p.price, weight: p.weight, stock: p.stock,
        coverImage: p.cover_image, description: p.description, specifications: p.specifications,
        fragranceStocks, fragranceImages, totalSales: hasSalesView ? (p.total_sales || 0) : (salesMap[p.id] || 0),
        salesRank: hasSalesView ? (p.sales_rank || null) : null,
        requests: requestsMap[p.id] || 0,
        fragranceRequests: fragranceRequestsMap[p.id] || {}
      };
    });

    const compositeOrders = orders ? orders.map(o => {
      const matches = order_items.filter(oi => oi.order_id === o.id);
      const structuralItems = matches.map(m => ({
        product: { id: m.product_id, name: m.product_name, price: m.price },
        variant: { name: m.variant_name, price: m.price },
        quantity: m.quantity
      }));
      return {
        id: o.id, date: o.date, total: `₹ ${o.total}`,
        discount: o.discount || 0, shipping: o.shipping || 0,
        status: o.status,
        deliveryMethod: o.delivery_method || 'Shipping',
        trackingNumber: o.tracking_number, courier: o.courier,
        trackingLink: o.tracking_link || '',
        itemsSummary: o.items_summary || '',
        giftCardLayoutId: o.gift_card_layout_id || null,
        shippingInfo: {
          fname: o.shipping_fname || '',
          lname: o.shipping_lname || '',
          email: o.shipping_email || '',
          address: o.shipping_address || '',
          city: o.shipping_city || '',
          state: o.shipping_state || '',
          pincode: o.shipping_pincode || '',
          phone: o.shipping_phone || '',
          whatsapp: o.shipping_phone || ''
        },
        items: structuralItems
      };
    }) : [];

    return new Response(JSON.stringify({
      success: true,
      data: {
        inventory: deepInventoryMap,
        orders: compositeOrders,
        coupons,
        fragrances: settings ? settings.value : [],
        storefrontImages: storefront_images_setting ? storefront_images_setting.value : null,
        siteViewsToday: todayViews,
        siteViewsTotal: totalViews,
        siteViewsHistory: viewsHistory,
        ...(tab === 'customers' ? {
          users: users || [],
          userAddresses: user_addresses || [],
          wishlist: wishlist || []
        } : {}),
        ...(tab === 'feedback' ? {
          feedbacks: feedbacks || [],
          messages: messages || []
        } : {}),
        ordersCountMap,
        wishlistCountMap,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          totalOrders: totalOrderCount || 0,
          totalPages,
          userPage,
          userPageSize: USER_PAGE_SIZE,
          totalUsers: totalUserCount || 0,
          totalUserPages,
          feedbackPage,
          feedbackPageSize: FEEDBACK_PAGE_SIZE,
          totalFeedbacks: totalFeedbackCount || 0,
          totalFeedbackPages,
          totalMessages: totalMessagesCount || 0,
          totalMessagePages
        }
      }
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    await autoCleanInactiveVariants();
    const data = await request.json();
    const adminSecretPost = import.meta.env.ADMIN_SECRET;
    if (!adminSecretPost) {
      return new Response(JSON.stringify({ success: false, error: "Server misconfiguration: ADMIN_SECRET not set." }), { status: 503 });
    }
    if (data.adminSecret !== adminSecretPost) {
      return new Response(JSON.stringify({ success: false, error: "Access Denied." }), { status: 401 });
    }

    const { action } = data;

    if (action === 'clean_unused_images') {
      return await executeCloudinaryCleanup();
    }

    if (action === 'verify_secret') {
      return new Response(JSON.stringify({ success: true, message: "Access Authorized" }), { status: 200 });
    }

    if (action === 'add_card_template') {
      const { name, base64Image } = data;
      if (!name || !base64Image) {
        return new Response(JSON.stringify({ success: false, error: "Missing required template fields." }), { status: 400 });
      }
      const publicId = `card_temp_${Date.now()}`;
      const url = await uploadToCloudinary(base64Image, publicId);
      const imageUrl = optimizeImageUrl(url, 800);
      
      const { data: newTemplate, error } = await supabase
        .from('card_templates')
        .insert([{ name, image_url: imageUrl }])
        .select('*')
        .single();
        
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true, template: newTemplate }), { status: 200 });
    }

    if (action === 'delete_card_template') {
      const { id } = data;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "Missing template ID." }), { status: 400 });
      }
      const { data: template } = await supabase.from('card_templates').select('image_url').eq('id', id).maybeSingle();
      if (template && template.image_url) {
        const publicId = extractPublicId(template.image_url);
        if (publicId) {
          await deleteFromCloudinary([publicId]);
        }
      }
      
      const { error } = await supabase.from('card_templates').delete().eq('id', id);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'add_sticker') {
      const { name, base64Image } = data;
      if (!name || !base64Image) {
        return new Response(JSON.stringify({ success: false, error: "Missing required sticker fields." }), { status: 400 });
      }
      const publicId = `sticker_${Date.now()}`;
      const url = await uploadToCloudinary(base64Image, publicId);
      const imageUrl = optimizeImageUrl(url, 200);
      
      const { data: newSticker, error } = await supabase
        .from('stickers')
        .insert([{ name, image_url: imageUrl }])
        .select('*')
        .single();
        
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true, sticker: newSticker }), { status: 200 });
    }

    if (action === 'delete_sticker') {
      const { id } = data;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "Missing sticker ID." }), { status: 400 });
      }
      const { data: sticker } = await supabase.from('stickers').select('image_url').eq('id', id).maybeSingle();
      if (sticker && sticker.image_url) {
        const publicId = extractPublicId(sticker.image_url);
        if (publicId) {
          await deleteFromCloudinary([publicId]);
        }
      }
      
      const { error } = await supabase.from('stickers').delete().eq('id', id);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'save_product') {
      // Fetch existing product to identify if the cover image is replaced
      const { data: oldProduct } = await supabase.from('products').select('cover_image').eq('id', data.product.id).maybeSingle();

      let liveCoverUrl = data.product.coverImage;
      if (liveCoverUrl && liveCoverUrl.startsWith("data:image")) {
        liveCoverUrl = await uploadToCloudinary(liveCoverUrl, `cover_${data.product.id}`);
      }
      liveCoverUrl = optimizeImageUrl(liveCoverUrl, 1920);

      const { error: upsertErr } = await supabase.from('products').upsert({
        id: data.product.id,
        name: data.product.name,
        category: data.product.category,
        price: data.product.price,
        weight: data.product.weight,
        stock: data.product.stock,
        cover_image: liveCoverUrl,
        description: data.product.description,
        specifications: data.product.specifications
      });
      if (upsertErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to save product: " + upsertErr.message }), { status: 500 });
      }

      const { data: existingVariants } = await supabase.from('product_variants').select('*').eq('product_id', data.product.id);

      const submittedFragrances = data.product.fragranceStocks || {};
      const submittedImages = data.product.fragranceImages || {};

      for (const existing of existingVariants || []) {
        if (!(existing.variant_name in submittedFragrances)) {
          if (existing.stock > 0) {
            submittedFragrances[existing.variant_name] = existing.stock;
            if (existing.image_url && !submittedImages[existing.variant_name]) {
              submittedImages[existing.variant_name] = existing.image_url;
            }
          }
        }
      }

      // Collect orphaned public IDs to delete from Cloudinary
      const publicIdsToDelete = [];
      if (oldProduct && oldProduct.cover_image && data.product.coverImage && data.product.coverImage.startsWith("data:image")) {
        const oldCoverPid = extractPublicId(oldProduct.cover_image);
        if (oldCoverPid) publicIdsToDelete.push(oldCoverPid);
      }

      if (existingVariants) {
        existingVariants.forEach(ev => {
          const fragName = ev.variant_name;
          const willKeep = (fragName in submittedFragrances);
          const newImg = submittedImages[fragName];
          if (!willKeep || (ev.image_url && newImg && newImg.startsWith("data:image"))) {
            const oldVarPid = extractPublicId(ev.image_url);
            if (oldVarPid) {
              publicIdsToDelete.push(oldVarPid);
            }
          }
        });
      }

      if (publicIdsToDelete.length > 0) {
        await deleteFromCloudinary(publicIdsToDelete);
      }

      // Upload variant images in parallel first
      const variantRows = [];
      await Promise.all(Object.entries(submittedFragrances).map(async ([fragranceName, stockCount]) => {
        let variantMediaUrl = submittedImages[fragranceName] || "";
        if (variantMediaUrl && variantMediaUrl.startsWith("data:image")) {
          variantMediaUrl = await uploadToCloudinary(variantMediaUrl, `var_${data.product.id}_${fragranceName.replace(/\s+/g, '')}`);
        }
        variantMediaUrl = optimizeImageUrl(variantMediaUrl, 1920);
        variantRows.push({
          product_id: data.product.id,
          variant_name: fragranceName,
          stock: stockCount,
          image_url: variantMediaUrl
        });
      }));

      // Atomic variant delete-then-insert via Postgres RPC (H9)
      const variantsPayload = variantRows.map(vr => ({
        variant_name: vr.variant_name,
        stock: vr.stock,
        image_url: vr.image_url
      }));
      const { error: rpcErr } = await supabase.rpc('save_product_variants', {
        p_product_id: data.product.id,
        p_variants: variantsPayload
      });
      if (rpcErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to save variants: " + rpcErr.message }), { status: 500 });
      }

      // Clear back-in-stock requests for restocked items/variants
      try {
        if (data.product.stock > 0) {
          await supabase.from('back_in_stock_requests')
            .delete()
            .eq('product_id', data.product.id)
            .in('variant_name', ['standard', 'Standard', '']);
        }
        const restockedVariants = Object.entries(submittedFragrances)
          .filter(([_, stockCount]) => stockCount > 0)
          .map(([fragranceName, _]) => fragranceName);

        if (restockedVariants.length > 0) {
          const variantNamesToDelete = [];
          restockedVariants.forEach(v => {
            variantNamesToDelete.push(v);
            variantNamesToDelete.push(v.toLowerCase().trim());
          });

          await supabase.from('back_in_stock_requests')
            .delete()
            .eq('product_id', data.product.id)
            .in('variant_name', variantNamesToDelete);
        }
      } catch (err) {
        console.error("Failed to clear back in stock requests:", err);
      }

      const { error: refreshErr } = await supabase.rpc('refresh_sales_view');
      if (refreshErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to refresh catalog: " + refreshErr.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'delete_product') {
      const { data: prod } = await supabase.from('products').select('cover_image').eq('id', data.productId).maybeSingle();
      const { data: variants } = await supabase.from('product_variants').select('image_url').eq('product_id', data.productId);

      await supabase.from('product_variants').delete().eq('product_id', data.productId);

      const { error: delProdErr } = await supabase.from('products').delete().eq('id', data.productId);
      if (delProdErr) return new Response(JSON.stringify({ success: false, error: delProdErr.message }), { status: 500 });

      const publicIds = [];
      const pid = extractPublicId(prod?.cover_image);
      if (pid) publicIds.push(pid);
      if (variants) variants.forEach(v => { const id = extractPublicId(v.image_url); if (id && !publicIds.includes(id)) publicIds.push(id); });
      if (publicIds.length > 0) {
        await deleteFromCloudinary(publicIds);
      }

      const { error: refreshErr } = await supabase.rpc('refresh_sales_view');
      if (refreshErr) {
        return new Response(JSON.stringify({ success: false, error: "Failed to refresh catalog: " + refreshErr.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'delete_order') {
      const { error: delOrdErr } = await supabase.from('orders').delete().eq('id', data.orderId);
      if (delOrdErr) return new Response(JSON.stringify({ success: false, error: delOrdErr.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'update_tracking') {
      const { error: trackErr } = await supabase.from('orders').update({
        status: data.status,
        tracking_number: data.trackingNo,
        courier: data.courier,
        tracking_link: data.trackingLink || ''
      }).eq('id', data.orderId);
      if (trackErr) return new Response(JSON.stringify({ success: false, error: trackErr.message }), { status: 500 });

      if (data.status === 'Shipped') {
        const { data: order } = await supabase.from('orders').select('*').eq('id', data.orderId).maybeSingle();
        if (order?.shipping_email) {
          const origin = new URL(request.url).origin;
          // Fetch order items to include in shipment email details
          const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
          const items = (orderItems || []).map(item => ({
            product_name: item.product_name,
            variant_name: item.variant_name,
            quantity: item.quantity,
            price: item.price
          }));

          const calcSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
          const giftCardFee = (order.gift_card_layout_id || (order.items_summary && order.items_summary.toLowerCase().includes('personalized gift card'))) ? 50 : 0;

          await sendOrderShipped({
            email: order.shipping_email,
            name: `${order.shipping_fname || ''} ${order.shipping_lname || ''}`.trim(),
            orderId: order.id,
            trackingNumber: data.trackingNo || order.tracking_number || '',
            courier: data.courier || order.courier || '',
            trackingLink: data.trackingLink || order.tracking_link || '',
            deliveryMethod: order.delivery_method,
            siteOrigin: origin,
            items,
            subtotal: calcSubtotal.toFixed(2),
            discount: parseFloat(order.discount || 0).toFixed(2),
            shipping: parseFloat(order.shipping || 0).toFixed(2),
            total: parseFloat(order.total || 0).toFixed(2),
            address: {
              fname: order.shipping_fname || '',
              lname: order.shipping_lname || '',
              address: order.shipping_address || '',
              city: order.shipping_city || '',
              state: order.shipping_state || '',
              pincode: order.shipping_pincode || '',
              phone: order.shipping_phone || ''
            },
            giftCardFee: giftCardFee.toFixed(2)
          });}
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'save_coupon') {
      const { error: couponErr } = await supabase.from('coupons').upsert({
        code: (data.coupon.code || '').toUpperCase().trim(),
        discount: data.coupon.discount,
        type: data.coupon.type,
        status: data.coupon.status,
        is_public: data.coupon.isPublic !== false,
        min_order_value: parseFloat(data.coupon.minOrderValue) || 0
      });
      if (couponErr) return new Response(JSON.stringify({ success: false, error: couponErr.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'delete_coupon') {
      const { error: deleteErr } = await supabase.from('coupons').delete().eq('code', data.code);
      if (deleteErr) return new Response(JSON.stringify({ success: false, error: deleteErr.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'delete_customer') {
      const { email } = data;
      if (!email) return new Response(JSON.stringify({ success: false, error: 'Email is required' }), { status: 400 });
      const { error: deleteErr } = await supabase.from('users').delete().eq('email', email);
      if (deleteErr) return new Response(JSON.stringify({ success: false, error: deleteErr.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'save_global_fragrances') {
      const { error: fragErr } = await supabase.from('settings').upsert({ key: 'GLOBAL_FRAGRANCES', value: data.fragrances });
      if (fragErr) return new Response(JSON.stringify({ success: false, error: fragErr.message }), { status: 500 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (action === 'save_storefront_images') {
      const images = data.storefrontImages || {};
      const updatedImages = { ...images };

      // Fetch current storefront images to find replaced or cleared ones
      const { data: dbSettings } = await supabase.from('settings').select('value').eq('key', 'STOREFRONT_IMAGES').maybeSingle();
      const oldStorefrontImages = dbSettings?.value || {};
      const publicIdsToDelete = [];

      Object.keys(oldStorefrontImages).forEach(key => {
        const oldUrl = oldStorefrontImages[key];
        const newUrl = images[key];
        if (oldUrl && (!newUrl || newUrl.startsWith("data:image"))) {
          const oldPid = extractPublicId(oldUrl);
          if (oldPid) {
            publicIdsToDelete.push(oldPid);
          }
        }
      });

      if (publicIdsToDelete.length > 0) {
        await deleteFromCloudinary(publicIdsToDelete);
      }

      await Promise.all(Object.keys(images).map(async (key) => {
        let val = images[key] || "";
        if (val && val.startsWith("data:image")) {
          const publicId = `sf_${key}`;
          val = await uploadToCloudinary(val, publicId);
        }
        const targetWidth = 1920;
        updatedImages[key] = optimizeImageUrl(val, targetWidth);
      }));

      const { error } = await supabase.from('settings').upsert({
        key: 'STOREFRONT_IMAGES',
        value: updatedImages
      });

      if (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to save storefront images: " + error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, storefrontImages: updatedImages }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: "Action parameters matching exception" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
