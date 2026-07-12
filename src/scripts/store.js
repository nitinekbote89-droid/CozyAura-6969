let _currentAccessToken = null;

// Global fetch interceptor to handle silent network failures (e.g. database sync error: Failed to fetch)
const originalFetch = window.fetch;
window.fetch = async function(resource, config = {}) {
  let requestArg = resource;
  let configArg = config;

  const resourceUrl = typeof resource === 'string' ? resource : (resource?.url || '');
  if (resourceUrl.includes('/api/store')) {
    const bypassSecret = localStorage.getItem('test_bypass_secret');
    if (typeof resource === 'string') {
      if (!configArg.headers) configArg.headers = {};
      if (configArg.headers instanceof Headers) {
        if (_currentAccessToken) configArg.headers.set('Authorization', `Bearer ${_currentAccessToken}`);
        if (bypassSecret) configArg.headers.set('x-test-bypass-secret', bypassSecret);
      } else {
        if (_currentAccessToken) configArg.headers['Authorization'] = `Bearer ${_currentAccessToken}`;
        if (bypassSecret) configArg.headers['x-test-bypass-secret'] = bypassSecret;
      }
    } else {
      const headers = new Headers(resource.headers);
      if (_currentAccessToken) headers.set('Authorization', `Bearer ${_currentAccessToken}`);
      if (bypassSecret) headers.set('x-test-bypass-secret', bypassSecret);
      requestArg = new Request(resource, { headers });
    }
  }

  try {
    const res = await originalFetch(requestArg, configArg);
    // If the server was reached successfully, hide offline screen if it was active
    const offlineOverlay = document.getElementById('offlineOverlay');
    if (offlineOverlay && offlineOverlay.classList.contains('active')) {
      offlineOverlay.classList.remove('active');
      window.showToast("Connection restored. You are back online!", false);
    }
    return res;
  } catch (err) {
    console.error("Fetch intercepted network error:", err);
    const offlineOverlay = document.getElementById('offlineOverlay');
    if (offlineOverlay) {
      offlineOverlay.classList.add('active');
    }
    throw err;
  }
};

const CORE_STORE_PROXY_ROUTE = "/api/store";

function generateSecureToken() {
  const array = new Uint32Array(4);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => dec.toString(36)).join('');
}

// Centralized Auth Store with module-private variables
let _currentUser = null;
const _authListeners = new Set();

const authStore = {
  setCurrentUser(user) {
    _currentUser = user;
    _authListeners.forEach(callback => callback(_currentUser));
  },
  getCurrentUser() {
    return _currentUser;
  },
  subscribe(callback) {
    _authListeners.add(callback);
    return () => _authListeners.delete(callback);
  }
};

// Safe, read-only getters for window context binding (e.g. templates)
window.getLoggedInEmail = () => authStore.getCurrentUser()?.email || null;
window.getLoggedInName = () => {
  const user = authStore.getCurrentUser();
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || null;
};
window.isUserLoggedIn = () => !!authStore.getCurrentUser();

// Clean up legacy insecure PII keys
(function() {
  const legacyKeys = ['lumiere_user_email', 'lumiere_user_name', 'lumiere_user_fname', 'lumiere_user_lname', 'lumiere_user_avatar'];
  legacyKeys.forEach(key => localStorage.removeItem(key));
})();

window.STORE_PICKUP_ADDRESS = "Cozy Aura Studio (2nd floor), above Vikrant Agencies, Subhash Chowk, Gunj Golai, Latur - 413512, Maharashtra, India";
window.deliveryMethod = "Shipping";

window.showLoadingOverlay = function(text, subtext) {
  const overlay = document.getElementById('processingOverlay');
  if (!overlay) return;
  const textEl = overlay.querySelector('.processing-text');
  const subtextEl = overlay.querySelector('.processing-subtext');
  if (textEl) textEl.textContent = text || 'Loading...';
  if (subtextEl) subtextEl.textContent = subtext || 'Please wait a moment.';
  overlay.classList.add('active');
};

window.hideLoadingOverlay = function() {
  const overlay = document.getElementById('processingOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.__svg = {
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  check_circle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  fire: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.5-.75-3-1.5-4.5.25 1 1.5 2 1.5 3.5s-1.25 2.5-2.5 3.5z"/><path d="M12 2C10 6 8 10 8 14c0 3.5 2 5 4 5s4-1.5 4-5c0-4-2-8-4-12z"/><circle cx="12" cy="14" r="3" fill="var(--taupe)" opacity="0.3"/></svg>',
  fire_sm: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5A2.5 2.5 0 0 0 12 12c0-1.5-.75-3-1.5-4.5.25 1 1.5 2 1.5 3.5s-1.25 2.5-2.5 3.5z"/><path d="M13 2C11 6 9 10 9 14c0 3.5 2 5 4 5s4-1.5 4-5c0-4-2-8-4-12z"/><circle cx="13" cy="14" r="3" fill="var(--taupe)" opacity="0.3"/></svg>',
  arrow_right: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  sell: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  truck: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  external: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"/></svg>',
  package: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08"></polygon><polygon points="12 22.08 12 12 21 6.92 21 17.08 12 22.08"></polygon><polygon points="12 12 3 6.92 12 1.84 21 6.92 12 12"></polygon></svg>',
};

let _supabaseLazy = null;
async function getSupabase() {
  if (!_supabaseLazy) {
    const mod = await import('/src/lib/supabaseClient');
    _supabaseLazy = mod.supabase;
  }
  return _supabaseLazy;
}

function getAuthTokenFromStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed?.access_token || null;
        }
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function fetchWithAuth(url, options = {}) {
  const supabase = await getSupabase();
  let session = null;
  let token = null;

  // Retry up to 5 times with a 200ms delay to wait for Supabase session initialization if needed
  for (let i = 0; i < 5; i++) {
    const res = await supabase.auth.getSession();
    session = res.data?.session;
    token = session?.access_token || getAuthTokenFromStorage();
    if (token) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401) {
    localStorage.removeItem('lumiere_user_email');
    localStorage.removeItem('lumiere_user_fname');
    localStorage.removeItem('lumiere_user_lname');
    localStorage.removeItem('lumiere_user_name');
    localStorage.removeItem('lumiere_user_avatar');
    localStorage.removeItem('lumiere_user_addresses');
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } catch (e) {}
    window.renderAccountAvatar();
    window.showToast("Your session has expired. Please sign in again.", true);
  }

  return res;
}

window.PRODUCTS = [];
window.cart = [];
window.appliedPromoCode = (function() {
  try {
    const saved = sessionStorage.getItem('lumiere_applied_promo');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();
window.getShippingCharge = function(state, pincode) {
  var cleanedPincode = String(pincode || '').replace(/\s+/g, '').trim();
  if (cleanedPincode === '413531' || cleanedPincode === '413512') {
    return 50;
  }

  var GROUP_MAP = {
    'maharashtra':'A','goa':'A','karnataka':'A','telangana':'A',
    'gujarat':'B','rajasthan':'B','madhya pradesh':'B','chhattisgarh':'B',
    'andhra pradesh':'B','tamil nadu':'B','kerala':'B','puducherry':'B',
    'dadra and nagar haveli':'B','daman and diu':'B','lakshadweep':'B',
    'dadra and nagar haveli and daman and diu':'B','dadra & nagar haveli and daman & diu':'B',
    'odisha':'C','uttar pradesh':'C','bihar':'C','jharkhand':'C',
    'west bengal':'C','delhi':'C','haryana':'C','punjab':'C',
    'himachal pradesh':'C','uttarakhand':'C','chandigarh':'C',
    'jammu and kashmir':'C',
    'assam':'D','arunachal pradesh':'D','meghalaya':'D','nagaland':'D',
    'manipur':'D','mizoram':'D','tripura':'D','sikkim':'D',
    'ladakh':'D','andaman and nicobar islands':'D'
  };
  var RATES = {
    A:[60,77,94,113,130,147,166],
    B:[70,106,142,178,212,248,284],
    C:[94,142,188,236,284,330,378],
    D:[106,166,224,284,342,402,460]
  };
  var group = GROUP_MAP[(state||'').toLowerCase().trim()];
  if (!group) return 0;
  var totalWeight = (window.cart||[]).reduce(function(sum, item) {
    var prod = window.PRODUCTS.find(function(p) { return p.id === (item.product?.id); });
    var w = (prod && prod.weight) || 220;
    return sum + (w * (item.quantity || 1));
  }, 0);

  if (totalWeight <= 3500) {
    var SLABS = [500,1000,1500,2000,2500,3000,3500];
    var idx = 0;
    for (var i = 0; i < SLABS.length; i++) {
      if (totalWeight <= SLABS[i]) { idx = i; break; }
      idx = i;
    }
    return (RATES[group]||[])[idx] || 0;
  } else {
    var baseRate = RATES[group][6];
    var extraWeight = totalWeight - 3500;
    var extraSlabs = Math.ceil(extraWeight / 500);
    var increment = 0;
    if (group === 'A') increment = 17;
    else if (group === 'B') increment = 36;
    else if (group === 'C') increment = 48;
    else if (group === 'D') increment = 60;
    return baseRate + (extraSlabs * increment);
  }
};
window.currentPaymentMethod = 'Card';
window.shippingInfo = {};
window.currentProduct = null;
window.selectedVariant = null;
window.activeCategory = 'all';
window.PROMOS = [];
let pages = ['home', 'shop', 'cartPage', 'payment', 'trackPage', 'about', 'contact', 'ordersPage', 'addressesPage', 'wishlistPage', 'shipping', 'returns', 'privacy', 'terms', 'faq', 'candleCare', 'giftCardPage', 'bulkWholesale'];
let categories = ['all'];

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

window.showToast = function(message, isError = false) {
  let toast = document.getElementById('appToastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToastNotification';
    document.body.appendChild(toast);
  }
  const icon = isError 
    ? window.__svg.error 
    : window.__svg.check_circle;
  toast.innerHTML = `${icon} <span id="appToastMessage"></span>`;
  toast.querySelector('#appToastMessage').textContent = message;
  toast.style.borderLeft = isError ? '3px solid var(--danger)' : '3px solid var(--gold)';
  if (window._toastTimeout) clearTimeout(window._toastTimeout);
  toast.offsetHeight; // Force reflow
  toast.classList.add('show');
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
};

async function syncCatalogDataset() {
    try {
        let json, fromSsr = false;
        if (window.__INITIAL_CATALOG__) {
          json = { success: true, data: window.__INITIAL_CATALOG__ };
          delete window.__INITIAL_CATALOG__;
          fromSsr = true;
        } else {
          const res = await fetch(`${CORE_STORE_PROXY_ROUTE}?siteToken=LUMIERE_STORE_2026&t=${Date.now()}`);
          json = await res.json();
        }
        if (!fromSsr) {
          const bs = document.getElementById('bestsellerStickyContainer');
          if (bs) delete bs.dataset.ssr;
          const sg = document.getElementById('homeScentGrid');
          if (sg) delete sg.dataset.ssr;
        }
        if (json.success && json.data) {
            // Remove error banner if it exists
            const banner = document.getElementById('databaseSyncErrorBanner');
            if (banner) {
              banner.remove();
              window.showToast("Database sync restored successfully!", false);
            }
            if (window._syncRetryTimeout) {
              clearTimeout(window._syncRetryTimeout);
              window._syncRetryTimeout = null;
            }

            window.PROMOS = (json.data.coupons || []).map(c => ({
              code: c.code,
              type: c.type,
              discount: c.discount,
              min_order_value: parseFloat(c.min_order_value) || 0,
              is_public: c.is_public !== false
            }));
            if (window.appliedPromoCode) {
              const freshPromo = window.PROMOS.find(p => p.code === window.appliedPromoCode.code);
              if (freshPromo) {
                window.appliedPromoCode = freshPromo;
                sessionStorage.setItem('lumiere_applied_promo', JSON.stringify(freshPromo));
              } else {
                window.appliedPromoCode = null;
                sessionStorage.removeItem('lumiere_applied_promo');
              }
            }
            window.PRODUCTS = json.data.inventory.map(item => {
               let vars = Object.entries(item.fragranceStocks || {}).map(([fName, qty]) => ({
                  id: fName, name: fName, price: item.price, inStock: qty > 0, maxStock: qty,
                  image: item.fragranceImages?.[fName] ? `<img src="${item.fragranceImages[fName]}" alt="${fName}" width="300" height="300" style="width:100%;height:100%;object-fit:cover;">` : null,
                  rawImage: item.fragranceImages?.[fName] || null
               }));
               if (vars.length === 0) {
                  vars.push({ id: 'std', name: 'Standard', price: item.price, inStock: item.stock > 0, maxStock: item.stock });
               }
                let normalizedCategory = item.category || '';
                if (normalizedCategory.toLowerCase().trim() === 'jar2') {
                   normalizedCategory = 'jar';
                }
                return {
                   id: item.id, name: item.name, scent: normalizedCategory, price: item.price, category: normalizedCategory,
                   image: item.coverImage ? `<img src="${item.coverImage}" alt="${item.name}" width="300" height="300" style="width:100%;height:100%;object-fit:cover;">` : `<div class="cream-fallback">${window.__svg.fire}</div>`,
                  description: item.description, specs: Array.isArray(item.specifications) ? item.specifications.join('\n') : item.specifications,
                  inStock: item.stock > 0, variants: vars,
                  totalSales: item.totalSales || 0,
                  salesRank: item.salesRank || null,
                  weight: item.weight || 220
               };
            });

            // Calculate/normalize sales rank dynamically on client
            const sorted = [...window.PRODUCTS].sort((a, b) => b.totalSales - a.totalSales);
            window.PRODUCTS.forEach(p => {
               p.salesRank = sorted.findIndex(sp => sp.id === p.id) + 1;
            });

            window.GLOBAL_FRAGRANCES = json.data.fragrances || [];
            window.STOREFRONT_IMAGES = json.data.storefrontImages || {};
            const cats = new Set(window.PRODUCTS.map(p => p.category ? toTitleCase(p.category) : '').filter(Boolean));
            if (cats.size) categories = ['all', ...cats];
            window.renderCategoryFilters();
            window.triggerSearch();
            window.renderHomeBestsellers();
            window.renderHomeScentGuide();
            window.renderPromos();
            window.applyStorefrontImages();
            init3DAnimations();
            initInstagramScrollPin();
        } else { 
            window.renderCategoryFilters(); 
            window.triggerSearch(); 
            window.renderHomeBestsellers(); 
            window.renderHomeScentGuide(); 
            window.renderPromos();
            window.applyStorefrontImages();
            init3DAnimations();
            initInstagramScrollPin();
        }
    } catch(e) {
      console.error("Could not sync with Supabase instance.", e);
      
      // Render or update visual warning banner on screen for diagnostics
      let div = document.getElementById('databaseSyncErrorBanner');
      if (!div) {
        div = document.createElement('div');
        div.id = 'databaseSyncErrorBanner';
        div.style.position = 'fixed';
        div.style.bottom = '0';
        div.style.left = '0';
        div.style.right = '0';
        div.style.background = '#fee2e2';
        div.style.color = '#991b1b';
        div.style.padding = '1rem';
        div.style.zIndex = '9999';
        div.style.textAlign = 'center';
        div.style.fontSize = '0.85rem';
        div.style.borderTop = '1px solid #fca5a5';
        document.body.appendChild(div);
      }
      div.innerHTML = `<strong>Database Sync Error:</strong> ${e.message || e}`;

      // Schedule automated retry if online
      if (window._syncRetryTimeout) clearTimeout(window._syncRetryTimeout);
      window._syncRetryTimeout = setTimeout(() => {
        if (navigator.onLine) {
          console.log("Retrying database sync...");
          syncCatalogDataset();
        }
      }, 5000);

      window.renderCategoryFilters();
      window.triggerSearch();
      window.renderHomeBestsellers();
      window.renderHomeScentGuide();
      window.applyStorefrontImages();
      init3DAnimations();
      initInstagramScrollPin();
    }
}

window.PAGE_META = {
  home:          { title: 'Cozy Aura Candle | Premium Hand-Poured Soy Wax Candles', desc: 'Discover premium hand-poured soy wax candles by Cozy Aura Candle. Thoughtfully crafted with elegant fragrances to create warmth, comfort, and timeless moments in every home.' },
  shop:          { title: 'Shop All Candles — Cozy Aura Candle',                     desc: 'Browse our collection of hand-poured soy wax candles. Available in a variety of exquisite fragrances. 100% natural soy wax, lead-free cotton wicks.' },
  cartPage:      { title: 'Your Cart — Cozy Aura Candle',                            desc: 'Review your hand-poured soy wax candle selections before checkout.' },
  payment:       { title: 'Checkout — Cozy Aura Candle',                             desc: 'Complete your purchase of hand-poured soy wax candles. Secure payment via Paytm.' },
  ordersPage:    { title: 'My Orders — Cozy Aura Candle',                            desc: 'Track and manage your Cozy Aura Candle orders.' },
  addressesPage: { title: 'My Addresses — Cozy Aura Candle',                         desc: 'Manage your shipping addresses for Cozy Aura Candle orders.' },
  about:         { title: 'About Us — Cozy Aura Candle',                             desc: 'Cozy Aura Candle was created with one simple idea — every home deserves moments of warmth, comfort, and calm. Hand-poured in Latur, Maharashtra.' },
  contact:       { title: 'Contact Us — Cozy Aura Candle',                           desc: 'Get in touch with Cozy Aura Candle. We love hearing from our candle community.' },
  trackPage:     { title: 'Track Order — Cozy Aura Candle',                          desc: 'Track your Cozy Aura Candle order by your order ID.' },
  shipping:      { title: 'Shipping & Delivery — Cozy Aura Candle',                  desc: 'Learn about shipping timelines, payment methods, delivery status, and tracking for Cozy Aura Candle.' },
  returns:       { title: 'Returns & Replacement — Cozy Aura Candle',                desc: 'Read our returns and transit damage replacement guidelines for Cozy Aura Candle.' },
  privacy:       { title: 'Privacy Policy — Cozy Aura Candle',                       desc: 'Review our secure privacy policy regarding personal data and payment safety.' },
  terms:         { title: 'Terms of Service — Cozy Aura Candle',                     desc: 'Read our terms of service regarding handcrafted variation, pricing, and licensing.' },
  faq:           { title: 'Frequently Asked Questions — Cozy Aura Candle',           desc: 'Find answers about wax, burn times, custom messages, shipping, and wholesale for Cozy Aura Candle.' },
  candleCare:    { title: 'Candle Care Guide — Cozy Aura Candle',                    desc: 'Maximize the burn time and safety of your Cozy Aura Candle with our care instructions.' },
  giftCard:      { title: 'Personalized Gift Cards — Cozy Aura Candle',              desc: 'Select custom premium card designs and custom messages during checkout.' },
  bulkWholesale: { title: 'Bulk & Wholesale — Cozy Aura Candle',                     desc: 'Enquire about corporate gifting, wedding favours, events, custom packaging, and wholesale partnerships.' }
};

window.updatePageMeta = function(pageId) {
  const meta = window.PAGE_META[pageId] || window.PAGE_META.home;
  document.title = meta.title;
  const descEl = document.querySelector('meta[name="description"]');
  const ogTitleEl = document.querySelector('meta[property="og:title"]');
  const ogDescEl = document.querySelector('meta[property="og:description"]');
  const twTitleEl = document.querySelector('meta[name="twitter:title"]');
  const twDescEl = document.querySelector('meta[name="twitter:description"]');
  if (descEl) descEl.setAttribute('content', meta.desc);
  if (ogTitleEl) ogTitleEl.setAttribute('content', meta.title);
  if (ogDescEl) ogDescEl.setAttribute('content', meta.desc);
  if (twTitleEl) twTitleEl.setAttribute('content', meta.title);
  if (twDescEl) twDescEl.setAttribute('content', meta.desc);
};

window.showPage = function(pageId, updateHistory = true) {
  // Require login for protected pages
  const protectedPages = ['ordersPage', 'addressesPage', 'wishlistPage'];
  if (protectedPages.includes(pageId) && !window.isUserLoggedIn()) {
    let text = 'You need to login with Google to access this page.';
    if (pageId === 'wishlistPage') {
      text = 'You need to login with Google to view your wishlist.';
    } else if (pageId === 'ordersPage') {
      text = 'You need to login with Google to view your order history.';
    } else if (pageId === 'addressesPage') {
      text = 'You need to login with Google to manage your saved addresses.';
    }

    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: text,
      confirmText: 'Login with Google',
      onConfirm: () => {
        localStorage.setItem('lumiere_login_redirect', pageId);
        window.showLogin();
      }
    });
    return;
  }

  // Payment page requires login — if not logged in, send to cart instead
  if (pageId === 'payment' && !window.isUserLoggedIn()) {
    pageId = 'cartPage';
  }

  pages.forEach(p => {
    const sec = document.getElementById(p);
    if (sec) {
      sec.classList.toggle('active', p === pageId);
      sec.style.display = (p === pageId) ? 'block' : 'none';
    }
  });

  // Manage visibility of the floating checkout timer banner
  const timerBanner = document.getElementById('checkoutTimerBanner');
  if (timerBanner) {
    if (pageId === 'payment' && window.checkoutTimerInterval) {
      timerBanner.style.display = 'flex';
    } else {
      timerBanner.style.display = 'none';
    }
  }

  localStorage.setItem('lumiere_active_page', pageId);
  if (pageId === 'cartPage') window.renderCart();
  if (pageId === 'ordersPage') window.fetchMyOrders();
  if (pageId === 'addressesPage') window.renderAddressesPage();
  if (pageId === 'wishlistPage') window.renderWishlist();
  if (pageId === 'shop') { window.renderCategoryFilters(); window.triggerSearch(); }
  if (pageId === 'payment') { window.prefillCheckoutForm(); }
  if (pageId === 'contact') { window.prefillContactForm(); }

  // Update active state in bottom nav
  var bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  bottomNavItems.forEach(function(item) {
    var onclickAttr = item.getAttribute('onclick') || '';
    item.classList.toggle('active', onclickAttr.indexOf("'" + pageId + "'") !== -1);
  });

  window.updatePageMeta(pageId);

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageId);
    window.history.pushState({ pageId: pageId }, '', url.pathname + url.search);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};



window.injectItemListJsonLd = function(list) {
  const existing = document.getElementById('itemListJsonLd');
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.id = 'itemListJsonLd';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: window.activeCategory === 'all' ? 'All Candles' : `${window.activeCategory} Candles`,
    url: window.location.href,
    numberOfItems: list.length,
    itemListElement: list.slice(0, 20).map((prod, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: prod.name,
        description: prod.description,
        image: prod.variants?.[0]?.image_src || prod.image_src || '',
        category: prod.category,
        offers: {
          '@type': 'Offer',
          price: prod.price.toString(),
          priceCurrency: 'INR',
          availability: prod.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
    })),
  });
  document.head.appendChild(script);
};

window.renderProducts = function(list) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:3rem 0;color:var(--stone);font-size:0.9rem;">No products found. Check back soon for new arrivals.</p>';
    return;
  }
  grid.innerHTML = list.map(prod => {
    return `
      <div class="product-card" onclick="window.openProductModal('${prod.id}')">
        <div class="product-img">
          ${!prod.inStock ? '<span class="badge-out">Out of Stock</span>' : ''}
          ${prod.image}
        </div>
        <h3>${prod.name}</h3><div class="scent">${prod.scent}</div><div class="price">₹${prod.price}</div>
      </div>`;
  }).join('');
  window.injectItemListJsonLd(list);
};

window.renderCategoryFilters = function() {
  const bar = document.getElementById('categoryFilters'); if (!bar) return;
  bar.innerHTML = categories.map(cat => `<button class="filter-btn ${cat === window.activeCategory ? 'active' : ''}" onclick="window.selectCategory('${encodeURIComponent(cat)}')">${cat}</button>`).join('');
  
  if (typeof window.renderFragranceCheckboxes === 'function') {
    window.renderFragranceCheckboxes();
  }
};

window.renderFragranceCheckboxes = function() {
  const container = document.getElementById('fragranceCheckboxesList');
  if (!container) return;
  const fragrances = window.GLOBAL_FRAGRANCES || [];
  if (fragrances.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding: 4px 0;">No fragrances available</div>`;
    return;
  }
  container.innerHTML = fragrances.map(frag => {
    const norm = frag.toLowerCase().trim();
    return `
      <label class="filter-option-label">
        <input type="checkbox" name="fragranceFilter" value="${norm}" onchange="window.triggerSearch()">
        ${toTitleCase(frag)}
      </label>
    `;
  }).join('');
};

window.toggleCustomFilterMenu = function(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('customFilterDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
  }
};

// Close custom filter dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('customFilterDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

window.selectCategory = function(cat) { 
  cat = decodeURIComponent(cat).toLowerCase().trim(); 

  const isProductCategory = categories.some(c => c.toLowerCase().trim() === cat);

  if (isProductCategory) {
    window.activeCategory = categories.find(c => c.toLowerCase().trim() === cat) || cat;
    document.querySelectorAll('input[name="fragranceFilter"]').forEach(el => el.checked = false);
  } else {
    window.activeCategory = 'all';
    document.querySelectorAll('input[name="fragranceFilter"]').forEach(el => el.checked = false);
    
    const checkbox = Array.from(document.querySelectorAll('input[name="fragranceFilter"]'))
      .find(el => el.value.toLowerCase().trim() === cat);
    if (checkbox) {
      checkbox.checked = true;
    }
  }

  window.showPage('shop'); 
  window.renderCategoryFilters(); 
  window.triggerSearch(); 
};

window.triggerSearch = function() {
  const query = document.getElementById('shopSearchInput')?.value.toLowerCase().trim() || '';
  let list = [...window.PRODUCTS];
  if (window.activeCategory !== 'all') {
    const target = window.activeCategory.toLowerCase().trim();
    list = list.filter(p => {
      const catMatch = p.category && p.category.toLowerCase().trim() === target;
      const variantMatch = p.variants && p.variants.some(v => v.name && v.name.toLowerCase().trim() === target);
      return catMatch || variantMatch;
    });
  }
  if (query.length > 0) {
    list = list.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const scentMatch = p.scent && p.scent.toLowerCase().includes(query);
      const variantMatch = p.variants && p.variants.some(v => v.name && v.name.toLowerCase().includes(query));
      return nameMatch || scentMatch || variantMatch;
    });
  }

  // Filter by fragrance checkboxes
  const checkedFragrances = Array.from(document.querySelectorAll('input[name="fragranceFilter"]:checked')).map(el => el.value.toLowerCase().trim());
  if (checkedFragrances.length > 0) {
    list = list.filter(p => {
      return p.variants && p.variants.some(v => v.name && checkedFragrances.includes(v.name.toLowerCase().trim()));
    });
  }

  // Handle sorting (Read from checked radio input)
  const sortBy = document.querySelector('input[name="shopSort"]:checked')?.value || 'default';
  if (sortBy === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  }

  const customFilterBtn = document.getElementById('customFilterBtn');
  if (customFilterBtn) {
    const hasFragrance = checkedFragrances.length > 0;
    const hasSort = sortBy !== 'default';
    if (hasFragrance || hasSort) {
      customFilterBtn.classList.add('applied');
      customFilterBtn.innerHTML = 'Filters Applied <span class="arrow">▼</span>';
    } else {
      customFilterBtn.classList.remove('applied');
      customFilterBtn.innerHTML = 'Sort & Filter <span class="arrow">▼</span>';
    }
  }

  // Render active tags list
  const tagsContainer = document.getElementById('activeFiltersTags');
  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    let tagsHtml = [];

    checkedFragrances.forEach(frag => {
      tagsHtml.push(`
        <span class="filter-tag">
          Scent: ${toTitleCase(frag)}
          <span class="filter-tag-close" onclick="window.clearSingleFilter('fragrance', '${frag}')">×</span>
        </span>
      `);
    });

    if (sortBy !== 'default') {
      let label = 'Sort';
      if (sortBy === 'price-asc') label = 'Price: Low to High';
      if (sortBy === 'price-desc') label = 'Price: High to Low';
      tagsHtml.push(`
        <span class="filter-tag">
          ${label}
          <span class="filter-tag-close" onclick="window.clearSingleFilter('sort')">×</span>
        </span>
      `);
    }

    if (tagsHtml.length > 0) {
      tagsHtml.push(`
        <span class="filter-tag" onclick="window.clearAllFilters()" style="background:transparent; border-color:var(--danger); color:var(--brand); font-weight:600; cursor:pointer;">
          Clear All
        </span>
      `);
      tagsContainer.innerHTML = tagsHtml.join('');
      tagsContainer.style.display = 'flex';
    } else {
      tagsContainer.style.display = 'none';
    }
  }

  window.renderProducts(list);
};

window.clearSingleFilter = function(type, value) {
  if (type === 'fragrance') {
    const checkbox = Array.from(document.querySelectorAll('input[name="fragranceFilter"]'))
      .find(el => el.value.toLowerCase().trim() === value.toLowerCase().trim());
    if (checkbox) checkbox.checked = false;
  } else if (type === 'sort') {
    const radio = document.querySelector('input[name="shopSort"][value="default"]');
    if (radio) radio.checked = true;
  }
  window.triggerSearch();
};

window.clearAllFilters = function() {
  document.querySelectorAll('input[name="fragranceFilter"]').forEach(el => el.checked = false);
  const radio = document.querySelector('input[name="shopSort"][value="default"]');
  if (radio) radio.checked = true;
  window.activeCategory = 'all';
  window.renderCategoryFilters();
  window.triggerSearch();
};

window.renderHomeBestsellers = function() {
  const grid = document.getElementById('bestsellerStickyContainer');
  if (!grid) return;
  if (grid.dataset.ssr !== undefined && grid.querySelector('.bestseller-card')) return;
  const top = [...window.PRODUCTS].sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
  if (top.length === 0) { grid.innerHTML = ''; grid.dataset.ssr = ''; return; }

  // Reverse the top 5 array to show #5 first at the bottom of the stack up to #1 at the top
  const reversedTop = [...top].reverse();

  grid.innerHTML = reversedTop.map((prod, idx) => {
    const rank = 5 - idx; // index 0 = rank 5, index 4 = rank 1
    const rankColor = rank === 1 ? 'var(--gold)' : 'var(--charcoal)';
    const rankTextColor = rank === 1 ? 'var(--black)' : 'var(--cream)';

    return `
      <div class="bestseller-card" style="--card-idx: ${idx}; z-index: ${10 + idx};" onclick="window.openProductModal('${prod.id}')">
        <div class="bestseller-card-content">
          <div class="bestseller-card-left">
            <span class="bestseller-rank-badge" style="background: ${rankColor}; color: ${rankTextColor};">#${rank} Best Seller</span>
            <h3>${prod.name}</h3>
            <div class="bestseller-card-scent">${prod.scent || 'Luxury Scent'}</div>
            <p class="bestseller-card-desc">${prod.description ? prod.description.substring(0, 120) + '...' : 'Hand-poured 100% natural soya candle blended with botanical oils.'}</p>
            <div class="bestseller-card-footer">
              <span class="bestseller-card-price">₹${prod.price}</span>
              <span class="bestseller-card-cta">View Details ${window.__svg.arrow_right}</span>
            </div>
          </div>
          <div class="bestseller-card-right">
            ${prod.image}
          </div>
        </div>
      </div>
    `;
  }).join('');
  grid.dataset.ssr = '';
};

window.renderHomeScentGuide = function() {
  const grid = document.getElementById('homeScentGrid');
  if (!grid) return;
  if (grid.dataset.ssr !== undefined && grid.querySelector('.scent-card')) return;
  const fragrances = window.GLOBAL_FRAGRANCES || [];
  if (fragrances.length === 0) { grid.innerHTML = ''; grid.dataset.ssr = ''; return; }
  const colors = ['#F3E8DC,#EDE0D0', '#E8DDD0,#D4C4B0', '#F5EDE0,#EADCC8', '#F7F0E6,#EFE5D8', '#EDE5D8,#D4C4B0', '#F0E8DC,#E0D4C3'];

  // Map fragrances dynamically to relevant luxury/botanical icons
  const getScentIcon = (scentName) => {
    // Return custom luxury fragrance bottle icon for all scents
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--stone)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19h6a2 2 0 0 0 2-2v-3a5 5 0 0 0-10 0v3a2 2 0 0 0 2 2z" />
      <path d="M14 9h2v-2h-2z" />
      <path d="M13.5 7h3v-2h-3z" />
      <path d="M16.5 5.5h2.5" />
      <circle cx="20.5" cy="5.5" r="1.2" fill="var(--stone)" />
      <circle cx="9" cy="14.8" r="1.3" fill="var(--warm-white)" />
      <circle cx="9" cy="19.2" r="1.3" fill="var(--warm-white)" />
      <circle cx="11.2" cy="17" r="1.3" fill="var(--warm-white)" />
      <circle cx="6.8" cy="17" r="1.3" fill="var(--warm-white)" />
      <circle cx="10.6" cy="15.4" r="1.3" fill="var(--warm-white)" />
      <circle cx="10.6" cy="18.6" r="1.3" fill="var(--warm-white)" />
      <circle cx="7.4" cy="18.6" r="1.3" fill="var(--warm-white)" />
      <circle cx="7.4" cy="15.4" r="1.3" fill="var(--warm-white)" />
      <circle cx="9" cy="17" r="1" fill="var(--stone)" />
    </svg>`;
  };

  const getScentDescription = (scentName) => {
    const norm = (scentName || '').toLowerCase().trim();
    if (norm === 'vanilla') return "Warm, creamy vanilla with soft comforting notes that make every evening feel cozy.";
    if (norm === 'lavender') return "Fresh lavender designed to create a peaceful atmosphere perfect for relaxing evenings.";
    if (norm === 'jasmine') return "A delicate floral fragrance that fills your home with elegance and freshness.";
    if (norm === 't-rose' || norm === 'rose' || norm === 'trose') return "Romantic rose petals blended into a rich floral aroma that feels timeless.";
    if (norm === 'ocean blue' || norm === 'ocean' || norm === 'oceanblue') return "Crisp aquatic notes inspired by cool ocean breezes and peaceful mornings.";
    if (norm === 'roasted coffee' || norm === 'coffee' || norm === 'roastedcoffee') return "Rich roasted coffee aroma that brings warmth and café-like comfort into your space.";
    return `Explore our ${scentName} scented candles — hand-poured with premium soy wax.`;
  };

  grid.innerHTML = fragrances.map((f, i) =>
    `<div class="scent-card" onclick="window.selectCategory('${encodeURIComponent(f)}')">
      <div class="scent-card-bg" style="background:linear-gradient(135deg,${colors[i % colors.length]});">
        ${getScentIcon(f)}
      </div>
      <h3>${f.charAt(0).toUpperCase() + f.slice(1)}</h3>
      <p>${getScentDescription(f)}</p>
    </div>`
  ).join('');
  grid.dataset.ssr = '';
};

window.injectProductJsonLd = function(prod) {
  const existing = document.getElementById('productJsonLd');
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.id = 'productJsonLd';
  script.type = 'application/ld+json';
  const offers = prod.variants.map(v => ({
    '@type': 'Offer',
    name: v.name,
    price: v.price.toString(),
    priceCurrency: 'INR',
    availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    sku: v.id,
  }));
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prod.name,
    description: prod.description,
    image: prod.variants[0]?.image_src || prod.image_src || '',
    category: prod.category,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      highPrice: Math.max(...offers.map(o => parseFloat(o.price))).toString(),
      lowPrice: Math.min(...offers.map(o => parseFloat(o.price))).toString(),
      offerCount: offers.length,
      offers: offers,
    },
  });
  document.head.appendChild(script);
};

window.openProductModal = function(id) {
  const prod = window.PRODUCTS.find(p => p.id === id); if (!prod) return;
  window.currentProduct = prod; window.selectedVariant = null;
  window.injectProductJsonLd(prod);
  document.getElementById('modalImgWrap').innerHTML = prod.image;
  document.getElementById('modalCategory').textContent = prod.category;
  document.getElementById('modalTitle').textContent = prod.name;
  document.getElementById('modalDesc').textContent = prod.description;
  document.getElementById('modalSpecs').textContent = prod.specs;
  document.getElementById('modalPrice').textContent = `₹${prod.price}`;
  document.getElementById('modalVariants').innerHTML = prod.variants.map(v => `
    <label class="variant-radio-label ${!v.inStock ? 'disabled' : ''}">
      <input type="radio" name="modal_variant" value="${v.id}" onchange="window.changeVariant('${v.id}')">
      <span class="variant-chip">${v.name}</span>
    </label>`).join('');

  const wishlistButtonHtml = `
    <button class="btn-wishlist" onclick="window.toggleWishlistFromModal()" title="Add to Wishlist">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="heart-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    </button>
  `;
  document.getElementById('modalActionContainer').innerHTML = `${wishlistButtonHtml}<button class="btn-primary" id="addToCartBtn" onclick="window.addProductToCartFromModal()">Add to Cart</button>`;
  document.getElementById('productModalOverlay').classList.add('active');

  // Auto-select if single variant (e.g. Standard products)
  if (prod.variants.length === 1) {
    const firstVar = prod.variants[0];
    setTimeout(() => {
      const radio = document.querySelector(`input[name="modal_variant"][value="${firstVar.id}"]`);
      if (radio) {
        radio.checked = true;
        window.changeVariant(firstVar.id);
      }
    }, 50);
  }
};

window.changeVariant = function(varId) {
  window.selectedVariant = window.currentProduct.variants.find(v => v.id === varId);
  document.getElementById('modalPrice').textContent = `₹${window.selectedVariant.price}`;
  document.getElementById('modalImgWrap').innerHTML = window.selectedVariant.image || window.currentProduct.image;
  
  const actionContainer = document.getElementById('modalActionContainer');
  if (actionContainer) {
    const isWishlisted = window.isProductWishlisted(window.currentProduct.id, window.selectedVariant.name);
    const fillVal = isWishlisted ? 'currentColor' : 'none';
    const activeClass = isWishlisted ? 'active' : '';
    const wishlistButtonHtml = `
      <button class="btn-wishlist ${activeClass}" onclick="window.toggleWishlistFromModal()" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${fillVal}" stroke="currentColor" stroke-width="2" class="heart-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
    `;
    if (!window.selectedVariant.inStock) {
      actionContainer.innerHTML = `${wishlistButtonHtml}<button class="btn-primary" id="addToCartBtn" onclick="window.notifyMe()" style="background:var(--stone); cursor:pointer;">Notify me</button>`;
    } else {
      actionContainer.innerHTML = `${wishlistButtonHtml}<button class="btn-primary" id="addToCartBtn" onclick="window.addProductToCartFromModal()">Add to Cart</button>`;
    }
  }
};

window.notifyMe = function() {
  const modal = document.getElementById('notificationModal');
  if (!modal) return;

  const title = document.getElementById('notificationTitle');
  const text = document.getElementById('notificationText');
  const form = document.getElementById('notificationInputForm');
  const emailInput = document.getElementById('notificationEmailInput');
  const errorEl = document.getElementById('notificationError');
  const cancelBtn = modal.querySelector('.confirm-btn-cancel');
  const submitBtn = document.getElementById('notificationSubmitBtn');

  const pName = window.currentProduct.name;
  const vName = window.selectedVariant.name;
  const loggedInEmail = window.getLoggedInEmail();

  if (errorEl) errorEl.style.display = 'none';

  if (loggedInEmail) {
    // Logged in - show success directly
    title.textContent = 'Thank You!';
    text.textContent = `We will notify you at ${loggedInEmail} when ${pName} (${vName}) is back in stock.`;
    form.style.display = 'none';
    cancelBtn.style.display = 'none';
    submitBtn.textContent = 'Close';
    submitBtn.onclick = function() {
      modal.classList.remove('active');
    };
    modal.classList.add('active');

    // Register notification request count
    fetch(`${CORE_STORE_PROXY_ROUTE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_notification',
        siteToken: 'LUMIERE_STORE_2026',
        product_id: window.currentProduct.id,
        variant_name: window.selectedVariant.name,
        email: loggedInEmail
      })
    }).catch(err => console.error("Could not register notification count", err));
  } else {
    // Prompt for email address
    title.textContent = 'Notify Me';
    text.textContent = `Enter your email to receive back-in-stock notifications for ${pName} (${vName}):`;
    form.style.display = 'block';
    if (emailInput) emailInput.value = '';
    cancelBtn.style.display = 'block';
    submitBtn.textContent = 'Notify Me';
    
    submitBtn.onclick = function() {
      const email = emailInput.value.trim();
      if (!email || !email.includes('@') || email.length < 5) {
        if (errorEl) {
          errorEl.textContent = 'Please enter a valid email address.';
          errorEl.style.display = 'block';
        }
        return;
      }
      if (errorEl) errorEl.style.display = 'none';
      
      // Success state
      title.textContent = 'Thank You!';
      text.textContent = `We will notify you at ${email} when ${pName} (${vName}) is back in stock.`;
      form.style.display = 'none';
      cancelBtn.style.display = 'none';
      submitBtn.textContent = 'Close';
      submitBtn.onclick = function() {
        modal.classList.remove('active');
      };

      // Register notification request count
      fetch(`${CORE_STORE_PROXY_ROUTE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_notification',
          siteToken: 'LUMIERE_STORE_2026',
          product_id: window.currentProduct.id,
          variant_name: window.selectedVariant.name,
          email: email
        })
      }).catch(err => console.error("Could not register notification count", err));
    };
    modal.classList.add('active');
  }
};

window.closeProductModal = function() { document.getElementById('productModalOverlay').classList.remove('active'); };

window.addProductToCartFromModal = function() {
  if (!window.selectedVariant) {
    window.showToast("Select a variant", true);
    return;
  }
  const prodId = window.currentProduct.id;
  const varId = window.selectedVariant.id;

  // Find the latest max stock for this variant
  const prod = window.PRODUCTS.find(p => p.id === prodId);
  const vr = prod ? prod.variants.find(v => v.id === varId) : null;
  const maxStock = vr ? vr.maxStock : 0;

  const matches = window.cart.find(it => it.product.id === prodId && it.variant.id === varId);
  const currentQty = matches ? matches.quantity : 0;

  if (currentQty + 1 > maxStock) {
    window.showToast(`Cannot add more. Only ${maxStock} items are available in stock.`, true);
    return;
  }

  if (matches) matches.quantity += 1;
  else window.cart.push({ product: window.currentProduct, variant: window.selectedVariant, quantity: 1 });
  window.updateCart(); window.closeProductModal(); window.showToast("Added to cart");
};

window.renderCart = function() {
  const container = document.getElementById('orderItemsContainer');
  if (!container) return;

  // Only validate inventory if the dataset has been loaded/synced to prevent false triggers
  if (window.PRODUCTS && window.PRODUCTS.length > 0) {
    // Validate and cap quantities against the latest synced inventory
    let adjusted = false;
    window.cart.forEach(item => {
      const prod = window.PRODUCTS.find(p => p.id === item.product.id);
      const vr = prod ? prod.variants.find(v => v.id === item.variant.id) : null;
      const maxStock = vr ? vr.maxStock : 0;
      if (item.quantity > maxStock) {
        item.quantity = maxStock;
        adjusted = true;
      }
    });

    // Filter out any items whose stock dropped to 0
    const originalLength = window.cart.length;
    window.cart = window.cart.filter(item => item.quantity > 0);
    if (window.cart.length !== originalLength) {
      adjusted = true;
    }

    if (adjusted) {
      localStorage.setItem('lumiere_cart', JSON.stringify(window.cart));
      const qty = window.cart.reduce((s, c) => s + c.quantity, 0);
      document.querySelectorAll('.nav-cta').forEach(b => b.textContent = `Checkout (${qty})`);
      window.calculatePrices();
      window.showToast("Some items in your cart were adjusted because they exceeded available stock.", true);
    }
  }

  if (window.cart.length === 0) {
    container.innerHTML = '<p class="empty-cart-msg">Your cart is empty. Explore our collection to add items.</p>';
    return;
  }
  container.innerHTML = window.cart.map((item, idx) => `
    <div class="order-item">
      <div class="order-thumb">${item.product?.image || window.__svg.fire_sm}</div>
      <div class="order-item-info">
        <strong style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;">${item.product?.name || 'Candle'}</strong>
        <span style="font-size:0.72rem;color:var(--stone);letter-spacing:0.1em;text-transform:uppercase;">${item.variant?.name || 'Standard'}</span>
        <span style="font-size:0.95rem;color:var(--gold-dark);font-family:'Cormorant Garamond',serif;">₹${item.variant?.price || item.product?.price || 0}</span>
        <div class="qty-controls">
          <button class="qty-btn" onclick="window.changeQty(${idx}, -1)">−</button>
          <span style="min-width:1.5rem;text-align:center;">${item.quantity}</span>
          <button class="qty-btn" onclick="window.changeQty(${idx}, 1)">+</button>
          <button class="qty-btn" onclick="window.removeCartItem(${idx})" style="margin-left:0.5rem;border:none;color:var(--danger);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>
    </div>
  `).join('');
  window.renderPromos();
};

window.renderPromos = function() {
  const container = document.getElementById('promoContainer');
  if (!container) return;
  let html = '<div style="font-size:0.68rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--stone);margin-bottom:0.5rem;">Promo Code</div>';
  const publicPromos = window.PROMOS.filter(p => p.is_public !== false);
  if (publicPromos.length > 0) {
    html += publicPromos.map(p =>
      `<span class="promo-badge ${window.appliedPromoCode?.code === p.code ? 'active' : ''}" onclick="window.applyPromo('${p.code}')">${p.code}</span>`
    ).join('');
  } else {
    html += '<p style="font-size:0.8rem;color:var(--taupe);">No active promotions.</p>';
  }
  container.innerHTML = html;
};

window.changeQty = function(idx, delta) {
  const item = window.cart[idx];
  if (!item) return;

  if (delta > 0) {
    const prod = window.PRODUCTS.find(p => p.id === item.product.id);
    const vr = prod ? prod.variants.find(v => v.id === item.variant.id) : null;
    const maxStock = vr ? vr.maxStock : 0;

    if (item.quantity + delta > maxStock) {
      window.showToast(`Cannot add more. Only ${maxStock} items are available in stock.`, true);
      return;
    }
  }

  item.quantity = Math.max(0, item.quantity + delta);
  if (item.quantity === 0) window.cart.splice(idx, 1);
  window.updateCart();
};

window.removeCartItem = function(idx) {
  window.cart.splice(idx, 1);
  window.updateCart();
};

window.applyPromo = function(code) {
  const promo = window.PROMOS.find(p => p.code === code);
  if (!promo) return;
  
  if (window.appliedPromoCode?.code !== code) {
    const subtotal = window.cart.reduce((sum, item) => sum + ((item.variant?.price || item.product?.price || 0) * item.quantity), 0);
    const minVal = parseFloat(promo.min_order_value) || 0;
    if (minVal > 0 && subtotal < minVal) {
      window.showToast(`This promo code requires a minimum purchase of ₹${minVal}.`, true);
      return;
    }
  }

  window.appliedPromoCode = window.appliedPromoCode?.code === code ? null : promo;
  if (window.appliedPromoCode) {
    sessionStorage.setItem('lumiere_applied_promo', JSON.stringify(window.appliedPromoCode));
  } else {
    sessionStorage.removeItem('lumiere_applied_promo');
  }
  window.updateCart();
};

window.fallbackAvatar = function(img) {
  img.parentElement.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
};

window.renderAccountAvatar = function() {
  const btn = document.getElementById('navAccountBtn');
  if (!btn) return;
  const user = authStore.getCurrentUser();
  const avatar = user?.user_metadata?.avatar_url || '';
  if (avatar) {
    btn.innerHTML = '<img src="' + avatar + '" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="window.fallbackAvatar(this)">';
  } else {
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }
  const header = document.getElementById('dropdownUserInfo');
  if (header) {
    const email = user?.email || null;
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email?.split('@')[0] || 'User';
    if (email) {
      header.innerHTML = `<div style="font-weight:500;color:var(--charcoal);">${name}</div><div style="font-size:0.68rem;color:var(--stone);margin-top:0.25rem;text-transform:none;letter-spacing:normal;font-weight:300;">${email}</div>`;
    } else {
      header.textContent = 'Guest';
    }
  }
  const logout = document.getElementById('dropdownLogout');
  if (logout) {
    logout.textContent = user ? 'Log Out' : 'Sign In';
  }
}

window.showConfirmModal = function({ category, title, text, confirmText, onConfirm }) {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;
  modal.querySelector('.confirm-category').textContent = category || 'Account';
  modal.querySelector('.confirm-title').textContent = title || 'Confirm';
  modal.querySelector('.confirm-text').textContent = text || 'Are you sure?';
  const btn = document.getElementById('confirmLogoutBtn');
  btn.textContent = confirmText || 'Confirm';
  btn.onclick = function() {
    modal.classList.remove('active');
    if (onConfirm) onConfirm();
  };
  modal.classList.add('active');
};

window.confirmLogout = function() {
  window.showConfirmModal({
    category: 'Account',
    title: 'Log Out?',
    text: 'Are you sure you want to log out of your account?',
    confirmText: 'Log Out',
    onConfirm: () => {
      window.showLogin();
      window.closeAccountMenu();
    }
  });
};

window.handleAccountDropdownAction = function() {
  if (window.isUserLoggedIn()) {
    window.confirmLogout();
  } else {
    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: 'You need to login with Google to access your account.',
      confirmText: 'Login with Google',
      onConfirm: () => {
        const activeTab = localStorage.getItem('lumiere_active_page') || 'home';
        localStorage.setItem('lumiere_login_redirect', activeTab);
        window.showLogin();
      }
    });
  }
};

window.closeAccountMenu = function() {
  const dd = document.getElementById('accountDropdown');
  if (dd) dd.classList.remove('show');
};

window.toggleAccountMenu = function() {
  if (!window.isUserLoggedIn()) {
    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: 'You need to login with Google to access your account details, orders, and addresses.',
      confirmText: 'Login with Google',
      onConfirm: () => {
        const activeTab = localStorage.getItem('lumiere_active_page') || 'home';
        localStorage.setItem('lumiere_login_redirect', activeTab);
        window.showLogin();
      }
    });
    return;
  }
  const dd = document.getElementById('accountDropdown');
  if (dd) dd.classList.toggle('show');
};

window.toggleMobileNav = function() {
  const overlay = document.getElementById('mobileNavOverlay');
  const hamburger = document.getElementById('navHamburger');
  if (!overlay) return;
  const isActive = overlay.classList.toggle('active');
  if (hamburger) hamburger.classList.toggle('active', isActive);
  document.body.style.overflow = isActive ? 'hidden' : '';
};

window.closeMobileNav = function(e) {
  if (e && e.target !== document.getElementById('mobileNavOverlay')) return;
  const overlay = document.getElementById('mobileNavOverlay');
  const hamburger = document.getElementById('navHamburger');
  if (!overlay) return;
  overlay.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');
  document.body.style.overflow = '';
};

document.addEventListener('click', function(e) {
  const wrap = document.querySelector('.nav-account-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('accountDropdown');
    if (dd) dd.classList.remove('show');
  }
});

window.updateCart = function() {
  localStorage.setItem('lumiere_cart', JSON.stringify(window.cart));
  const qty = window.cart.reduce((s, c) => s + c.quantity, 0);
  document.querySelectorAll('.nav-cta').forEach(b => b.textContent = `Checkout (${qty})`);
  const badge = document.getElementById('bottomNavCartBadge');
  if (badge) {
    badge.textContent = qty;
    badge.style.display = qty > 0 ? 'flex' : 'none';
  }
  window.calculatePrices();
  if (document.getElementById('cartPage')?.classList.contains('active') || document.getElementById('cartPage')?.style.display !== 'none') {
    window.renderCart();
  }
  if (document.getElementById('payment')?.classList.contains('active') || document.getElementById('payment')?.style.display !== 'none') {
    window.renderCheckoutSidebarItems();
  }
  if (typeof window.renderCartAppliedPromo === 'function') window.renderCartAppliedPromo();
  if (typeof window.renderCheckoutAppliedPromo === 'function') window.renderCheckoutAppliedPromo();
};

window.calculatePrices = function() {
  const subtotal = window.cart.reduce((sum, item) => sum + ((item.variant?.price || item.product?.price || 0) * item.quantity), 0);
  
  const isGift = sessionStorage.getItem('lumiere_cart_type') === 'gift';
  const giftCardFee = isGift ? 50 : 0;
  
  // Auto-remove applied promo if cart falls below minimum order value
  if (window.appliedPromoCode) {
    const minVal = parseFloat(window.appliedPromoCode.min_order_value) || 0;
    if (minVal > 0 && subtotal < minVal) {
      const removedCodeName = window.appliedPromoCode.code;
      window.appliedPromoCode = null;
      sessionStorage.removeItem('lumiere_applied_promo');
      setTimeout(() => {
        window.showToast(`Promo code ${removedCodeName} removed: minimum purchase of ₹${minVal} required.`, true);
        if (typeof window.renderCheckoutAppliedPromo === 'function') {
          window.renderCheckoutAppliedPromo();
        }
      }, 0);
    }
  }

  let discount = 0;
  const isFreeShipCoupon = window.appliedPromoCode?.type === 'freeship';

  if (window.appliedPromoCode) {
    if (window.appliedPromoCode.type === 'percent') {
      discount = Math.round(subtotal * (window.appliedPromoCode.discount / 100));
    } else if (window.appliedPromoCode.type === 'fixed') {
      discount = Math.min(subtotal, window.appliedPromoCode.discount);
    }
  }
  
  // Conditionally add shipping fee based on step or selected address
  const guestState = document.getElementById('state')?.value || '';
  const guestPincode = document.getElementById('pincode')?.value || '';
  const hasAddress = window.checkoutStep === 'payment' || !!window.selectedAddressId || !!guestState || !!guestPincode;
  const shipState = window.shippingInfo?.state || guestState || '';
  const shipPincode = window.shippingInfo?.pincode || guestPincode || '';
  const shipping = (subtotal > 0 && hasAddress && window.deliveryMethod !== 'Pickup' && !isFreeShipCoupon) ? window.getShippingCharge(shipState, shipPincode) : 0;
  let total = Math.max(0, subtotal + giftCardFee - discount + shipping);

  if (document.getElementById('summaryTotal')) {
    document.getElementById('summaryShipping').textContent = window.deliveryMethod === 'Pickup' 
      ? 'Free (Self Pickup)' 
      : (isFreeShipCoupon 
          ? 'Free (Promo)' 
          : (hasAddress ? `₹${shipping}` : 'Calculated at checkout'));
    document.getElementById('summarySubtotal').textContent = `₹${subtotal}`;
    
    const summaryGiftCardLine = document.getElementById('summaryGiftCardLine');
    if (summaryGiftCardLine) {
      if (giftCardFee > 0) {
        summaryGiftCardLine.style.display = 'flex';
        document.getElementById('summaryGiftCard').textContent = `₹${giftCardFee}`;
      } else {
        summaryGiftCardLine.style.display = 'none';
      }
    }
    
    document.getElementById('summaryTotal').textContent = `₹${total}`;
    const summaryShippingLine = document.getElementById('summaryShipping').parentElement;
    if (summaryShippingLine) {
      summaryShippingLine.style.display = 'flex';
    }
    const checkoutSummaryTotalEl = document.getElementById('checkoutSummaryTotal');
    if (checkoutSummaryTotalEl) {
      checkoutSummaryTotalEl.textContent = `₹${total}`;
    }
    const promoLine = document.getElementById('summaryPromoLine');
    if (window.appliedPromoCode) {
      promoLine.style.display = 'flex';
      if (isFreeShipCoupon) {
        document.getElementById('summaryPromo').textContent = `Free Shipping (${window.appliedPromoCode.code})`;
      } else {
        document.getElementById('summaryPromo').textContent = `-₹${discount} (${window.appliedPromoCode.code})`;
      }
    } else {
      promoLine.style.display = 'none';
    }
  }

  // Update shipping method price
  const shippingMethodPriceEl = document.getElementById('shippingMethodPrice');
  if (shippingMethodPriceEl) {
    shippingMethodPriceEl.textContent = window.deliveryMethod === 'Pickup' ? 'Free (Self Pickup)' : (isFreeShipCoupon ? 'Free' : (shipping > 0 ? `₹${shipping}` : 'Free'));
  }
  const shippingMethodNameEl = document.getElementById('shippingMethodName');
  if (shippingMethodNameEl) {
    shippingMethodNameEl.textContent = window.deliveryMethod === 'Pickup' ? 'Self Pickup In Store' : 'Standard Shipping';
  }
  const shippingMethodTitleEl = document.getElementById('shippingMethodSectionTitle');
  if (shippingMethodTitleEl) {
    shippingMethodTitleEl.textContent = window.deliveryMethod === 'Pickup' ? 'Delivery method' : 'Shipping method';
  }

  // Update Shopify-like checkout sidebar breakdown
  if (document.getElementById('checkoutSidebarTotal')) {
    document.getElementById('checkoutSidebarSubtotal').textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const sidebarGiftCardRow = document.getElementById('checkoutSidebarGiftCardRow');
    const sidebarGiftCardEl = document.getElementById('checkoutSidebarGiftCard');
    if (sidebarGiftCardRow && sidebarGiftCardEl) {
      if (giftCardFee > 0) {
        sidebarGiftCardRow.style.display = 'flex';
        sidebarGiftCardEl.textContent = `₹${giftCardFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        sidebarGiftCardRow.style.display = 'none';
      }
    }
    
    const shippingEl = document.getElementById('checkoutSidebarShipping');
    if (shippingEl) {
      if (window.deliveryMethod === 'Pickup') {
        shippingEl.textContent = 'Free (Self Pickup)';
      } else if (isFreeShipCoupon) {
        shippingEl.textContent = 'Free (Promo)';
      } else if (!hasAddress) {
        shippingEl.textContent = 'Enter shipping address';
      } else {
        shippingEl.textContent = `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    const discountRow = document.getElementById('checkoutSidebarDiscountRow');
    const discountEl = document.getElementById('checkoutSidebarDiscount');
    if (discountRow && discountEl) {
      if (window.appliedPromoCode) {
        discountRow.style.display = 'flex';
        if (isFreeShipCoupon) {
          discountEl.textContent = `Free Shipping (${window.appliedPromoCode.code})`;
        } else {
          discountEl.textContent = `-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      } else {
        discountRow.style.display = 'none';
      }
    }

    const formattedTotal = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('checkoutSidebarTotal').textContent = formattedTotal;
    const mobTotalEl = document.getElementById('mobileFooterTotalVal');
    if (mobTotalEl) {
      mobTotalEl.textContent = formattedTotal;
    }
    
    // Calculate taxes (5% GST included in total)
    const taxAmount = total > 0 ? Math.round((total * 5 / 105) * 100) / 100 : 0;
    const taxLabel = document.getElementById('checkoutSidebarTaxLabel');
    if (taxLabel) {
      taxLabel.textContent = `Including ₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in taxes`;
    }
  }

  return { subtotal, discount, shipping, total, giftCardFee };
};

window.setDeliveryMethod = function(method) {
  window.deliveryMethod = method;
  
  if (method === 'Pickup' && window.appliedPromoCode?.type === 'freeship') {
    window.appliedPromoCode = null;
    sessionStorage.removeItem('lumiere_applied_promo');
    window.showToast("Free shipping coupon removed as Self Pickup is selected.");
    if (typeof window.renderCartAppliedPromo === 'function') window.renderCartAppliedPromo();
    if (typeof window.renderCheckoutAppliedPromo === 'function') window.renderCheckoutAppliedPromo();
  }
  
  const shipBtn = document.getElementById('deliveryMethodShippingBtn');
  const pickupBtn = document.getElementById('deliveryMethodPickupBtn');
  const pickupCard = document.getElementById('pickupInfoCard');
  const guestFields = document.getElementById('guestShippingFields');
  const savedSec = document.getElementById('savedAddressesSection');
  const addAddressBtn = document.querySelector('button[onclick="window.showNewAddressForm()"]');
  const form = document.getElementById('checkoutForm');
  const shippingHeader = document.getElementById('shippingDetailsHeader');
  
  if (method === 'Pickup') {
    if (shipBtn) {
      shipBtn.style.border = '1px solid var(--sand)';
      shipBtn.style.background = 'white';
    }
    if (pickupBtn) {
      pickupBtn.style.border = '2px solid var(--stone)';
      pickupBtn.style.background = 'var(--cream)';
    }
    
    // Show pickup info card
    if (pickupCard) {
      pickupCard.style.display = 'block';
      const addressText = document.getElementById('pickupAddressText');
      if (addressText) {
        addressText.textContent = window.STORE_PICKUP_ADDRESS || "Cozy Aura Studio (2nd floor), above Vikrant Agencies, Subhash Chowk, Gunj Golai, Latur - 413512, Maharashtra, India";
      }
    }
    
    // Hide shipping specific UI elements
    if (savedSec) savedSec.style.display = 'none';
    if (addAddressBtn) addAddressBtn.style.display = 'none';
    if (guestFields) guestFields.style.display = 'none';
    if (shippingHeader) shippingHeader.style.display = 'none';
    
    const metaFields = document.getElementById('addressMetaFields');
    const actionsWrap = document.getElementById('addressFormActions');
    const guestBtn = document.getElementById('guestProceedBtn');
    if (metaFields) metaFields.style.display = 'none';
    if (actionsWrap) actionsWrap.style.display = 'none';
    if (guestBtn) guestBtn.style.display = 'block';
    
    // Always show contact form for name/email/phone
    if (form) form.style.display = 'block';
    
    // Prefill form contact info if logged in
    const loggedInEmail = window.getLoggedInEmail();
    if (loggedInEmail) {
      const emailField = document.getElementById('email');
      if (emailField) {
        emailField.value = loggedInEmail;
        emailField.disabled = true;
      }
      
      const rawAddrs = localStorage.getItem('lumiere_user_addresses');
      const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddr) {
        if (!document.getElementById('fname').value) document.getElementById('fname').value = defaultAddr.fname || '';
        if (!document.getElementById('lname').value) document.getElementById('lname').value = defaultAddr.lname || '';
        if (!document.getElementById('phone').value) document.getElementById('phone').value = defaultAddr.phone || '';
      } else {
        const nameParts = (window.getLoggedInName() || '').split(' ');
        if (!document.getElementById('fname').value) document.getElementById('fname').value = nameParts[0] || '';
        if (!document.getElementById('lname').value) document.getElementById('lname').value = nameParts.slice(1).join(' ') || '';
      }
    }
    
    // Fill dummy address fields to pass validation
    const addrField = document.getElementById('address');
    const pinField = document.getElementById('pincode');
    const cityField = document.getElementById('city');
    const stateField = document.getElementById('state');
    
    if (addrField) addrField.value = "Self Pickup In Store";
    if (pinField) pinField.value = "413512";
    if (cityField) cityField.value = "Latur";
    if (stateField) stateField.value = "maharashtra";
    
  } else {
    // Shipping method chosen
    if (shipBtn) {
      shipBtn.style.border = '2px solid var(--stone)';
      shipBtn.style.background = 'var(--cream)';
    }
    if (pickupBtn) {
      pickupBtn.style.border = '1px solid var(--sand)';
      pickupBtn.style.background = 'white';
    }
    
    // Hide pickup card
    if (pickupCard) pickupCard.style.display = 'none';
    
    // Show shipping specific fields and controls
    if (addAddressBtn) addAddressBtn.style.display = 'block';
    if (guestFields) guestFields.style.display = 'block';
    if (shippingHeader) shippingHeader.style.display = 'flex';
    
    // Clear dummy fields
    const addrField = document.getElementById('address');
    const pinField = document.getElementById('pincode');
    const cityField = document.getElementById('city');
    const stateField = document.getElementById('state');
    
    if (addrField && addrField.value === "Self Pickup In Store") addrField.value = "";
    if (pinField && pinField.value === "413512") pinField.value = "";
    if (cityField && cityField.value === "Latur") cityField.value = "";
    if (stateField && stateField.value === "maharashtra") stateField.value = "";
    
    // Restore normal prefill state (saved addresses vs form)
    window.prefillCheckoutForm();
  }
  
  window.updateAddingAddressClass();
  window.calculatePrices();
};

window.acquireCheckoutLocks = async function() {
  let sessionId = sessionStorage.getItem('lumiere_checkout_session');
  if (!sessionId) {
    sessionId = 'sess_' + generateSecureToken();
    sessionStorage.setItem('lumiere_checkout_session', sessionId);
  }

  try {
    const res = await fetch(CORE_STORE_PROXY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acquire_locks',
        siteToken: 'LUMIERE_STORE_2026',
        session_id: sessionId,
        items: window.cart,
        expires_in_minutes: 10
      })
    });
    const json = await res.json();
    return json.success;
  } catch (err) {
    console.error("Locking error:", err);
    return false;
  }
};

window.releaseCheckoutLocks = async function() {
  const sessionId = sessionStorage.getItem('lumiere_checkout_session');
  if (!sessionId) return;
  try {
    await fetch(CORE_STORE_PROXY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'release_locks',
        siteToken: 'LUMIERE_STORE_2026',
        session_id: sessionId
      })
    });
  } catch (err) {
    console.error("Releasing locks error:", err);
  }
};

window.checkoutTimerInterval = null;
window.checkoutTimerDuration = 10 * 60; // 10 minutes

window.startCheckoutTimer = function() {
  if (window.checkoutTimerInterval) clearInterval(window.checkoutTimerInterval);
  
  let timeLeft = window.checkoutTimerDuration;
  const banner = document.getElementById('checkoutTimerBanner');
  const textEl = document.getElementById('checkoutTimerText');
  if (banner) banner.style.display = 'flex';

  const updateDisplay = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (textEl) {
      textEl.textContent = `Stock reserved for ${formattedTime}`;
  }
};
  updateDisplay();

  window.checkoutTimerInterval = setInterval(async () => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(window.checkoutTimerInterval);
      window.checkoutTimerInterval = null;
      if (banner) banner.style.display = 'none';
      
      await window.releaseCheckoutLocks();
      window.showToast("Your reservation has expired. Please re-enter checkout to check availability.", true);
      window.showPage('cartPage');
    } else {
      updateDisplay();
    }
  }, 1000);
};

window.stopCheckoutTimer = function() {
  if (window.checkoutTimerInterval) {
    clearInterval(window.checkoutTimerInterval);
    window.checkoutTimerInterval = null;
  }
  const banner = document.getElementById('checkoutTimerBanner');
  if (banner) banner.style.display = 'none';
};

// --- 3D INTERACTIVE TILT EFFECT ---
function init3DAnimations() {
  if (window.innerWidth <= 1024) return;
  const heroVisual = document.querySelector('.hero-visual');
  const heroFrame = document.querySelector('.hero-image-frame');
  
  if (heroVisual && heroFrame) {
    heroFrame.style.transformStyle = 'preserve-3d';
    const img = heroFrame.querySelector('.hero-img-element');
    const border = heroFrame.querySelector('.hero-frame-border');
    const glow = heroFrame.querySelector('.hero-frame-glow');
    
    if (img) {
      img.style.transform = 'translateZ(-20px) scale(1.12)';
      img.style.transformStyle = 'preserve-3d';
    }
    if (border) {
      border.style.transform = 'translateZ(30px)';
      border.style.transformStyle = 'preserve-3d';
    }
    if (glow) {
      glow.style.transform = 'translateZ(10px)';
      glow.style.transformStyle = 'preserve-3d';
    }

    heroVisual.addEventListener('mousemove', (e) => {
      const rect = heroFrame.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((centerY - y) / centerY) * 15;
      const rotateY = ((x - centerX) / centerX) * 15;
      
      heroFrame.style.transition = 'transform 0.1s ease-out';
      heroFrame.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      
      const orb1 = document.querySelector('.orb-1');
      const orb2 = document.querySelector('.orb-2');
      if (orb1) orb1.style.transform = `translate(${rotateY * 1.5}px, ${-rotateX * 1.5}px)`;
      if (orb2) orb2.style.transform = `translate(${-rotateY * 1.5}px, ${rotateX * 1.5}px)`;
    });
    
    heroVisual.addEventListener('mouseleave', () => {
      heroFrame.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      heroFrame.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      
      const orb1 = document.querySelector('.orb-1');
      const orb2 = document.querySelector('.orb-2');
      if (orb1) orb1.style.transform = 'translate(0px, 0px)';
      if (orb2) orb2.style.transform = 'translate(0px, 0px)';
    });
  }

  function setupCardTilt(selector, maxTilt = 8, scale = 1.03) {
    document.querySelectorAll(selector).forEach(card => {
      card.style.transformStyle = 'preserve-3d';
      
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((centerY - y) / centerY) * maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;
        
        card.style.transition = 'transform 0.1s ease-out';
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  setupCardTilt('.value-card', 8, 1.03);
  setupCardTilt('.scent-card', 10, 1.04);
  
  const observeAndApplyTilt = (containerId, cardSelector) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const observer = new MutationObserver(() => {
      setupCardTilt(`#${containerId} ${cardSelector}`, 8, 1.03);
    });
    observer.observe(container, { childList: true });
    setupCardTilt(`#${containerId} ${cardSelector}`, 8, 1.03);
  };

  observeAndApplyTilt('bestsellerStickyContainer', '.bestseller-card');
  observeAndApplyTilt('productsGrid', '.product-card');
}

// --- INSTAGRAM HORIZONTAL SCROLL ---
function initInstagramScrollPin() {
  if (window.innerWidth <= 1024) return;
  const container = document.getElementById('instagramScrollContainer');
  const track     = document.getElementById('socialTrack');

  if (!container || !track) return;

  let currentTranslateX = 0;
  let targetTranslateX  = 0;
  let isAnimating       = false;

  const updatePosition = () => {
    const ease = 0.12;
    const diff = targetTranslateX - currentTranslateX;
    if (Math.abs(diff) > 0.05) {
      currentTranslateX += diff * ease;
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      requestAnimationFrame(updatePosition);
    } else {
      currentTranslateX = targetTranslateX;
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      isAnimating = false;
    }
  };

  const onScroll = () => {
    const rect            = container.getBoundingClientRect();
    const containerHeight = rect.height;
    const viewHeight      = window.innerHeight;

    const scrolled        = 90 - rect.top;
    const totalScrollable = containerHeight - viewHeight;

    let progress = scrolled / totalScrollable;
    progress = Math.max(0, Math.min(1, progress));

    const maxTranslate = Math.max(0, track.scrollWidth - window.innerWidth);
    targetTranslateX   = -progress * maxTranslate;

    if (!isAnimating) {
      isAnimating = true;
      requestAnimationFrame(updatePosition);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
}

// Toggle scrolled class on navbar
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }
});

// Intercept contact form submit button click to prompt login immediately before form validation
document.querySelector('#contactForm button[type="submit"]')?.addEventListener('click', function(e) {
  if (!window.isUserLoggedIn()) {
    e.preventDefault();
    
    // Save contact form fields to cache
    const nameVal = document.getElementById('contactName')?.value || '';
    const phoneVal = document.getElementById('contactPhone')?.value || '';
    const subjectVal = document.getElementById('contactSubject')?.value || '';
    const messageVal = document.getElementById('contactMessage')?.value || '';
    
    localStorage.setItem('lumiere_contact_name', nameVal);
    localStorage.setItem('lumiere_contact_phone', phoneVal);
    localStorage.setItem('lumiere_contact_subject', subjectVal);
    localStorage.setItem('lumiere_contact_message', messageVal);
    
    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: 'You need to login with Google to send message.',
      confirmText: 'LOGIN WITH GOOGLE',
      onConfirm: () => {
        localStorage.setItem('lumiere_login_redirect', 'contact');
        window.showLogin();
      }
    });
  }
});

// Contact form handler
document.getElementById('contactForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!window.isUserLoggedIn()) {
    // Save contact form fields to cache
    const nameVal = document.getElementById('contactName')?.value || '';
    const phoneVal = document.getElementById('contactPhone')?.value || '';
    const subjectVal = document.getElementById('contactSubject')?.value || '';
    const messageVal = document.getElementById('contactMessage')?.value || '';
    
    localStorage.setItem('lumiere_contact_name', nameVal);
    localStorage.setItem('lumiere_contact_phone', phoneVal);
    localStorage.setItem('lumiere_contact_subject', subjectVal);
    localStorage.setItem('lumiere_contact_message', messageVal);

    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: 'You need to login with Google to send message.',
      confirmText: 'LOGIN WITH GOOGLE',
      onConfirm: () => {
        localStorage.setItem('lumiere_login_redirect', 'contact');
        window.showLogin();
      }
    });
    return;
  }

  const messageText = document.getElementById('contactMessage').value;
  const words = messageText.trim().split(/\s+/).filter(Boolean);
  if (words.length > 200) {
    window.showToast("Message exceeds the maximum limit of 200 words.", true);
    return;
  }

  window.showLoadingOverlay("Sending message...", "Please wait a moment.");
  try {
    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'new_message',
        siteToken: 'LUMIERE_STORE_2026',
        company_name_hp: document.getElementById('contactCompanyNameHp')?.value || "",
        name: document.getElementById('contactName').value,
        email: window.getLoggedInEmail() || "",
        phone: document.getElementById('contactPhone').value,
        subject: document.getElementById('contactSubject').value,
        message: messageText
      })
    });
    const json = await res.json();
    if (json.success) {
      this.reset();
      const countEl = document.getElementById('contactMessageWordCount');
      if (countEl) countEl.textContent = '0 / 200 words';
      document.getElementById('contactSuccessMsg').classList.add('show');
      
      // Clean browser cache
      localStorage.removeItem('lumiere_contact_name');
      localStorage.removeItem('lumiere_contact_phone');
      localStorage.removeItem('lumiere_contact_subject');
      localStorage.removeItem('lumiere_contact_message');
    } else {
      window.showToast(json.error || 'Failed to send message.', true);
    }
  } catch(e) {
    window.showToast('Could not send message. Please try again.', true);
  } finally {
    window.hideLoadingOverlay();
  }
});

window.checkAndAutoSendContactForm = function() {
  const savedMessage = localStorage.getItem('lumiere_contact_message');
  if (savedMessage && window.isUserLoggedIn()) {
    const contactForm = document.getElementById('contactForm');
    const nameField = document.getElementById('contactName');
    const phoneField = document.getElementById('contactPhone');
    const subjectField = document.getElementById('contactSubject');
    const messageField = document.getElementById('contactMessage');
    
    if (contactForm && nameField && phoneField && subjectField && messageField) {
      nameField.value = localStorage.getItem('lumiere_contact_name') || window.getLoggedInName() || '';
      phoneField.value = localStorage.getItem('lumiere_contact_phone') || '';
      subjectField.value = localStorage.getItem('lumiere_contact_subject') || '';
      messageField.value = savedMessage;
      
      // Update word count display
      const countEl = document.getElementById('contactMessageWordCount');
      if (countEl) {
        const words = savedMessage.trim().split(/\s+/).filter(Boolean);
        countEl.textContent = `${words.length} / 200 words`;
      }
      
      // Clear cached values immediately to keep browser clean
      localStorage.removeItem('lumiere_contact_name');
      localStorage.removeItem('lumiere_contact_phone');
      localStorage.removeItem('lumiere_contact_subject');
      localStorage.removeItem('lumiere_contact_message');
      
      // Navigate to contact tab
      window.showPage('contact');
      
      // Auto-submit the form
      contactForm.dispatchEvent(new Event('submit'));
    }
  }
};

// Show toast alert on input field focus if user is not logged in
['contactName', 'contactPhone', 'contactSubject', 'contactMessage'].forEach(fieldId => {
  document.getElementById(fieldId)?.addEventListener('focus', function() {
    if (!window.isUserLoggedIn()) {
      window.showToast("Login required to send a message.", true);
    }
  });
});

// Auto-prefix and format phone number in contact form
document.getElementById('contactPhone')?.addEventListener('focus', function() {
  if (!this.value.trim()) {
    this.value = '+91 ';
  }
});
document.getElementById('contactPhone')?.addEventListener('blur', function() {
  if (this.value.trim() === '+91') {
    this.value = '';
  }
});
document.getElementById('contactPhone')?.addEventListener('input', function() {
  let val = this.value;
  let cleaned = val.replace(/[^\d+]/g, '');
  
  if (cleaned && !cleaned.startsWith('+')) {
    if (cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+91' + cleaned;
    }
  }
  
  if (cleaned.startsWith('+91') && cleaned.length > 3) {
    this.value = '+91 ' + cleaned.slice(3);
  } else {
    this.value = cleaned;
  }
});

// Max 200 words limit on contact message textarea
const msgTextarea = document.getElementById('contactMessage');
const msgCount = document.getElementById('contactMessageWordCount');
if (msgTextarea && msgCount) {
  msgTextarea.addEventListener('input', function() {
    let val = this.value;
    let words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 200) {
      // Truncate to exactly 200 words
      this.value = val.split(/\s+/).slice(0, 200).join(' ');
      words = this.value.trim().split(/\s+/).filter(Boolean);
    }
    msgCount.textContent = `${words.length} / 200 words`;
  });
}

window.checkoutStep = 'shipping';

window.goBackToCart = async function() {
  window.stopCheckoutTimer();
  await window.releaseCheckoutLocks();
  window.checkoutStep = 'shipping';
  document.getElementById('deliveryFormContainer').style.display = 'block';
  document.getElementById('paymentScreenContainer').style.display = 'none';
  window.showPage('cartPage');
};

window.goToCheckout = async function() {
  if (window.cart.length === 0) {
    window.showToast("Your cart is empty", true);
    return;
  }

  // Require Google login for checking out
  const email = window.getLoggedInEmail();
  if (!email) {
    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: 'You need to login with Google to proceed to checkout and purchase items.',
      confirmText: 'Login with Google',
      onConfirm: () => {
        localStorage.setItem('lumiere_login_redirect', 'payment');
        window.showLogin();
      }
    });
    return;
  }

  // Route to payment checkout form but do not start timer or acquire locks yet
  window.checkoutStep = 'shipping';
  document.getElementById('deliveryFormContainer').style.display = 'block';
  document.getElementById('paymentScreenContainer').style.display = 'none';
  window.showPage('payment');
  window.calculatePrices();
  window.renderCheckoutSidebarItems();
  window.renderCheckoutAppliedPromo();
  if (document.getElementById('checkoutDiscountInput')) {
    document.getElementById('checkoutDiscountInput').value = window.appliedPromoCode ? window.appliedPromoCode.code : '';
  }
  window.stopCheckoutTimer();
};

window.goBackToShipping = function() {
  window.checkoutStep = 'shipping';
  document.getElementById('deliveryFormContainer').style.display = 'block';
  document.getElementById('paymentScreenContainer').style.display = 'none';
  window.calculatePrices();
};

window.updateGiftCardCheckoutSection = function() {
  const isGift = sessionStorage.getItem('lumiere_cart_type') === 'gift';
  const giftSection = document.getElementById('checkoutGiftSection');
  if (giftSection) {
    if (isGift) {
      giftSection.style.display = 'block';
      const savedLayoutStr = sessionStorage.getItem('lumiere_gift_card_layout');
      const titleEl = document.getElementById('checkoutGiftCardTitle');
      const linkEl = document.getElementById('checkoutGiftCardLink');
      const deleteBtn = document.getElementById('checkoutGiftCardDeleteBtn');
      if (savedLayoutStr) {
        try {
          const layout = JSON.parse(savedLayoutStr);
          if (titleEl) titleEl.textContent = "Customized Gift Card Attached";
          if (linkEl) linkEl.textContent = "Edit Card Design";
          if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        } catch (e) {
          if (titleEl) titleEl.textContent = "No card designed yet";
          if (linkEl) linkEl.textContent = "Design a Card";
          if (deleteBtn) deleteBtn.style.display = 'none';
        }
      } else {
        if (titleEl) titleEl.textContent = "No card designed yet";
        if (linkEl) linkEl.textContent = "Design a Card";
        if (deleteBtn) deleteBtn.style.display = 'none';
      }
    } else {
      giftSection.style.display = 'none';
    }
  }
};

window.detachGiftCard = function() {
  if (typeof window.showConfirmModal === 'function') {
    window.showConfirmModal({
      category: 'Gifting',
      title: 'Remove Gift Card?',
      text: 'Are you sure you want to remove the gift card from this order?',
      confirmText: 'Remove',
      onConfirm: () => {
        sessionStorage.removeItem('lumiere_gift_card_layout');
        if (typeof window.setCartType === 'function') {
          window.setCartType('normal', false);
        }
        if (typeof window.updateGiftCardCheckoutSection === 'function') {
          window.updateGiftCardCheckoutSection();
        }
        var highlight = document.getElementById('cartTypeHighlight');
        var normalText = document.getElementById('toggleNormal');
        var giftText = document.getElementById('toggleGift');
        if (highlight && normalText && giftText) {
          highlight.style.transform = 'translateX(0)';
          normalText.style.color = 'var(--black)';
          normalText.style.fontWeight = '600';
          giftText.style.color = 'var(--stone)';
          giftText.style.fontWeight = '500';
        }
      }
    });
  } else {
    if (confirm("Are you sure you want to remove the gift card from this order?")) {
      sessionStorage.removeItem('lumiere_gift_card_layout');
      if (typeof window.setCartType === 'function') {
        window.setCartType('normal', false);
      }
      if (typeof window.updateGiftCardCheckoutSection === 'function') {
        window.updateGiftCardCheckoutSection();
      }
      var highlight = document.getElementById('cartTypeHighlight');
      var normalText = document.getElementById('toggleNormal');
      var giftText = document.getElementById('toggleGift');
      if (highlight && normalText && giftText) {
        highlight.style.transform = 'translateX(0)';
        normalText.style.color = 'var(--black)';
        normalText.style.fontWeight = '600';
        giftText.style.color = 'var(--stone)';
        giftText.style.fontWeight = '500';
      }
    }
  }
};

window.proceedToPayment = async function() {
  const loggedInEmail = window.getLoggedInEmail();
  if (window.deliveryMethod === 'Pickup') {
    const form = document.getElementById('checkoutForm');
    if (form && !form.reportValidity()) {
      return;
    }
    window.shippingInfo = {
      fname: document.getElementById('fname').value,
      lname: document.getElementById('lname').value,
      email: document.getElementById('email').value || loggedInEmail,
      address: window.STORE_PICKUP_ADDRESS,
      city: "Latur",
      state: "maharashtra",
      pincode: "413512",
      phone: document.getElementById('phone').value
    };
    window.selectedAddressId = null;
    window.selectedAddressLabel = 'Pickup';
  } else if (loggedInEmail) {
    const rawAddrs = localStorage.getItem('lumiere_user_addresses');
    const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
    const selectedAddr = addresses.find(a => String(a.id) === String(window.selectedAddressId));
    if (!selectedAddr) {
      window.showToast("Please select a shipping address.", true);
      return;
    }
    if (!selectedAddr.phone || selectedAddr.phone.replace(/[^0-9]/g, '').length < 10) {
      window.showToast("Please provide a valid phone number for this saved address.", true);
      return;
    }
    window.shippingInfo = {
      fname: selectedAddr.fname,
      lname: selectedAddr.lname,
      email: loggedInEmail,
      address: selectedAddr.address,
      city: selectedAddr.city,
      state: selectedAddr.state,
      pincode: selectedAddr.pincode,
      phone: selectedAddr.phone
    };
  } else {
    const form = document.getElementById('checkoutForm');
    if (form && !form.reportValidity()) {
      return;
    }
    window.shippingInfo = {
      fname: document.getElementById('fname').value,
      lname: document.getElementById('lname').value,
      email: document.getElementById('email').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      pincode: document.getElementById('pincode').value,
      phone: document.getElementById('phone').value
    };
    window.selectedAddressId = null;
  }

  // Acquire locks and start timer before proceeding to payment
  if (!window.checkoutTimerInterval) {
    window.showToast("Reserving items...");
    const locked = await window.acquireCheckoutLocks();
    if (!locked) {
      window.showToast("Stock unavailable. An item in your cart is already reserved or out of stock.", true);
      if (typeof syncCatalogDataset === 'function') syncCatalogDataset();
      return;
    }
    window.startCheckoutTimer();
  }

  const summaryContact = document.getElementById('summaryContactValue');
  if (summaryContact) {
    summaryContact.textContent = window.shippingInfo.email + (window.shippingInfo.phone ? `, ${window.shippingInfo.phone}` : '');
  }
  const summaryAddress = document.getElementById('summaryAddressValue');
  const summaryAddressLabel = document.getElementById('summaryAddressLabel');
  if (summaryAddress) {
    if (window.deliveryMethod === 'Pickup') {
      if (summaryAddressLabel) summaryAddressLabel.textContent = 'Pickup Location';
      summaryAddress.textContent = window.shippingInfo.address;
    } else {
      if (summaryAddressLabel) summaryAddressLabel.textContent = 'Ship to';
      summaryAddress.textContent = `${window.shippingInfo.address}, ${window.shippingInfo.city}, ${window.shippingInfo.state} - ${window.shippingInfo.pincode}`;
    }
  }

  window.checkoutStep = 'payment';
  document.getElementById('deliveryFormContainer').style.display = 'none';
  document.getElementById('paymentScreenContainer').style.display = 'block';

  if (typeof window.updateGiftCardCheckoutSection === 'function') {
    window.updateGiftCardCheckoutSection();
  }

  window.calculatePrices();
};

window.setPaymentMethod = function(method) {
  window.currentPaymentMethod = method;
  const onlineRadio = document.querySelector('input[name="paymentMethodSelect"][value="Online"]');
  const codRadio = document.querySelector('input[name="paymentMethodSelect"][value="COD"]');
  
  if (method === 'Online' && onlineRadio) onlineRadio.checked = true;
  if (method === 'COD' && codRadio) codRadio.checked = true;

  document.querySelectorAll('.payment-option-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) {
      const isTarget = radio.value === method;
      card.classList.toggle('active', isTarget);
      const body = card.querySelector('.payment-option-body');
      if (body) {
        body.style.display = isTarget ? 'block' : 'none';
      }
    }
  });
};



window.applyCheckoutDiscount = function() {
  const inputEl = document.getElementById('checkoutDiscountInput');
  const code = inputEl?.value.trim().toUpperCase();
  if (!code) return;
  const promo = window.PROMOS.find(p => p.code.toUpperCase() === code);
  if (promo) {
    if (promo.type === 'freeship' && window.deliveryMethod === 'Pickup') {
      window.showToast("Free shipping coupons cannot be applied to self-pickup orders.", true);
      return;
    }
    const subtotal = window.cart.reduce((sum, item) => sum + ((item.variant?.price || item.product?.price || 0) * item.quantity), 0);
    const minVal = parseFloat(promo.min_order_value) || 0;
    if (minVal > 0 && subtotal < minVal) {
      window.showToast(`This promo code requires a minimum purchase of ₹${minVal}.`, true);
      return;
    }
    window.appliedPromoCode = promo;
    sessionStorage.setItem('lumiere_applied_promo', JSON.stringify(window.appliedPromoCode));
    window.updateCart();
    window.renderCheckoutAppliedPromo();
  } else {
    window.showToast("Invalid discount code", true);
  }
};

window.renderCheckoutAppliedPromo = function() {
  const container = document.getElementById('checkoutAppliedPromoContainer');
  const box = document.querySelector('.checkout-discount-box');
  if (!container) return;
  if (window.appliedPromoCode) {
    if (box) box.style.display = 'none';
    container.innerHTML = `
      <div class="applied-promo-tag">
        ${window.__svg.sell}
        <span>${window.appliedPromoCode.code}</span>
        <button onclick="window.removeCheckoutPromo()" style="background:none;border:none;cursor:pointer;color:var(--stone);font-size:1.1rem;line-height:1;margin-left:0.3rem;padding:0;font-weight:bold;">&times;</button>
      </div>
    `;
  } else {
    if (box) box.style.display = 'flex';
    container.innerHTML = '';
  }
};

window.removeCheckoutPromo = function() {
  window.appliedPromoCode = null;
  sessionStorage.removeItem('lumiere_applied_promo');
  window.updateCart();
  window.renderCheckoutAppliedPromo();
  const inputEl = document.getElementById('checkoutDiscountInput');
  if (inputEl) inputEl.value = '';
};

window.applyCartDiscount = function() {
  const inputEl = document.getElementById('cartDiscountInput');
  const code = inputEl?.value.trim().toUpperCase();
  if (!code) return;
  const promo = window.PROMOS.find(p => p.code.toUpperCase() === code);
  if (promo) {
    if (promo.type === 'freeship' && window.deliveryMethod === 'Pickup') {
      window.showToast("Free shipping coupons cannot be applied to self-pickup orders.", true);
      return;
    }
    const subtotal = window.cart.reduce((sum, item) => sum + ((item.variant?.price || item.product?.price || 0) * item.quantity), 0);
    const minVal = parseFloat(promo.min_order_value) || 0;
    if (minVal > 0 && subtotal < minVal) {
      window.showToast(`This promo code requires a minimum purchase of ₹${minVal}.`, true);
      return;
    }
    window.appliedPromoCode = promo;
    sessionStorage.setItem('lumiere_applied_promo', JSON.stringify(window.appliedPromoCode));
    window.updateCart();
  } else {
    window.showToast("Invalid discount code", true);
  }
};

window.renderCartAppliedPromo = function() {
  const container = document.getElementById('cartAppliedPromoContainer');
  const box = document.querySelector('.cart-discount-box');
  if (!container) return;
  if (window.appliedPromoCode) {
    if (box) box.style.display = 'none';
    container.innerHTML = `
      <div class="applied-promo-tag" style="margin-bottom:1.5rem; display:flex; align-items:center;">
        ${window.__svg.sell}
        <span>${window.appliedPromoCode.code}</span>
        <button onclick="window.removeCartPromo()" style="background:none;border:none;cursor:pointer;color:var(--stone);font-size:1.1rem;line-height:1;margin-left:0.3rem;padding:0;font-weight:bold;">&times;</button>
      </div>
    `;
  } else {
    if (box) box.style.display = 'flex';
    container.innerHTML = '';
    const inputEl = document.getElementById('cartDiscountInput');
    if (inputEl) inputEl.value = '';
  }
};

window.removeCartPromo = function() {
  window.appliedPromoCode = null;
  sessionStorage.removeItem('lumiere_applied_promo');
  window.updateCart();
};

window.renderCheckoutSidebarItems = function() {
  const container = document.getElementById('checkoutSidebarItems');
  if (!container) return;
  if (window.cart.length === 0) {
    container.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
    return;
  }
  container.innerHTML = window.cart.map(item => {
    const finalImg = item.variant?.image || item.product?.image;
    return `
      <div class="checkout-item-row" style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">
        <div class="checkout-item-thumbnail-wrap" style="position:relative;width:64px;height:64px;flex-shrink:0;">
          <div class="checkout-item-thumbnail" style="width:100%;height:100%;background:white;border:1px solid var(--sand);border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:2px;">
            ${finalImg || window.__svg.fire_sm}
          </div>
        </div>
        <div class="checkout-item-info" style="flex:1;">
          <div class="checkout-item-name" style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-weight:600;color:var(--black);line-height:1.2;">${item.product?.name || 'Candle'}</div>
          <div class="checkout-item-variant" style="font-size:0.72rem;color:var(--stone);margin-top:0.15rem;letter-spacing:0.02em;">${item.variant?.name || 'Standard'} X${item.quantity}</div>
        </div>
        <div class="checkout-item-price" style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--charcoal);font-weight:400;white-space:nowrap;">
          ₹${((item.variant?.price || item.product?.price || 0) * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    `;
  }).join('');
};

window.executeSecurePayment = async function() {
  if (window._submittingOrder) return;
  if (!navigator.onLine) {
    const offlineOverlay = document.getElementById('offlineOverlay');
    if (offlineOverlay) {
      offlineOverlay.classList.add('active');
    }
    if (window.showToast) {
      window.showToast("Cannot place order while offline. Please check your internet connection.", true);
    }
    return;
  }

  window._submittingOrder = true;
  window.showLoadingOverlay("Processing your order...", "Please do not close the window or click back.");

  // Save the custom card layout to the database first if cart is marked as a gift
  let giftCardLayoutId = null;
  const isGift = sessionStorage.getItem('lumiere_cart_type') === 'gift';
  const savedLayoutStr = sessionStorage.getItem('lumiere_gift_card_layout');
  if (isGift && savedLayoutStr) {
    try {
      const layoutData = JSON.parse(savedLayoutStr);
      if (!layoutData.id) {
        layoutData.id = 'layout_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      }
      const saveRes = await fetch(CORE_STORE_PROXY_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_gift_card_layout',
          siteToken: 'LUMIERE_STORE_2026',
          id: layoutData.id,
          templatePath: layoutData.templatePath,
          elements: layoutData.elements
        })
      });
      const saveJson = await saveRes.json();
      if (saveJson.success) {
        giftCardLayoutId = layoutData.id;
        sessionStorage.setItem('lumiere_gift_card_layout', JSON.stringify(layoutData));
      } else {
        console.error("Failed to save gift card layout:", saveJson.error);
      }
    } catch (err) {
      console.error("Error saving gift card layout:", err);
    }
  }

  const prices = window.calculatePrices();
  const userEmail = window.getLoggedInEmail() || window.shippingInfo.email;
  const sessionToken = sessionStorage.getItem('lumiere_checkout_session') || 'session_' + Date.now() + '_' + generateSecureToken();
  sessionStorage.setItem('lumiere_checkout_session', sessionToken);

  const isCOD = window.currentPaymentMethod === 'COD';

  if (isCOD) {
    // COD checkout flow: Stable, de-duplicated key
    const paymentId = 'cod_' + sessionToken;
    const payload = {
      action: "new_order",
      siteToken: "LUMIERE_STORE_2026",
      paymentId: paymentId,
      orderId: 'tmp',
      date: new Date().toISOString(),
      sessionId: sessionToken,
      name: `${window.shippingInfo.fname} ${window.shippingInfo.lname}`,
      email: userEmail,
      total: `₹${prices.total}`,
      phone: window.shippingInfo.phone,
      shippingAddress: window.shippingInfo.address,
      items: window.cart.map(i => `${i.product.name} (${i.variant.name}) x${i.quantity}`).join(', ') + (giftCardLayoutId ? ', Personalized Gift Card' : ''),
      rawItems: { items: window.cart, subtotal: prices.subtotal, giftCardFee: prices.giftCardFee, total: prices.total },
      addressId: window.selectedAddressId || null,
      fname: window.shippingInfo.fname,
      lname: window.shippingInfo.lname,
      city: window.shippingInfo.city,
      state: window.shippingInfo.state,
      pincode: window.shippingInfo.pincode,
      addressLabel: window.selectedAddressLabel || 'Home',
      couponCode: window.appliedPromoCode?.code || null,
      deliveryMethod: window.deliveryMethod || 'Shipping',
      giftCardLayoutId: giftCardLayoutId,
      isGift: isGift
    };

    try {
      const res = await fetch(CORE_STORE_PROXY_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      window.hideLoadingOverlay();
      if (json.success) {
        window.stopCheckoutTimer();
        sessionStorage.removeItem('lumiere_checkout_session');
        sessionStorage.removeItem('lumiere_applied_promo');
        sessionStorage.removeItem('lumiere_gift_card_layout');
        sessionStorage.removeItem('lumiere_cart_type');
        if (typeof window.setCartType === 'function') {
          window.setCartType('normal', false);
        }
        document.getElementById('celebrationOrderId').textContent = json.orderId;
        document.getElementById('successCustomerName').textContent = `${window.shippingInfo.fname} ${window.shippingInfo.lname}`;
        document.getElementById('celebrationModal').classList.add('active');
        window.triggerCelebration();
        window.cart = [];
        window.updateCart();
      } else {
        window.showToast(json.error || "Order entry execution failed.", true);
      }
    } catch (e) {
      window.hideLoadingOverlay();
      window.showToast("Connection error while processing order.", true);
    }
    window._submittingOrder = false;
  } else {
    // Online Checkout Flow: Get payment intent first
    const intentPayload = {
      action: "create_payment_intent",
      siteToken: "LUMIERE_STORE_2026",
      items: window.cart,
      couponCode: window.appliedPromoCode?.code || null,
      email: userEmail,
      name: `${window.shippingInfo.fname} ${window.shippingInfo.lname}`,
      phone: window.shippingInfo.phone,
      addressId: window.selectedAddressId || null,
      shippingAddress: window.shippingInfo.address,
      city: window.shippingInfo.city,
      state: window.shippingInfo.state,
      pincode: window.shippingInfo.pincode,
      addressLabel: window.selectedAddressLabel || 'Home',
      sessionId: sessionToken,
      deliveryMethod: window.deliveryMethod || 'Shipping',
      giftCardLayoutId: giftCardLayoutId,
      isGift: isGift
    };

    try {
      const res = await fetch(CORE_STORE_PROXY_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intentPayload)
      });
      const json = await res.json();

      if (!json.success) {
        window.hideLoadingOverlay();
        window.showToast(json.error || "Failed to initiate payment.", true);
        window._submittingOrder = false;
        return;
      }

      const config = {
        "root": "",
        "flow": "DEFAULT",
        "data": {
          "orderId": json.razorpayOrderId,
          "token": json.txnToken,
          "tokenType": "TXN_TOKEN",
          "amount": json.expectedTotal
        },
        "merchant": {
          "redirect": false
        },
        "handler": {
          "transactionStatus": async function (response) {
            console.log("Paytm transaction status received:", response);
            if (response.STATUS === 'TXN_SUCCESS') {
              window.showLoadingOverlay("Processing your order...", "Please do not close the window or click back.");
              const payload = {
                action: "new_order",
                siteToken: "LUMIERE_STORE_2026",
                paymentId: response.TXNID,
                razorpayOrderId: response.ORDERID,
                razorpaySignature: JSON.stringify(response),
                sessionId: sessionToken,
                name: `${window.shippingInfo.fname} ${window.shippingInfo.lname}`,
                email: userEmail,
                total: `₹${prices.total}`,
                phone: window.shippingInfo.phone,
                shippingAddress: window.shippingInfo.address,
                items: window.cart.map(i => `${i.product.name} (${i.variant.name}) x${i.quantity}`).join(', ') + (giftCardLayoutId ? ', Personalized Gift Card' : ''),
                rawItems: { items: window.cart, subtotal: prices.subtotal, giftCardFee: prices.giftCardFee, total: prices.total },
                addressId: window.selectedAddressId || null,
                fname: window.shippingInfo.fname,
                lname: window.shippingInfo.lname,
                city: window.shippingInfo.city,
                state: window.shippingInfo.state,
                pincode: window.shippingInfo.pincode,
                addressLabel: window.selectedAddressLabel || 'Home',
                couponCode: window.appliedPromoCode?.code || null,
                deliveryMethod: window.deliveryMethod || 'Shipping',
                giftCardLayoutId: giftCardLayoutId,
                isGift: isGift
              };

              try {
                const orderRes = await fetch(CORE_STORE_PROXY_ROUTE, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
                const orderJson = await orderRes.json();
                window.hideLoadingOverlay();
                if (orderJson.success) {
                  window.stopCheckoutTimer();
                  sessionStorage.removeItem('lumiere_checkout_session');
                  sessionStorage.removeItem('lumiere_applied_promo');
                  sessionStorage.removeItem('lumiere_gift_card_layout');
                  sessionStorage.removeItem('lumiere_cart_type');
                  if (typeof window.setCartType === 'function') {
                    window.setCartType('normal', false);
                  }
                  document.getElementById('celebrationOrderId').textContent = orderJson.orderId;
                  document.getElementById('successCustomerName').textContent = `${window.shippingInfo.fname} ${window.shippingInfo.lname}`;
                  document.getElementById('celebrationModal').classList.add('active');
                  window.triggerCelebration();
                  window.cart = [];
                  window.updateCart();
                } else {
                  window.showToast(orderJson.error || "Order execution failed.", true);
                }
              } catch (err) {
                window.hideLoadingOverlay();
                window.showToast("Connection error while processing order.", true);
              }
            } else {
              window.showToast(response.RESPMSG || "Payment failed or was cancelled.", true);
            }
            window._submittingOrder = false;
          },
          "notifyMerchant": function(eventName, data) {
            console.log("Paytm notifyMerchant:", eventName, data);
            if (eventName === 'CLOSED') {
              window.hideLoadingOverlay();
              window._submittingOrder = false;
            }
          }
        }
      };

      if (json.razorpayOrderId.startsWith('order_mock_')) {
        console.log("Mock Order ID detected. Bypassing Paytm modal in development mode.");
        const mockTxnId = 'pay_mock_' + Math.random().toString(36).substring(2, 15);
        const mockSignature = 'sig_mock_' + Math.random().toString(36).substring(2, 15);
        config.handler.transactionStatus({
          STATUS: 'TXN_SUCCESS',
          TXNID: mockTxnId,
          ORDERID: json.razorpayOrderId,
          CHECKSUMHASH: mockSignature,
          RESPMSG: 'Mock success'
        });
        return;
      }

      if (window.Paytm && window.Paytm.CheckoutJS) {
        window.Paytm.CheckoutJS.init(config).then(function() {
          window.Paytm.CheckoutJS.invoke();
        }).catch(function(error) {
          console.error("Paytm CheckoutJS initialization failed:", error);
          window.hideLoadingOverlay();
          window.showToast("Failed to initialize payment gateway.", true);
          window._submittingOrder = false;
        });
      } else {
        console.error("Paytm CheckoutJS library not loaded on page.");
        window.hideLoadingOverlay();
        window.showToast("Payment gateway library not loaded.", true);
        window._submittingOrder = false;
      }

    } catch (e) {
      window.hideLoadingOverlay();
      window.showToast("Failed to connect to gateway server.", true);
      window._submittingOrder = false;
    }
  }
};

window.clearUserProfileState = function() {
  window._ordersData = null;
  window.wishlistCache = [];
  var list = document.getElementById('myOrdersListContainer');
  if (list) list.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 2rem 0;">No order history found.</p>';
  var detail = document.getElementById('orderDetailContent');
  if (detail) { detail.style.display = 'none'; }
  var empty = document.getElementById('orderDetailEmpty');
  if (empty) empty.style.display = 'block';

  var wishlistContainer = document.getElementById('myWishlistContainer');
  if (wishlistContainer) {
    wishlistContainer.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 4rem 0; grid-column: 1 / -1;">Please sign in to view your wishlist.</p>';
  }

  localStorage.removeItem('lumiere_user_phone');
  localStorage.removeItem('lumiere_user_addresses');
  window.renderAccountAvatar();
};

window.showLogin = function() {
  if (window.isUserLoggedIn()) {
    getSupabase().then(supabase => supabase.auth.signOut());
    window.clearUserProfileState();
    return;
  }
  window.loginWithGoogle();
};

window.loginWithGoogle = async function() {
  window.showLoadingOverlay("Redirecting to Google...", "Please wait.");
  await window.initializeSupabaseAuth();
  const supabase = await getSupabase();
  const osRand = generateSecureToken();
  sessionStorage.setItem('l_os', osRand);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
      state: osRand
    }
  });
  if (error) {
    sessionStorage.removeItem('l_os');
    window.hideLoadingOverlay();
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = 'Google sign-in failed: ' + error.message;
      errEl.style.display = 'block';
    } else {
      window.showToast('Google sign-in failed: ' + error.message, true);
    }
  } else if (data?.url) {
    window.location.href = data.url;
  } else {
    window.hideLoadingOverlay();
  }
};

window.checkoutGoogleLogin = function() {
  localStorage.setItem('lumiere_login_redirect', 'payment');
  window.loginWithGoogle();
};

window.prefillContactForm = function() {
  const nameField = document.getElementById('contactName');
  
  const loggedInName = window.getLoggedInName();
  if (nameField && loggedInName) {
    nameField.value = loggedInName;
  }
};

window.prefillCheckoutForm = async function() {
  const user = authStore.getCurrentUser();
  const loggedInEmail = user?.email || null;
  const loggedInName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const autofillBtn = document.getElementById('googleAutofillBtn');
  const savedSec = document.getElementById('savedAddressesSection');
  const form = document.getElementById('checkoutForm');
  const guestBtn = document.getElementById('guestProceedBtn');
  const actionsWrap = document.getElementById('addressFormActions');
  const metaFields = document.getElementById('addressMetaFields');

  if (loggedInEmail) {
    if (autofillBtn) autofillBtn.style.display = 'none';

    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.value = loggedInEmail;
      emailField.disabled = true;
    }

    if (window.deliveryMethod === 'Pickup') {
      if (savedSec) savedSec.style.display = 'none';
      if (form) form.style.display = 'block';
      if (guestBtn) guestBtn.style.display = 'block';
      if (actionsWrap) actionsWrap.style.display = 'none';
      if (metaFields) metaFields.style.display = 'none';

      // Prefill contact details from default address if available, or metadata
      const rawAddrs = localStorage.getItem('lumiere_user_addresses');
      const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];

      const fnameField = document.getElementById('fname');
      const lnameField = document.getElementById('lname');
      const phoneField = document.getElementById('phone');

      if (defaultAddr) {
        if (fnameField && !fnameField.value) fnameField.value = defaultAddr.fname || '';
        if (lnameField && !lnameField.value) lnameField.value = defaultAddr.lname || '';
        if (phoneField && !phoneField.value) phoneField.value = defaultAddr.phone || '';
      } else {
        const user = authStore.getCurrentUser();
        const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
        if (rawName) {
          const nameParts = rawName.trim().split(/\s+/);
          if (fnameField && !fnameField.value) fnameField.value = nameParts[0] || '';
          if (lnameField && !lnameField.value) lnameField.value = nameParts.slice(1).join(' ') || '';
        } else if (user?.email && fnameField && !fnameField.value) {
          fnameField.value = user.email.split('@')[0] || '';
        }
      }
    } else {
      if (guestBtn) guestBtn.style.display = 'none';
      if (actionsWrap) actionsWrap.style.display = 'flex';
      if (metaFields) metaFields.style.display = 'block';

      const rawAddrs = localStorage.getItem('lumiere_user_addresses');
      const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];

      if (addresses.length > 0) {
        if (savedSec) savedSec.style.display = 'block';
        if (form) form.style.display = 'none';
        window.renderSavedAddresses();
        const selectedAddr = addresses.find(a => String(a.id) === String(window.selectedAddressId));
        if (selectedAddr) {
          window.shippingInfo = {
            fname: selectedAddr.fname,
            lname: selectedAddr.lname,
            email: loggedInEmail,
            address: selectedAddr.address,
            city: selectedAddr.city,
            state: selectedAddr.state,
            pincode: selectedAddr.pincode,
            phone: selectedAddr.phone
          };
        }
      } else {
        if (savedSec) savedSec.style.display = 'none';
        if (form) form.style.display = 'block';
        window.showNewAddressForm(true);
      }
    }
  } else {
    if (autofillBtn) autofillBtn.style.display = 'flex';
    if (savedSec) savedSec.style.display = 'none';
    if (form) form.style.display = 'block';
    if (guestBtn) guestBtn.style.display = 'block';
    if (actionsWrap) actionsWrap.style.display = 'none';
    if (metaFields) metaFields.style.display = 'none';

    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.disabled = false;
    }
  }
  window.updateAddingAddressClass();
  window.calculatePrices();
};

window.renderSavedAddresses = function() {
  const grid = document.getElementById('savedAddressesGrid');
  if (!grid) return;
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];

  if (addresses.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--stone);font-size:0.85rem;">No saved addresses yet. Please add a new address.</p>';
    return;
  }

  if (!window.selectedAddressId) {
    const def = addresses.find(a => a.is_default) || addresses[0];
    if (def) window.selectedAddressId = def.id;
  }

  grid.innerHTML = addresses.map(a => {
    const isSelected = String(a.id) === String(window.selectedAddressId);
    const borderStyle = isSelected ? '2px solid var(--gold)' : '1px solid var(--sand)';
    const bgStyle = isSelected ? 'var(--cream)' : 'white';
    
    return `
      <div class="address-card" onclick="window.selectAddressCard(${a.id})" style="border:${borderStyle}; background:${bgStyle}; padding:1.2rem; cursor:pointer; position:relative; transition:all 0.3s; border-radius:2px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-size:0.65rem; padding:2px 8px; text-transform:uppercase; letter-spacing:0.05em; background:var(--charcoal); color:white; font-weight:500; border-radius:2px;">${a.label}</span>
          ${a.is_default ? `<span style="font-size:0.65rem; padding:1px 6px; text-transform:uppercase; letter-spacing:0.05em; border:1px solid var(--gold); color:var(--gold-dark); font-weight:500; border-radius:2px;">Default</span>` : ''}
        </div>
        <div style="font-family:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:600; color:var(--black); margin-bottom:0.4rem;">${a.fname} ${a.lname}</div>
        <div style="font-size:0.78rem; color:var(--charcoal); line-height:1.4; margin-bottom:0.6rem; font-family:'Jost',sans-serif;">${a.address}, ${a.city}, ${a.state} - ${a.pincode}</div>
        <div style="font-size:0.75rem; color:var(--stone); font-family:'Jost',sans-serif;">Phone: ${a.phone}</div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:0.8rem; border-top:1px dashed rgba(196,181,160,0.25); padding-top:0.6rem;" onclick="event.stopPropagation()">
          <button type="button" onclick="window.editAddressCard(${a.id}, event)" style="background:none; border:none; cursor:pointer; font-size:0.7rem; font-family:'Jost',sans-serif; text-transform:uppercase; letter-spacing:0.05em; color:var(--stone); transition:all 0.2s;" onmouseover="this.style.color='var(--gold)';" onmouseout="this.style.color='var(--stone)';">Edit</button>
          <button type="button" onclick="window.deleteAddressCard(${a.id}, event)" style="background:none; border:none; cursor:pointer; font-size:0.7rem; font-family:'Jost',sans-serif; text-transform:uppercase; letter-spacing:0.05em; color:var(--stone); transition:all 0.2s;" onmouseover="this.style.color='var(--danger)';" onmouseout="this.style.color='var(--stone)';">Delete</button>
        </div>
      </div>
    `;
  }).join('');
};

window.selectAddressCard = function(id) {
  window.selectedAddressId = id;
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
  const addr = addresses.find(a => String(a.id) === String(id));
  if (addr) {
    window.selectedAddressLabel = addr.label || '';
    window.shippingInfo = {
      fname: addr.fname,
      lname: addr.lname,
      email: window.getLoggedInEmail() || '',
      address: addr.address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      phone: addr.phone
    };
  }
  window.renderSavedAddresses();
  window.calculatePrices();
};

window.updateAddingAddressClass = function() {
  const paymentSec = document.getElementById('payment');
  if (!paymentSec) return;
  const form = document.getElementById('checkoutForm');
  const isVisible = form && form.style.display === 'block';
  const isShipping = window.deliveryMethod === 'Shipping';
  
  if (isVisible && isShipping) {
    paymentSec.classList.add('adding-address');
  } else {
    paymentSec.classList.remove('adding-address');
  }
};

window.showNewAddressForm = function(isFirst = false) {
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
  if (addresses.length >= 5) {
    window.showToast("You can save a maximum of 5 addresses. Please delete an address first.", true);
    return;
  }

  window.editingAddressId = null;
  
  document.getElementById('fname').value = '';
  document.getElementById('lname').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('address').value = '';
  document.getElementById('pincode').value = '';
  document.getElementById('city').value = '';
  document.getElementById('state').value = '';
  
  const user = authStore.getCurrentUser();
  if (user) {
    const rawName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    if (rawName) {
      const nameParts = rawName.trim().split(/\s+/);
      document.getElementById('fname').value = nameParts[0] || '';
      document.getElementById('lname').value = nameParts.slice(1).join(' ') || '';
    } else if (user.email) {
      document.getElementById('fname').value = user.email.split('@')[0] || '';
    }
  }

  const defCheck = document.getElementById('isAddressDefault');
  if (defCheck) defCheck.checked = isFirst;

  window.setAddressLabel('Home');

  const savedSec = document.getElementById('savedAddressesSection');
  if (savedSec) savedSec.style.display = 'none';
  const form = document.getElementById('checkoutForm');
  if (form) form.style.display = 'block';
  window.updateAddingAddressClass();
};

window.editAddressCard = function(id, event) {
  if (event) event.stopPropagation();
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
  const addr = addresses.find(a => String(a.id) === String(id));
  if (!addr) return;

  window.editingAddressId = id;

  document.getElementById('fname').value = addr.fname || '';
  document.getElementById('lname').value = addr.lname || '';
  document.getElementById('phone').value = addr.phone || '';
  document.getElementById('address').value = addr.address || '';
  document.getElementById('pincode').value = addr.pincode || '';
  document.getElementById('city').value = addr.city || '';
  document.getElementById('state').value = addr.state || '';

  const defCheck = document.getElementById('isAddressDefault');
  if (defCheck) defCheck.checked = addr.is_default || false;

  window.setAddressLabel(addr.label || 'Home');

  const savedSec = document.getElementById('savedAddressesSection');
  if (savedSec) savedSec.style.display = 'none';
  const form = document.getElementById('checkoutForm');
  if (form) form.style.display = 'block';
  window.updateAddingAddressClass();
};

window.cancelAddressForm = function() {
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];

  if (addresses.length === 0) {
    window.showPage('cartPage');
    return;
  }

  const savedSec = document.getElementById('savedAddressesSection');
  if (savedSec) savedSec.style.display = 'block';
  const form = document.getElementById('checkoutForm');
  if (form) form.style.display = 'none';
  window.updateAddingAddressClass();
};

window.setAddressLabel = function(label) {
  window.selectedAddressLabel = label;
  const labels = ['Home', 'Work', 'Other'];
  labels.forEach(l => {
    const btn = document.getElementById('labelBtn' + l);
    if (!btn) return;
    if (l === label) {
      btn.style.background = 'var(--cream)';
      btn.style.borderColor = 'var(--stone)';
    } else {
      btn.style.background = 'white';
      btn.style.borderColor = 'var(--sand)';
    }
  });
};

window.deleteAddressCard = function(id, event) {
  if (event) event.stopPropagation();
  window.showConfirmModal({
    category: 'Addresses',
    title: 'Delete Address?',
    text: 'Are you sure you want to delete this address?',
    confirmText: 'Delete',
    onConfirm: () => {
      const email = window.getLoggedInEmail();
      if (!email) return;

      window.showLoadingOverlay("Deleting address...");
      fetchWithAuth(CORE_STORE_PROXY_ROUTE, {
        method: "POST",
        body: JSON.stringify({
          action: "delete_address",
          email,
          addressId: id,
          siteToken: "LUMIERE_STORE_2026"
        })
      }).then(res => res.json())
        .then(json => {
          if (json.success) {
            window.syncUserProfile(email, () => {
              if (String(window.selectedAddressId) === String(id)) {
                window.selectedAddressId = null;
              }
              window.prefillCheckoutForm();
              window.hideLoadingOverlay();
            });
          } else {
            window.showToast(json.error || "Failed to delete address.", true);
            window.hideLoadingOverlay();
          }
        }).catch(e => {
          console.error(e);
          window.hideLoadingOverlay();
        });
    }
  });
};

window.saveAddressForm = function() {
  const form = document.getElementById('checkoutForm');
  if (form && !form.reportValidity()) return;

  const email = window.getLoggedInEmail();
  if (!email) return;

  const payload = {
    action: window.editingAddressId ? 'edit_address' : 'add_address',
    email,
    addressId: window.editingAddressId,
    label: window.selectedAddressLabel || 'Home',
    fname: document.getElementById('fname').value,
    lname: document.getElementById('lname').value,
    address: document.getElementById('address').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    pincode: document.getElementById('pincode').value,
    phone: document.getElementById('phone').value,
    isDefault: document.getElementById('isAddressDefault').checked,
    siteToken: "LUMIERE_STORE_2026"
  };

  window.showLoadingOverlay(window.editingAddressId ? "Updating address..." : "Saving new address...");
  fetchWithAuth(CORE_STORE_PROXY_ROUTE, {
    method: "POST",
    body: JSON.stringify(payload)
  }).then(res => res.json())
    .then(json => {
      if (json.success) {
        window.syncUserProfile(email, () => {
          if (json.address && !window.editingAddressId) {
            window.selectedAddressId = json.address.id;
          }
          window.prefillCheckoutForm();
          window.hideLoadingOverlay();
        });
      } else {
        window.showToast(json.error || "Failed to save address.", true);
        window.hideLoadingOverlay();
      }
    }).catch(e => {
      console.error(e);
      window.hideLoadingOverlay();
    });
};

window.renderAddressesPage = function() {
  const email = window.getLoggedInEmail();
  if (!email) return;

  const grid = document.getElementById('addressesPageGrid');
  if (grid) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--stone);font-size:0.85rem;">Loading saved addresses...</p>';
  }

  window.syncUserProfile(email, () => {
    window.displayAddressesPageList();
  });
};

window.displayAddressesPageList = function() {
  const grid = document.getElementById('addressesPageGrid');
  if (!grid) return;
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];

  if (addresses.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem 0;color:var(--stone);font-size:0.9rem;">No saved addresses yet. Click "+ Add New Address" to add one.</p>';
    return;
  }

  grid.innerHTML = addresses.map(a => {
    return `
      <div class="address-card" style="border:1px solid var(--sand); background:white; padding:1.5rem; position:relative; transition:all 0.3s; border-radius:4px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-size:0.65rem; padding:2px 8px; text-transform:uppercase; letter-spacing:0.05em; background:var(--charcoal); color:white; font-weight:500; border-radius:2px;">${a.label}</span>
          ${a.is_default ? `<span style="font-size:0.65rem; padding:1px 6px; text-transform:uppercase; letter-spacing:0.05em; border:1px solid var(--gold); color:var(--gold-dark); font-weight:500; border-radius:2px;">Default</span>` : ''}
        </div>
        <div style="font-family:'Cormorant Garamond',serif; font-size:1.25rem; font-weight:600; color:var(--black); margin-bottom:0.5rem;">${a.fname} ${a.lname}</div>
        <div style="font-size:0.85rem; color:var(--charcoal); line-height:1.5; margin-bottom:0.75rem; font-family:'Jost',sans-serif;">${a.address}, ${a.city}, ${a.state} - ${a.pincode}</div>
        <div style="font-size:0.8rem; color:var(--stone); font-family:'Jost',sans-serif;">Phone: ${a.phone}</div>
        <div style="display:flex; justify-content:flex-end; gap:16px; margin-top:1.2rem; border-top:1px dashed rgba(196,181,160,0.25); padding-top:0.8rem;">
          <button type="button" onclick="window.editAddressesPageCard(${a.id})" style="background:none; border:none; cursor:pointer; font-size:0.75rem; font-family:'Jost',sans-serif; text-transform:uppercase; letter-spacing:0.05em; color:var(--stone); transition:all 0.2s;" onmouseover="this.style.color='var(--gold)';" onmouseout="this.style.color='var(--stone)';">Edit</button>
          <button type="button" onclick="window.deleteAddressesPageCard(${a.id})" style="background:none; border:none; cursor:pointer; font-size:0.75rem; font-family:'Jost',sans-serif; text-transform:uppercase; letter-spacing:0.05em; color:var(--stone); transition:all 0.2s;" onmouseover="this.style.color='var(--danger)';" onmouseout="this.style.color='var(--stone)';">Delete</button>
        </div>
      </div>
    `;
  }).join('');
};

window.showNewAddressesPageForm = function() {
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
  if (addresses.length >= 5) {
    window.showToast("You can save a maximum of 5 addresses. Please delete an address first.", true);
    return;
  }

  window.editingAddressesPageId = null;
  
  document.getElementById('addr_fname').value = '';
  document.getElementById('addr_lname').value = '';
  document.getElementById('addr_phone').value = '';
  document.getElementById('addr_address').value = '';
  document.getElementById('addr_pincode').value = '';
  document.getElementById('addr_city').value = '';
  document.getElementById('addr_state').value = '';
  
  const user = authStore.getCurrentUser();
  if (user) {
    const rawName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    if (rawName) {
      const nameParts = rawName.trim().split(/\s+/);
      document.getElementById('addr_fname').value = nameParts[0] || '';
      document.getElementById('addr_lname').value = nameParts.slice(1).join(' ') || '';
    } else if (user.email) {
      document.getElementById('addr_fname').value = user.email.split('@')[0] || '';
    }
  }

  const defCheck = document.getElementById('isAddrDefault');
  if (defCheck) {
    const rawAddrs = localStorage.getItem('lumiere_user_addresses');
    const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
    defCheck.checked = addresses.length === 0;
  }

  window.setAddressesPageLabel('Home');
  
  document.getElementById('addressesPageFormTitle').textContent = 'Add New Address';

  const modal = document.getElementById('addressesPageFormModal');
  if (modal) {
    modal.classList.add('active');
  }
};

window.editAddressesPageCard = function(id) {
  const rawAddrs = localStorage.getItem('lumiere_user_addresses');
  const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
  const addr = addresses.find(a => String(a.id) === String(id));
  if (!addr) return;

  window.editingAddressesPageId = id;

  document.getElementById('addr_fname').value = addr.fname || '';
  document.getElementById('addr_lname').value = addr.lname || '';
  document.getElementById('addr_phone').value = addr.phone || '';
  document.getElementById('addr_address').value = addr.address || '';
  document.getElementById('addr_pincode').value = addr.pincode || '';
  document.getElementById('addr_city').value = addr.city || '';
  document.getElementById('addr_state').value = addr.state || '';

  const defCheck = document.getElementById('isAddrDefault');
  if (defCheck) defCheck.checked = addr.is_default || false;

  window.setAddressesPageLabel(addr.label || 'Home');
  
  document.getElementById('addressesPageFormTitle').textContent = 'Edit Address';

  const modal = document.getElementById('addressesPageFormModal');
  if (modal) {
    modal.classList.add('active');
  }
};

window.hideAddressesPageForm = function() {
  const modal = document.getElementById('addressesPageFormModal');
  if (modal) modal.classList.remove('active');
};

window.setAddressesPageLabel = function(label) {
  window.selectedAddressesPageLabel = label;
  const labels = ['Home', 'Work', 'Other'];
  labels.forEach(l => {
    const btn = document.getElementById('addrLabelBtn' + l);
    if (!btn) return;
    if (l === label) {
      btn.style.background = 'var(--cream)';
      btn.style.borderColor = 'var(--stone)';
    } else {
      btn.style.background = 'white';
      btn.style.borderColor = 'var(--sand)';
    }
  });
};

window.deleteAddressesPageCard = function(id) {
  window.showConfirmModal({
    category: 'Addresses',
    title: 'Delete Address?',
    text: 'Are you sure you want to delete this address?',
    confirmText: 'Delete',
    onConfirm: () => {
      const email = window.getLoggedInEmail();
      if (!email) return;

      window.showLoadingOverlay("Deleting address...");
      fetchWithAuth(CORE_STORE_PROXY_ROUTE, {
        method: "POST",
        body: JSON.stringify({
          action: "delete_address",
          email,
          addressId: id,
          siteToken: "LUMIERE_STORE_2026"
        })
      }).then(res => res.json())
        .then(json => {
          if (json.success) {
            window.syncUserProfile(email, () => {
              if (String(window.selectedAddressId) === String(id)) {
                window.selectedAddressId = null;
              }
              window.displayAddressesPageList();
              window.showToast("Address deleted successfully.");
              window.hideLoadingOverlay();
            });
          } else {
            window.showToast(json.error || "Failed to delete address.", true);
            window.hideLoadingOverlay();
          }
        }).catch(e => {
          console.error(e);
          window.hideLoadingOverlay();
        });
    }
  });
};

window.saveAddressesPageForm = function() {
  const form = document.getElementById('addressesPageForm');
  if (form && !form.reportValidity()) return;

  const email = window.getLoggedInEmail();
  if (!email) return;

  const payload = {
    action: window.editingAddressesPageId ? 'edit_address' : 'add_address',
    email,
    addressId: window.editingAddressesPageId,
    label: window.selectedAddressesPageLabel || 'Home',
    fname: document.getElementById('addr_fname').value,
    lname: document.getElementById('addr_lname').value,
    address: document.getElementById('addr_address').value,
    city: document.getElementById('addr_city').value,
    state: document.getElementById('addr_state').value,
    pincode: document.getElementById('addr_pincode').value,
    phone: document.getElementById('addr_phone').value,
    isDefault: document.getElementById('isAddrDefault').checked,
    siteToken: "LUMIERE_STORE_2026"
  };

  window.showLoadingOverlay(window.editingAddressesPageId ? "Updating address..." : "Saving new address...");
  fetchWithAuth(CORE_STORE_PROXY_ROUTE, {
    method: "POST",
    body: JSON.stringify(payload)
  }).then(res => res.json())
    .then(json => {
      if (json.success) {
        window.syncUserProfile(email, () => {
          if (json.address && (!window.selectedAddressId || json.address.is_default)) {
            window.selectedAddressId = json.address.id;
          }
          window.displayAddressesPageList();
          window.hideAddressesPageForm();
          window.showToast(window.editingAddressesPageId ? "Address updated successfully." : "Address added successfully.");
          window.hideLoadingOverlay();
        });
      } else {
        window.showToast(json.error || "Failed to save address.", true);
        window.hideLoadingOverlay();
      }
    }).catch(e => {
      console.error(e);
      window.hideLoadingOverlay();
    });
};

window.syncUserProfile = async function(email, callback) {
  // Skip if no auth token exists — profile fetch requires a valid Supabase session
  const supabase = await getSupabase();
  let session = null;
  let authToken = null;

  // Retry up to 5 times with a 200ms delay to wait for Supabase session initialization if needed
  for (let i = 0; i < 5; i++) {
    const res = await supabase.auth.getSession();
    session = res.data?.session;
    authToken = session?.access_token || getAuthTokenFromStorage();
    if (authToken) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!authToken) {
    if (callback) callback(null);
    return;
  }
  fetchWithAuth(CORE_STORE_PROXY_ROUTE, {
    method: "POST",
    body: JSON.stringify({
      action: "get_or_create_profile",
      email,
      siteToken: "LUMIERE_STORE_2026"
    })
  }).then(res => {
    if (res.status === 401) {
      if (callback) callback(null);
      return null;
    }
    return res.json();
  }).then(json => {
    if (json && json.success && json.user) {
      const cleanAddresses = (json.user.addresses || []).filter(a => 
        a.label !== 'Pickup' && 
        !String(a.address || '').includes('Self Pickup') && 
        !String(a.address || '').includes('Lumière Studio')
      );
      json.user.addresses = cleanAddresses;
      localStorage.setItem('lumiere_user_addresses', JSON.stringify(cleanAddresses));
      window.fetchWishlist();
      if (callback) callback(json.user);
    }
  }).catch(e => console.error("Profile sync failed:", e));
};

window.fetchMyOrders = async function() {
  var email = window.getLoggedInEmail();
  if (!email) return;
  var list = document.getElementById('myOrdersListContainer');
  var detail = document.getElementById('orderDetailContent');
  var empty = document.getElementById('orderDetailEmpty');
  list.innerHTML = '<p style="text-align:center;padding:1rem 0;color:var(--stone);">Loading...</p>';
  try {
    var res = await fetch(CORE_STORE_PROXY_ROUTE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track_order", query: email, siteToken: "LUMIERE_STORE_2026" }) });
    var json = await res.json();
    if (json.success && json.data.length > 0) {
      json.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      window._ordersData = json.data;
      window._selectedOrderId = json.data[0].id;
      
      const filterSelect = document.getElementById('orderTimeFilter');
      if (filterSelect) filterSelect.value = '3months';
      
      window.filterMyOrders();
      window.showOrderDetail(json.data[0].id, true);
    } else {
      list.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 2rem 0;">No order history found.</p>';
    }
  } catch(e) {
    list.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 2rem 0;">Failed to load order history.</p>';
  }
};

window.filterMyOrders = function() {
  const filterVal = document.getElementById('orderTimeFilter')?.value || 'all';
  let filtered = [...(window._ordersData || [])];
  
  if (filterVal === '3months') {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    filtered = filtered.filter(o => new Date(o.date) >= cutoff);
  } else if (filterVal === '6months') {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    filtered = filtered.filter(o => new Date(o.date) >= cutoff);
  }
  
  window.renderFilteredOrdersList(filtered);
};

window.renderFilteredOrdersList = function(orders) {
  var list = document.getElementById('myOrdersListContainer');
  if (!list) return;
  
  if (orders.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 2rem 0;">No orders found in this period.</p>';
    return;
  }
  
  list.innerHTML = orders.map(function(o) {
    var displayStatus = o.status;
    if (o.deliveryMethod === 'Pickup') {
      if (o.status === 'Shipped') displayStatus = 'Ready to Pick';
      else if (o.status === 'Delivered') displayStatus = 'Completed';
    }
    const isActive = String(o.id) === String(window._selectedOrderId);
    return '<div class="my-order-card' + (isActive ? ' active' : '') + '" onclick="window.showOrderDetail(\'' + o.id + '\')">' +
      '<div class="my-order-card-header">' +
        '<span class="my-order-card-id">' + o.id + '</span>' +
        '<span class="my-order-card-date">' + new Date(o.date).toLocaleDateString() + '</span>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem;">' +
        '<div class="my-order-card-total" style="margin:0;">' + o.total + '</div>' +
        '<span class="status-pill ' + o.status.toLowerCase() + '" style="margin:0;">' + displayStatus + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
};

window.copyToClipboard = function(text, event) {
  event.stopPropagation();
  navigator.clipboard.writeText(text).then(function() {
    var btn = event.currentTarget;
    var originalHTML = btn.innerHTML;
    btn.innerHTML = `${window.__svg.check} <span class="tracking-text-span" style="color:#059669;">Copied</span>`;
    btn.classList.add('copied');
    setTimeout(function() {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(function() {
    console.error("Failed to copy tracking number.");
  });
};

function getTrackingDetails(courierVal, trackingVal) {
  var courier = (courierVal || '').trim();
  var tracking = (trackingVal || '').trim();
  if (!courier && !tracking) return { courier: 'Standard Delivery', tracking: '' };
  if (!courier) courier = 'Standard Delivery';

  const hasDigits = (str) => /\d/.test(str);
  const knownCouriers = ['post', 'delhivery', 'bluedart', 'blue dart', 'fedex', 'dhl', 'ekart', 'xpressbees', 'shadowfax', 'dtdc', 'speedpost'];
  const courierLower = courier.toLowerCase();
  const trackingLower = tracking.toLowerCase();

  const isSwapped = 
    knownCouriers.some(kc => trackingLower.includes(kc)) ||
    (hasDigits(courier) && !hasDigits(tracking) && tracking.length > 0) ||
    (tracking.length > 0 && !hasDigits(tracking) && hasDigits(courier));

  if (isSwapped) {
    var temp = courier;
    courier = tracking;
    tracking = temp;
  }
  return { courier, tracking };
}

window.showOrderDetail = function(id, isAuto) {
  var orders = window._ordersData || [];
  var order = orders.find(function(o) { return o.id === id; });
  if (!order) return;

  window._selectedOrderId = id;
  var cards = document.querySelectorAll('.my-order-card');
  cards.forEach(function(card) {
    var cardId = card.querySelector('.my-order-card-id').textContent.trim();
    card.classList.toggle('active', cardId === id);
  });

  var items = order.itemsString ? order.itemsString.split(', ') : [];
  
  var itemsBreakdown = order.itemsBreakdown || [];
  if (itemsBreakdown.length === 0 && order.itemsString) {
    var rawItems = order.itemsString.split(', ');
    rawItems.forEach(function(raw) {
      var match = raw.match(/^(.*?)\s*\((.*?)\)\s*x(\d+)$/);
      if (match) {
        var prodName = match[1].trim();
        var variantName = match[2].trim();
        var qty = parseInt(match[3]) || 1;
        var price = 0;
        if (window.PRODUCTS) {
          var p = window.PRODUCTS.find(function(prod) {
            return prod.name.toLowerCase() === prodName.toLowerCase();
          });
          if (p) price = p.price;
        }
        itemsBreakdown.push({
          name: prodName,
          variant: variantName,
          price: price || 500,
          quantity: qty
        });
      }
    });
  }

  var rawItemsObj = null;
  if (order.rawItems) {
    if (typeof order.rawItems === 'string') {
      try { rawItemsObj = JSON.parse(order.rawItems); } catch(e) {}
    } else {
      rawItemsObj = order.rawItems;
    }
  }
  var giftCardFee = 0;
  if (rawItemsObj && rawItemsObj.giftCardFee) {
    giftCardFee = parseFloat(rawItemsObj.giftCardFee) || 0;
  }
  if (giftCardFee === 0 && order.itemsString && order.itemsString.toLowerCase().includes('personalized gift card')) {
    giftCardFee = 50;
  }

  var subtotal = itemsBreakdown.reduce(function(sum, item) {
    return sum + (parseFloat(item.price) * item.quantity);
  }, 0);
  
  var totalStr = order.total.replace(/[^0-9.]/g, '');
  var total = parseFloat(totalStr) || 0;
  var shipping = parseFloat(order.shipping) || 0;
  var discount = Math.max(0, subtotal + giftCardFee + shipping - total);

  var itemsHtml = '';
  if (itemsBreakdown.length > 0) {
    itemsHtml = itemsBreakdown.map(function(item) {
      return '<div style="display:flex;justify-content:space-between;padding:0.4rem 0;font-size:0.88rem;color:var(--charcoal);">' +
        '<span>' + item.name + ' (' + item.variant + ') <span style="color:var(--stone);font-size:0.8rem;margin-left:0.4rem;">x' + item.quantity + '</span></span>' +
        '<span style="font-family:\'Cormorant Garamond\',serif;font-weight:400;color:var(--gold-dark);font-size:0.95rem;">₹' + (item.price * item.quantity) + '</span>' +
        '</div>';
    }).join('');
  } else {
    itemsHtml = items.map(function(i) {
      return '<div style="padding:0.4rem 0;font-size:0.88rem;color:var(--charcoal);">' + i + '</div>';
    }).join('');
  }

  var breakdownHtml = '';
  if (itemsBreakdown.length > 0) {
    breakdownHtml = 
      '<div style="border-top:1px dashed rgba(196,181,160,0.35);margin-top:1rem;padding-top:1rem;display:flex;flex-direction:column;gap:0.4rem;">' +
        '<div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--stone);">' +
          '<span>Subtotal</span>' +
          '<span>₹' + subtotal + '</span>' +
        '</div>' +
        (giftCardFee > 0 ? 
        ('<div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--stone);">' +
          '<span>Personalized Gift Card</span>' +
          '<span>₹' + giftCardFee + '</span>' +
        '</div>') : '') +
        (discount > 0 ? 
        ('<div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--danger);">' +
          '<span>Discount</span>' +
          '<span>-₹' + discount + '</span>' +
        '</div>') : '') +
        '<div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--stone);">' +
          '<span>Delivery Method</span>' +
          '<span>' + (order.deliveryMethod === 'Pickup' ? 'Self Pickup In Store' : 'Shipping') + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--stone);">' +
          '<span>Shipping Charges</span>' +
          '<span>' + (order.deliveryMethod === 'Pickup' ? 'Free (Self Pickup)' : '₹' + shipping) + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:1.15rem;font-family:\'Cormorant Garamond\',serif;color:var(--gold-dark);font-weight:500;border-top:1px solid rgba(196,181,160,0.25);padding-top:0.75rem;margin-top:0.35rem;">' +
          '<span>Total</span>' +
          '<span>' + order.total + '</span>' +
        '</div>' +
      '</div>';
  } else {
    breakdownHtml = 
      '<div style="border-top:1px dashed rgba(196,181,160,0.35);margin-top:1rem;padding-top:1rem;display:flex;justify-content:space-between;font-size:1.15rem;font-family:\'Cormorant Garamond\',serif;color:var(--gold-dark);font-weight:500;">' +
        '<span>Total</span>' +
        '<span>' + order.total + '</span>' +
      '</div>';
  }

  var details = getTrackingDetails(order.courier, order.trackingNumber);
  var trackingLink = order.trackingLink || '';

  var isPickup = order.deliveryMethod === 'Pickup';
  var displayStatus = order.status;
  if (isPickup) {
    if (order.status === 'Shipped') displayStatus = 'Ready to Pick';
    else if (order.status === 'Delivered') displayStatus = 'Completed';
  }

  var step1Label = 'Confirmed';
  var step2Label = isPickup ? 'Ready to Pick' : 'Shipped';
  var step3Label = isPickup ? 'Completed' : 'Delivered';

  var step1Icon = window.__svg.check;
  var step2Icon = (order.status === 'Shipped' || order.status === 'Delivered') ? window.__svg.check : (isPickup ? window.__svg.package : window.__svg.truck);
  var step3Icon = (order.status === 'Delivered') ? window.__svg.check : (isPickup ? window.__svg.check_circle : window.__svg.home);

  var feedbackHtml = '';
  if (order.status === 'Delivered') {
    var storedFeedbackKey = 'lumiere_order_feedback_' + order.id;
    var submittedRating = localStorage.getItem(storedFeedbackKey);
    var submittedComment = localStorage.getItem('lumiere_order_feedback_comment_' + order.id) || '';
    
    if (submittedRating) {
      feedbackHtml = 
        '<div class="order-feedback-card" style="margin-top:1.5rem; background:rgba(184,151,90,0.05); border:1px solid rgba(184,151,90,0.2); padding:1.2rem; border-radius:8px; text-align:center;">' +
          '<div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.4rem; font-weight:500;">Your Feedback</div>' +
          '<div style="font-size:1.4rem; color:var(--gold-dark); margin-bottom:0.25rem; display:flex; justify-content:center; gap:0.25rem;">' + 
            [1,2,3,4,5].map(function(num) {
              return '<span style="color:' + (num <= parseInt(submittedRating) ? 'var(--gold-dark)' : 'var(--taupe)') + ';">★</span>';
            }).join('') + 
          '</div>' +
          (submittedComment ? '<p style="font-size:0.85rem; color:var(--charcoal); margin-top:0.6rem; line-height:1.5; font-style:italic; padding:0 0.5rem; word-break:break-word;">"' + submittedComment + '"</p>' : '') +
          '<div style="font-size:0.8rem; color:var(--stone); margin-top:0.6rem;">Thank you for your feedback!</div>' +
        '</div>';
    } else {
      feedbackHtml = 
        '<div class="order-feedback-card" id="feedbackCard_' + order.id + '" style="margin-top:1.5rem; background:var(--cream); border:1px dashed var(--taupe); padding:1.2rem; border-radius:8px; text-align:center;">' +
          '<div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.4rem; font-weight:500;">How was your experience?</div>' +
          '<div class="star-rating-container" style="margin-bottom:0.4rem;">' +
            [5,4,3,2,1].map(function(num) {
              return '<span class="star-rating-item" data-val="' + num + '" onclick="window.selectFeedbackStars(\'' + order.id + '\', ' + num + ')">★</span>';
            }).join('') +
          '</div>' +
          '<div style="font-size:0.8rem; color:var(--stone);">Tap a star to leave a review</div>' +
          '<div id="feedbackFormContent_' + order.id + '" style="display:none; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">' +
            '<textarea id="feedbackComment_' + order.id + '" placeholder="Write your review... (max 200 characters)" maxlength="200" oninput="document.getElementById(\'feedbackCharCount_\' + \'' + order.id + '\').textContent = this.value.length + \'/200 characters\'" style="width: 100%; height: 80px; padding: 0.6rem; border: 1px solid var(--sand); border-radius: 4px; font-family: inherit; font-size: 0.82rem; resize: none; box-sizing: border-box; background: white; outline: none;"></textarea>' +
            '<div id="feedbackCharCount_' + order.id + '" style="font-size:0.75rem; text-align:right; color:var(--stone); margin-top:-0.4rem; margin-bottom:0.25rem;">0/200 characters</div>' +
            '<button class="btn-primary" onclick="window.submitFeedbackToDatabase(\'' + order.id + '\')" style="width: 100%; padding: 0.75rem; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; border-radius: 4px; cursor: pointer; border: none;">Submit Feedback</button>' +
          '</div>' +
        '</div>';
    }
  }

  var trackingCardHtml = '';
  if (isPickup) {
    trackingCardHtml = 
      '<div class="order-tracking-card" style="margin-top:0; margin-bottom:1.5rem;">' +
        '<div>' +
          '<div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Pickup Location</div>' +
          '<div style="font-size:0.9rem; color:var(--charcoal); font-weight:400; display:flex; align-items:center; gap:0.4rem;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
            'Cozy Aura Studio, Gunj Golai, Latur' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Pickup Hours</div>' +
          '<div style="font-size:0.9rem; color:var(--charcoal); font-weight:400; display:flex; align-items:center; gap:0.4rem; justify-content:flex-end;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            'Mon - Sat, 11 AM - 7 PM' +
          '</div>' +
        '</div>' +
      '</div>';
  } else if (details.tracking) {
    trackingCardHtml = 
      '<div class="order-tracking-card" style="margin-top:0; margin-bottom:1.5rem;">' +
        '<div>' +
          '<div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Courier Partner</div>' +
          '<div style="font-size:0.9rem; color:var(--charcoal); font-weight:400; display:flex; align-items:center; gap:0.4rem;">' + window.__svg.truck + details.courier + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Waybill / Tracking No.</div>' +
          '<div style="display:flex; align-items:center; gap:0.5rem; justify-content:flex-end;">' +
            (trackingLink ? '<a href="' + trackingLink + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8rem; color:var(--gold-dark); text-decoration:none; font-weight:500; background:var(--cream); border:1px solid rgba(184,151,90,0.2); padding:0.3rem 0.6rem; border-radius:4px; transition:all 0.2s;">' + window.__svg.external + 'Track</a>' : '') +
            '<div class="tracking-copy-btn" onclick="window.copyToClipboard(\'' + details.tracking + '\', event)">' +
              '<span class="tracking-text-span">' + details.tracking + '</span>' +
              window.__svg.copy +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  var contentHtml =
    '<div class="order-detail-header"><h3 class="order-detail-title" style="margin:0;line-height:1;">Order ID: ' + order.id + '</h3><span class="status-pill ' + order.status.toLowerCase() + '" style="margin:0;">' + displayStatus + '</span></div>' +
    '<div class="tracker-container"><div class="tracker-steps-line"><div class="tracker-progress-line" style="width:' + (order.status === 'Delivered' ? '100' : order.status === 'Shipped' ? '50' : '0') + '%"></div></div><div class="tracker-nodes"><div class="tracker-node' + (order.status !== 'Pending' ? ' completed' : ' active') + '"><div class="tracker-circle">' + step1Icon + '</div><span class="tracker-label">' + step1Label + '</span></div><div class="tracker-node' + (order.status === 'Shipped' || order.status === 'Delivered' ? ' completed' : order.status === 'Pending' ? '' : ' active') + '"><div class="tracker-circle">' + step2Icon + '</div><span class="tracker-label">' + step2Label + '</span></div><div class="tracker-node' + (order.status === 'Delivered' ? ' completed active' : '') + '"><div class="tracker-circle">' + step3Icon + '</div><span class="tracker-label">' + step3Label + '</span></div></div></div>' +
    trackingCardHtml +
    '<div class="orders-grid-info" style="margin-bottom:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;border-bottom:1px dashed rgba(196,181,160,0.2);padding-bottom:0.5rem;"><span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--stone);font-weight:500;">Order Invoice</span><span style="font-size:0.8rem;color:var(--stone);font-weight:400;">' + new Date(order.date).toLocaleDateString() + '</span></div>' +
      itemsHtml +
      breakdownHtml +
      feedbackHtml +
      (window.innerWidth < 1024 ? '<button class="btn-primary" onclick="window.closeOrderDetailModal()" style="width:100%; margin-top:1.5rem; padding: 1rem; font-size:0.75rem; letter-spacing:0.18em; text-transform:uppercase; border-radius:2px; cursor:pointer;">Close Details</button>' : '') +
    '</div>';

  if (window.innerWidth < 1024) {
    if (!isAuto) {
      document.getElementById('orderDetailModalContent').innerHTML = contentHtml;
      document.getElementById('orderDetailModal').classList.add('active');
    }
  } else {
    document.getElementById('orderDetailEmpty').style.display = 'none';
    var detail = document.getElementById('orderDetailContent');
    detail.style.display = 'block';
    detail.innerHTML = contentHtml;
    var detailContainer = document.getElementById('myOrderDetailContainer');
    if (detailContainer) detailContainer.scrollTop = 0;
  }
};

window.closeOrderDetailModal = function() {
  var modal = document.getElementById('orderDetailModal');
  if (modal) modal.classList.remove('active');
};

window.trackPackage = async function(e) {
  e.preventDefault();
  const input = document.getElementById('trackingInput').value.trim();
  const box = document.getElementById('trackingResultsContainer');
  box.innerHTML = '<p>Searching real-time relational logs...</p>';
  try {
    const res = await fetch(CORE_STORE_PROXY_ROUTE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track_order", query: input, siteToken: "LUMIERE_STORE_2026" }) });
    const json = await res.json();
    if(json.success && json.data.length > 0) {
      box.innerHTML = json.data.map(o => {
        var details = getTrackingDetails(o.courier, o.trackingNumber);
        var displayStatus = o.status;
        if (o.deliveryMethod === 'Pickup') {
          if (o.status === 'Shipped') displayStatus = 'Ready to Pick';
          else if (o.status === 'Delivered') displayStatus = 'Completed';
        }
        var trackingCardHtml = '';
        if (isPickup) {
          trackingCardHtml = `
            <div class="order-tracking-card" style="margin-top:0; margin-bottom:1.25rem;">
              <div>
                <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Pickup Location</div>
                <div style="font-size:0.9rem; color:var(--charcoal); font-weight:400; display:flex; align-items:center; gap:0.4rem;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Cozy Aura Studio, Gunj Golai, Latur
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Pickup Hours</div>
                <div style="font-size:0.9rem; color:var(--charcoal); font-weight:400; display:flex; align-items:center; gap:0.4rem; justify-content:flex-end;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Mon - Sat, 11 AM - 7 PM
                </div>
              </div>
            </div>`;
        } else if (details.tracking) {
          trackingCardHtml = `
            <div class="order-tracking-card" style="margin-top:0; margin-bottom:1.25rem;">
              <div>
                <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Courier Partner</div>
                <div style="font-size:0.9rem; color:var(--charcoal); font-weight:400; display:flex; align-items:center; gap:0.4rem;">${window.__svg.truck}${details.courier}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--stone); margin-bottom:0.25rem; font-weight:500;">Waybill / Tracking No.</div>
                <div style="display:flex; align-items:center; gap:0.5rem; justify-content:flex-end;">
                  ${o.trackingLink ? `
                    <a href="${o.trackingLink}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8rem; color:var(--gold-dark); text-decoration:none; font-weight:500; background:var(--cream); border:1px solid rgba(184,151,90,0.2); padding:0.3rem 0.6rem; border-radius:4px; transition:all 0.2s;">
                      ${window.__svg.external}Track
                    </a>
                  ` : ''}
                  <div class="tracking-copy-btn" onclick="window.copyToClipboard('${details.tracking}', event)">
                    <span class="tracking-text-span">${details.tracking}</span>
                    ${window.__svg.copy}
                  </div>
                </div>
              </div>
            </div>`;
        }

        return `
          <div style="background:var(--cream); padding:1.5rem; border:1px solid var(--sand); border-radius:8px; margin-bottom:1rem; box-shadow: 0 4px 12px rgba(42,36,32,0.015);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(196,181,160,0.2); padding-bottom:0.75rem;">
              <strong style="font-family:'Cormorant Garamond',serif; font-size:1.25rem;">Order: ${o.id}</strong>
              <span class="status-pill ${o.status.toLowerCase()}">${displayStatus}</span>
            </div>
            <div style="font-size:0.9rem; line-height:1.6; color:var(--charcoal);">
              ${trackingCardHtml}
              <div style="margin-bottom:0.4rem;"><strong style="font-weight:500;">Items:</strong> ${o.itemsString}</div>
              <div style="margin-bottom:0.8rem;"><strong style="font-weight:500;">Total:</strong> <span style="font-family:'Cormorant Garamond',serif; color:var(--gold-dark); font-weight:600; font-size:1.1rem;">${o.total}</span></div>
            </div>
          </div>`;
      }).join('');
    } else { box.innerHTML = '<p>No historical purchase matches found.</p>'; }
  } catch(err) { box.innerHTML = '<p>Tracking indexing communication timeout exception.</p>'; }
};

document.addEventListener('input', function(e) {
  if (e.target.id === 'pincode' || e.target.id === 'addr_pincode') {
    window.shippingInfo = window.shippingInfo || {};
    window.shippingInfo.pincode = e.target.value;
    window.calculatePrices();
  }
  if (e.target.id === 'phone' || e.target.id === 'addr_phone') {
    if (e.target._phoneBusy) return; e.target._phoneBusy = true;
    var digits = e.target.value.replace(/[^0-9]/g, '');
    if (digits.startsWith('91')) digits = digits.slice(2);
    e.target.value = digits.length > 0 ? '+91 ' + digits.slice(0, 10) : '';
    e.target._phoneBusy = false;
  }
  if ((e.target.id === 'pincode' || e.target.id === 'addr_pincode') && e.target.value.length === 6) {
    var isAddr = e.target.id === 'addr_pincode';
    var cityField = document.getElementById(isAddr ? 'addr_city' : 'city');
    var stateField = document.getElementById(isAddr ? 'addr_state' : 'state');
    fetch('https://api.postalpincode.in/pincode/' + e.target.value)
      .then(r => r.json())
      .then(data => {
        if (data[0]?.Status === 'Success') {
          var post = data[0].PostOffice[0];
          if (cityField) cityField.value = post.District || post.Name || '';
          if (stateField) {
            var rawState = post.State || '';
            var lowerState = rawState.toLowerCase().trim();
            if (lowerState.includes('daman') || lowerState.includes('dadra')) {
              lowerState = 'dadra and nagar haveli';
            } else if (lowerState.includes('jammu')) {
              lowerState = 'jammu and kashmir';
            } else if (lowerState.includes('andaman')) {
              lowerState = 'andaman and nicobar islands';
            }
            stateField.value = lowerState;
            stateField.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }).catch(function(){});
  }
});

document.addEventListener('change', function(e) {
  if (e.target.id === 'state' || e.target.id === 'addr_state') {
    window.shippingInfo = window.shippingInfo || {};
    window.shippingInfo.state = e.target.value;
    window.calculatePrices();
  }
});

window.closeSuccessOverlay = function() {
  if (window._celebrationTimeout) {
    clearTimeout(window._celebrationTimeout);
    window._celebrationTimeout = null;
  }
  document.getElementById('celebrationModal').classList.remove('active');
  window._confettiActive = false;
  var canvas = document.getElementById('celebrationCanvas');
  if (canvas) { canvas.style.display = 'none'; }
  window.showPage('ordersPage');
};

window.triggerCelebration = function() {
  var canvas = document.getElementById('celebrationCanvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  var ctx = canvas.getContext('2d');
  
  if (window._celebrationTimeout) clearTimeout(window._celebrationTimeout);
  window._celebrationTimeout = setTimeout(() => {
    window.closeSuccessOverlay();
  }, 5000);
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  var colors = [
    '#B8975A', // Classic Gold
    '#D4AF37', // Bright Gold
    '#F5E6C8', // Warm Cream
    '#EADCC8', // Soft Sand
    '#C4B5A0', // Taupe Accent
    '#FFFDF9', // Luxury White
    '#AA7C11', // Deep Bronze
    '#E6CA97'  // Champagne Gold
  ];
  
  var particles = [];
  window._confettiActive = true;
  var frameCount = 0;

  function createParticle(x, y, angle, speed, isGlitter) {
    var size = isGlitter ? (Math.random() * 3 + 2) : (Math.random() * 8 + 5);
    return {
      x: x,
      y: y,
      size: size,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      opacity: 1,
      shape: isGlitter ? 'star' : (Math.random() > 0.4 ? 'rect' : 'circle'),
      gravity: isGlitter ? (0.04 + Math.random() * 0.04) : (0.12 + Math.random() * 0.08),
      drag: isGlitter ? 0.98 : 0.96,
      wobble: Math.random() * 100,
      wobbleSpeed: 0.02 + Math.random() * 0.03
    };
  }

  // Left Cannon
  for (var i = 0; i < 90; i++) {
    var angle = -Math.PI / 4 - (Math.random() * Math.PI / 6);
    var speed = Math.random() * 15 + 10;
    particles.push(createParticle(0, canvas.height, angle, speed, false));
  }

  // Right Cannon
  for (var j = 0; j < 90; j++) {
    var angle = -3 * Math.PI / 4 + (Math.random() * Math.PI / 6);
    var speed = Math.random() * 15 + 10;
    particles.push(createParticle(canvas.width, canvas.height, angle, speed, false));
  }

  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    var rot = Math.PI / 2 * 3;
    var x = cx;
    var y = cy;
    var step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (var i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function frame() {
    if (!window._confettiActive) {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener('resize', resizeCanvas);
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    // Rain from top
    if (frameCount < 300 && frameCount % 3 === 0) {
      var spawnCount = Math.random() > 0.5 ? 2 : 1;
      for (var k = 0; k < spawnCount; k++) {
        var rx = Math.random() * canvas.width;
        var ra = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        var rs = Math.random() * 2 + 1;
        particles.push(createParticle(rx, -10, ra, rs, Math.random() > 0.4));
      }
    }

    var alive = false;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      
      p.speedX *= p.drag;
      p.speedY *= p.drag;
      p.speedY += p.gravity;
      
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      p.wobble += p.wobbleSpeed;

      if (p.y > 0 && p.gravity < 0.1) {
        p.x += Math.sin(p.wobble) * 0.5;
      }

      if (p.y > canvas.height) {
        p.opacity -= 0.05;
      } else if (frameCount > 250) {
        p.opacity -= 0.005;
      }

      if (p.opacity <= 0) continue;
      alive = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      
      if (p.shape === 'star') {
        drawStar(ctx, 0, 0, 5, p.size, p.size / 2, p.color);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }

    if (alive || frameCount < 300) {
      requestAnimationFrame(frame);
    } else {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener('resize', resizeCanvas);
    }
  }

  frame();
};

window.addEventListener('pageshow', (event) => {
  window.hideLoadingOverlay();
  // Also hide global boot loader if active
  const bootLoader = document.getElementById('globalBootLoader');
  if (bootLoader) bootLoader.classList.remove('active');
});

window.addEventListener('DOMContentLoaded', async () => {
  // Show global boot loader by default immediately on DOMContentLoaded
  const bootLoader = document.getElementById('globalBootLoader');
  if (bootLoader) bootLoader.classList.add('active');

  // Increment site views (once per session)
  if (!sessionStorage.getItem('lumiere_site_viewed')) {
    sessionStorage.setItem('lumiere_site_viewed', 'true');
    try {
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment_views', siteToken: 'LUMIERE_STORE_2026' })
      });
    } catch (e) {
      console.error("Failed to increment views:", e);
    }
  }

  const params = new URLSearchParams(window.location.search);
  const authError = params.get('auth_error');
  if (authError) {
    window.showToast('Sign in error: ' + decodeURIComponent(authError), true);
    window.history.replaceState({}, '', '/');
  }

  // Clear query params in history for cleaner URL
  if (params.get('user_email')) {
    window.history.replaceState({}, '', '/');
  }

  // Initialize cart
  const savedCart = localStorage.getItem('lumiere_cart');
  window.cart = [];
  if (savedCart) {
    try {
      window.cart = JSON.parse(savedCart);
      if (!Array.isArray(window.cart)) window.cart = [];
    } catch (e) {
      console.error("Failed to parse cart:", e);
      localStorage.removeItem('lumiere_cart');
    }
  }
  window.updateCart();

  // 1. Determine target page synchronously on boot
  const initialLoginRedirect = localStorage.getItem('lumiere_login_redirect');
  const savedPage = localStorage.getItem('lumiere_active_page');
  const urlPage = params.get('page');

  let targetPage = 'home';
  if (initialLoginRedirect) {
    targetPage = initialLoginRedirect;
  } else if (urlPage && pages.includes(urlPage)) {
    targetPage = urlPage;
  } else if (savedPage && pages.includes(savedPage)) {
    targetPage = savedPage;
  }

  const protectedPagesOnBoot = ['ordersPage', 'addressesPage', 'wishlistPage', 'payment'];
  const isProtected = protectedPagesOnBoot.includes(targetPage);

  // 2. If target page is public, show page and hide boot loader immediately (non-blocking)
  if (!isProtected) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', targetPage);
    window.history.replaceState({ pageId: targetPage }, '', url.pathname + url.search);
    window.showPage(targetPage, false);
    
    // Initialize catalog dataset synchronously if available
    if (window.__INITIAL_CATALOG__) {
      window.PROMOS = (window.__INITIAL_CATALOG__.coupons || []).map(c => ({
        code: c.code, type: c.type, discount: c.discount, min_order_value: parseFloat(c.min_order_value) || 0, is_public: c.is_public !== false
      }));
      window.PRODUCTS = window.__INITIAL_CATALOG__.inventory.map(item => {
        let vars = Object.entries(item.fragranceStocks || {}).map(([fName, qty]) => ({
          id: fName, name: fName, price: item.price, inStock: qty > 0, maxStock: qty,
          image: item.fragranceImages?.[fName] ? `<img src="${item.fragranceImages[fName]}" alt="${item.name}" width="300" height="300" style="width:100%;height:100%;object-fit:cover;">` : ''
        }));
        return { ...item, variants: vars };
      });
      delete window.__INITIAL_CATALOG__;
    }

    // Hide loader immediately
    const bootLoaderEl = document.getElementById('globalBootLoader');
    if (bootLoaderEl) {
      bootLoaderEl.classList.remove('active');
      setTimeout(() => bootLoaderEl.remove(), 300);
    }
  }

  // 3. Define Supabase initialization helper
  let _supabaseAuthInitialized = false;
  window.initializeSupabaseAuth = async function() {
    if (_supabaseAuthInitialized) return;
    _supabaseAuthInitialized = true;

    const supabase = await getSupabase();
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    _currentAccessToken = initialSession?.access_token || null;
    let isInitialAuthCheck = true;

    supabase.auth.onAuthStateChange(async (event, session) => {
      _currentAccessToken = session?.access_token || null;
      const user = session?.user || null;
      authStore.setCurrentUser(user);
      window.renderAccountAvatar();

      if (user) {
        window.syncUserProfile(user.email, () => {
          const activePage = localStorage.getItem('lumiere_active_page');
          if (activePage === 'payment') {
            window.prefillCheckoutForm();
          } else if (activePage === 'addressesPage') {
            window.displayAddressesPageList();
          } else if (activePage === 'contact') {
            window.prefillContactForm();
          }
          window.checkAndAutoSendContactForm();
        });
        window.fetchMyOrders();
      } else {
        window.clearUserProfileState();
        const activePage = localStorage.getItem('lumiere_active_page');
        if (protectedPagesOnBoot.includes(activePage)) {
          window.showPage('home');
        }
      }

      // Handle initial app boot routing for protected pages once session is resolved
      if (isInitialAuthCheck) {
        isInitialAuthCheck = false;
        
        if (initialLoginRedirect) {
          localStorage.removeItem('lumiere_login_redirect');
        }

        // If it was a protected page, check authorization and route accordingly
        if (isProtected) {
          if (!user) {
            localStorage.setItem('lumiere_login_redirect', targetPage);
            window.showLogin();
            targetPage = 'home';
          } else if (targetPage === 'payment') {
            targetPage = 'cartPage'; // Redirect to cart if payment page visited directly
          }

          const url = new URL(window.location.href);
          url.searchParams.set('page', targetPage);
          window.history.replaceState({ pageId: targetPage }, '', url.pathname + url.search);
          window.showPage(targetPage, false);

          await syncCatalogDataset();

          const bootLoaderEl = document.getElementById('globalBootLoader');
          if (bootLoaderEl) {
            bootLoaderEl.classList.remove('active');
            setTimeout(() => bootLoaderEl.remove(), 300);
          }
        } else {
          await syncCatalogDataset();
        }
      }
    });
  };

  // 4. Run initialization conditionally on boot
  const hasTokenInHash = window.location.hash.includes('access_token=') || window.location.hash.includes('id_token=') || window.location.hash.includes('error=');
  const hasTokenInStorage = !!getAuthTokenFromStorage();

  if (hasTokenInHash || hasTokenInStorage || isProtected) {
    window.initializeSupabaseAuth();
  } else {
    // Guest user on a public page: resolve catalog sync immediately
    syncCatalogDataset();
  }
});

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.pageId) {
    window.showPage(e.state.pageId, false);
  } else {
    const params = new URLSearchParams(window.location.search);
    const urlPage = params.get('page');
    if (urlPage && pages.includes(urlPage)) {
      window.showPage(urlPage, false);
    } else {
      window.showPage('home', false);
    }
  }
});

// Auto-sync storefront when tab gains focus or inventory is updated
window.addEventListener('focus', () => {
  if (typeof syncCatalogDataset === 'function') {
    syncCatalogDataset();
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'lumiere_admin_inventory') {
    if (typeof syncCatalogDataset === 'function') {
      syncCatalogDataset();
    }
  }
});

function cloudinaryOpt(url) {
  return url;
}

window.applyStorefrontImages = function() {
  const sf = window.STOREFRONT_IMAGES || {};
  
  // 1. Hero image
  const heroImg = document.getElementById('storefrontHeroImg');
  if (heroImg) {
    let targetSrc = sf.home_hero || "";
    if (targetSrc) {
      if (heroImg.getAttribute('src') !== targetSrc) {
        heroImg.style.opacity = '0';
        heroImg.setAttribute('src', targetSrc);
        heroImg.removeAttribute('srcset');
        heroImg.removeAttribute('sizes');
        heroImg.onload = () => { heroImg.style.opacity = '1'; };
        if (heroImg.complete) heroImg.style.opacity = '1';
      } else {
        heroImg.style.opacity = '1';
      }
    } else {
      heroImg.style.opacity = '0';
    }
  }
  
  // 2. Instagram feed images
  for (let i = 1; i <= 12; i++) {
    const el = document.getElementById(`ig-post-${i}`);
    if (el) {
      const imgUrl = sf[`ig_${i}`];
      if (imgUrl) {
        el.style.backgroundImage = `url(${imgUrl})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        const svg = el.querySelector('svg');
        if (svg) svg.style.display = 'none';
      } else {
        const defaultGradients = [
          'linear-gradient(135deg,#EDE5D8,#D4C4B0)',
          'linear-gradient(135deg,#E8DDD0,#C4B5A0)',
          'linear-gradient(135deg,#F5EDE0,#E0D4C3)',
          'linear-gradient(135deg,#EDE5D8,#C4B5A0)',
          'linear-gradient(135deg,#F7F0E6,#D4C4B0)',
          'linear-gradient(135deg,#E8DDD0,#EDE0D0)'
        ];
        el.style.backgroundImage = defaultGradients[(i - 1) % defaultGradients.length];
        const svg = el.querySelector('svg');
        if (svg) svg.style.display = 'block';
      }
    }
  }
  
  // 3. About page: process visual
  const aboutProcessVisual = document.getElementById('aboutProcessVisual');
  if (aboutProcessVisual) {
    const aboutImg = sf.about_process;
    if (aboutImg) {
      aboutProcessVisual.innerHTML = `<img src="${aboutImg}" alt="Our Process Illustration" style="width: 220px; height: 280px; object-fit: cover; border-radius: 2px; border: 1px solid var(--sand);">`;
    } else {
      aboutProcessVisual.innerHTML = `
        <svg viewBox="0 0 280 360" fill="none" xmlns="http://www.w3.org/2000/svg" width="220">
          <rect width="280" height="360" fill="#FFFBF0" rx="2"/>
          <rect x="70" y="140" width="140" height="170" rx="8" fill="#EDE5D8" stroke="#C4B5A0" stroke-width="1"/>
          <rect x="63" y="130" width="154" height="16" rx="4" fill="#E0D4C3" stroke="#C4B5A0" stroke-width="1"/>
          <line x1="140" y1="148" x2="140" y2="118" stroke="#8C7D6E" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M140 118 C132 106 130 92 140 82 C150 92 148 106 140 118Z" fill="#D4B07A" opacity="0.75"/>
          <path d="M140 115 C136 106 135 98 140 91 C145 98 144 106 140 115Z" fill="#F9EDD0"/>
          <text x="140" y="210" text-anchor="middle" font-family="'Cormorant Garamond', serif" font-size="10" fill="#2A2420" letter-spacing="2">HAND POURED</text>
          <text x="140" y="228" text-anchor="middle" font-family="'Jost', sans-serif" font-size="7" fill="#8C7D6E" letter-spacing="1.5">SOYA WAX</text>
        </svg>
      `;
    }
  }
  
  // 4. Contact page: top banner inside details box
  const contactDetailsBox = document.getElementById('contactDetailsBox');
  if (contactDetailsBox) {
    const bannerImg = sf.contact_banner;
    const existingBanner = document.getElementById('contactDetailsBannerImg');
    if (bannerImg) {
      if (existingBanner) {
        existingBanner.src = bannerImg;
        existingBanner.style.display = 'block';
      } else {
        const img = document.createElement('img');
        img.id = 'contactDetailsBannerImg';
        img.src = bannerImg;
        img.style.cssText = "width: 100%; height: 120px; object-fit: cover; border-radius: 2px; border: 1px solid var(--sand); margin-bottom: 1.5rem;";
        contactDetailsBox.insertBefore(img, contactDetailsBox.firstChild);
      }
    } else {
      if (existingBanner) {
        existingBanner.remove();
      }
    }
  }
};

// --- WISHLIST FUNCTIONALITIES ---
window.wishlistCache = [];

window.isProductWishlisted = function(productId, variantName) {
  if (!productId || !variantName) return false;
  const lowerVar = variantName.toLowerCase().trim();
  return window.wishlistCache.some(item => 
    String(item.product_id) === String(productId) && 
    String(item.variant_name).toLowerCase().trim() === lowerVar
  );
};

window.toggleWishlistFromModal = async function() {
  await window.initializeSupabaseAuth();
  const email = window.getLoggedInEmail();
  if (!email) {
    window.showConfirmModal({
      category: 'Authentication',
      title: 'Login Required',
      text: 'You need to login with Google to add items to your wishlist.',
      confirmText: 'Login with Google',
      onConfirm: () => {
        localStorage.setItem('lumiere_login_redirect', 'wishlistPage');
        window.showLogin();
      }
    });
    return;
  }

  if (!window.currentProduct || !window.selectedVariant) {
    window.showToast("Select a variant", true);
    return;
  }

  const productId = window.currentProduct.id;
  const variantName = window.selectedVariant.name;
  const isWishlisted = window.isProductWishlisted(productId, variantName);

  const action = isWishlisted ? 'remove_from_wishlist' : 'add_to_wishlist';
  
  // Optimistically update UI cache
  if (isWishlisted) {
    window.wishlistCache = window.wishlistCache.filter(item => 
      !(String(item.product_id) === String(productId) && 
        String(item.variant_name).toLowerCase().trim() === variantName.toLowerCase().trim())
    );
  } else {
    window.wishlistCache.push({ product_id: productId, variant_name: variantName });
  }

  // Update modal action buttons
  const actionContainer = document.getElementById('modalActionContainer');
  if (actionContainer) {
    const activeClass = !isWishlisted ? 'active' : '';
    const fillVal = !isWishlisted ? 'currentColor' : 'none';
    const wishlistButtonHtml = `
      <button class="btn-wishlist ${activeClass}" onclick="window.toggleWishlistFromModal()" title="${!isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${fillVal}" stroke="currentColor" stroke-width="2" class="heart-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
    `;
    if (!window.selectedVariant.inStock) {
      actionContainer.innerHTML = `${wishlistButtonHtml}<button class="btn-primary" id="addToCartBtn" onclick="window.notifyMe()" style="background:var(--stone); cursor:pointer;">Notify me</button>`;
    } else {
      actionContainer.innerHTML = `${wishlistButtonHtml}<button class="btn-primary" id="addToCartBtn" onclick="window.addProductToCartFromModal()">Add to Cart</button>`;
    }
  }

  try {
    const res = await fetch(CORE_STORE_PROXY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        siteToken: 'LUMIERE_STORE_2026',
        email,
        product_id: productId,
        variant_name: variantName
      })
    });
    const json = await res.json();
    if (!json.success) {
      console.error("Wishlist operation failed on server:", json.error);
      window.showToast("Failed to sync wishlist changes.", true);
      await window.fetchWishlist();
    } else {
      window.showToast(isWishlisted ? "Removed from wishlist." : "Added to wishlist.");
    }
  } catch (err) {
    console.error("Wishlist network error:", err);
    window.showToast("Network error syncing wishlist.", true);
    await window.fetchWishlist();
  }
};

window.fetchWishlist = async function() {
  await window.initializeSupabaseAuth();
  const email = window.getLoggedInEmail();
  if (!email) {
    window.wishlistCache = [];
    return;
  }
  try {
    const res = await fetch(CORE_STORE_PROXY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_wishlist',
        siteToken: 'LUMIERE_STORE_2026',
        email
      })
    });
    const json = await res.json();
    if (json.success && json.data) {
      window.wishlistCache = json.data;
    }
  } catch (e) {
    console.error("Failed to fetch wishlist:", e);
  }
};

window.renderWishlist = async function() {
  const container = document.getElementById('myWishlistContainer');
  if (!container) return;

  container.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 4rem 0; grid-column: 1 / -1;">Loading your wishlist...</p>';
  
  await window.fetchWishlist();

  if (window.wishlistCache.length === 0) {
    container.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 4rem 0; grid-column: 1 / -1;">Your wishlist is empty.</p>';
    return;
  }

  let html = '';
  window.wishlistCache.forEach(item => {
    const prod = window.PRODUCTS.find(p => String(p.id) === String(item.product_id));
    if (!prod) return;

    const variantNameLower = String(item.variant_name).toLowerCase().trim();
    const variant = prod.variants.find(v => String(v.name).toLowerCase().trim() === variantNameLower);

    const price = variant ? variant.price : prod.price;
    const inStock = variant ? variant.inStock : prod.inStock;
    const variantLabel = variant ? variant.name : item.variant_name;

    let imgUrl = prod.rawImage || '';
    if (variant && variant.rawImage) {
      imgUrl = variant.rawImage;
    } else if (prod.variants && prod.variants[0]?.rawImage) {
      imgUrl = prod.variants[0].rawImage;
    }
    
    let imgHtml = '';
    if (imgUrl) {
      imgHtml = `<img src="${cloudinaryOpt(imgUrl, 600, true)}" srcset="${cloudinaryOpt(imgUrl, 600, true)} 600w, ${cloudinaryOpt(imgUrl, 800, true)} 800w, ${cloudinaryOpt(imgUrl, 1200, true)} 1200w" sizes="(max-width: 480px) 600px, (max-width: 1024px) 800px, 1200px" alt="${prod.name}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
      imgHtml = `<div class="cream-fallback" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--warm-white)" stroke-width="1.5"><circle cx="12" cy="14" r="3" fill="var(--warm-white)" opacity="0.3"/></svg></div>`;
    }

    html += `
      <div class="wishlist-card" data-product-id="${prod.id}" data-variant="${variantLabel}">
        <div class="wishlist-card-img" onclick="window.openProductModal('${prod.id}')">
          ${imgHtml}
          <button class="wishlist-remove-btn" onclick="event.stopPropagation(); window.removeFromWishlist('${prod.id}', '${variantLabel}')" title="Remove from Wishlist">
            &times;
          </button>
        </div>
        <div class="wishlist-card-info" onclick="window.openProductModal('${prod.id}')">
          <h3>${prod.name}</h3>
          <div class="wishlist-card-variant">Scent: ${variantLabel}</div>
          <div class="wishlist-card-price">₹${price}</div>
        </div>
        <div class="wishlist-card-actions">
          <button class="btn-primary" onclick="window.addWishlistItemToCart('${prod.id}', '${variantLabel}')" ${!inStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            ${inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    `;
  });

  if (!html) {
    container.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 4rem 0; grid-column: 1 / -1;">Your wishlist is empty.</p>';
  } else {
    container.innerHTML = html;
  }
};

window.removeFromWishlist = async function(productId, variantName) {
  const email = window.getLoggedInEmail();
  if (!email) return;

  try {
    const res = await fetch(CORE_STORE_PROXY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove_from_wishlist',
        siteToken: 'LUMIERE_STORE_2026',
        email,
        product_id: productId,
        variant_name: variantName
      })
    });
    const json = await res.json();
    if (json.success) {
      window.showToast("Removed from wishlist.");
      await window.renderWishlist();
    } else {
      window.showToast("Failed to remove item.", true);
    }
  } catch (err) {
    console.error("Remove from wishlist failed:", err);
  }
};

window.addWishlistItemToCart = function(productId, variantName) {
  const prod = window.PRODUCTS.find(p => String(p.id) === String(productId));
  if (!prod) return;

  const variant = prod.variants.find(v => String(v.name).toLowerCase().trim() === String(variantName).toLowerCase().trim());
  if (!variant || !variant.inStock) {
    window.showToast("Item is out of stock.", true);
    return;
  }

  // Check if already in cart
  const existing = window.cart.find(item => 
    String(item.product.id) === String(productId) && 
    String(item.variant.id) === String(variant.id)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    window.cart.push({
      product: prod,
      variant: variant,
      quantity: 1
    });
  }

  localStorage.setItem('lumiere_cart', JSON.stringify(window.cart));
  window.updateCart();
  window.showToast("Added to cart!");
};

window.handleBottomNavClick = function(pageId, element) {
  window.showPage(pageId);
};

window.toggleShopFilters = function(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('shopFiltersPanel');
  const btn = event.currentTarget;
  if (panel) {
    panel.classList.toggle('active');
    btn.classList.toggle('active');
  }
};

window.selectFeedbackStars = function(orderId, rating) {
  window.activeFeedbackRatings = window.activeFeedbackRatings || {};
  window.activeFeedbackRatings[orderId] = rating;
  
  const card = document.getElementById('feedbackCard_' + orderId);
  if (card) {
    const stars = card.querySelectorAll('.star-rating-item');
    stars.forEach(function(star) {
      const val = parseInt(star.getAttribute('data-val'));
      if (val <= rating) {
        star.style.color = 'var(--gold-dark)';
      } else {
        star.style.color = 'var(--taupe)';
      }
    });
  }
  
  const form = document.getElementById('feedbackFormContent_' + orderId);
  if (form) {
    form.style.display = 'flex';
  }
};

window.submitFeedbackToDatabase = async function(orderId) {
  window.activeFeedbackRatings = window.activeFeedbackRatings || {};
  const rating = window.activeFeedbackRatings[orderId];
  if (!rating) {
    window.showToast("Please select a star rating first.", true);
    return;
  }
  
  const commentField = document.getElementById('feedbackComment_' + orderId);
  const comment = commentField ? commentField.value.trim() : '';
  
  // Validate character count (max 200 characters)
  if (comment.length > 200) {
    window.showToast("Feedback comment must not exceed 200 characters.", true);
    return;
  }
  
  window.showLoadingOverlay("Submitting feedback...");
  try {
    const res = await fetch(CORE_STORE_PROXY_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: 'submit_feedback',
        orderId: orderId,
        rating: rating,
        comment: comment,
        siteToken: "LUMIERE_STORE_2026"
      })
    });
    const json = await res.json();
    if (json.success) {
      localStorage.setItem('lumiere_order_feedback_' + orderId, rating);
      if (comment) {
        localStorage.setItem('lumiere_order_feedback_comment_' + orderId, comment);
      }
      window.showToast("Thank you for your feedback!");
      window.hideLoadingOverlay();
      window.showOrderDetail(orderId);
    } else {
      window.showToast(json.error || "Failed to submit feedback.", true);
      window.hideLoadingOverlay();
    }
  } catch (err) {
    console.error(err);
    window.showToast("Network error. Please try again.", true);
    window.hideLoadingOverlay();
  }
};

(function() {
  var q = window._pageQueue;
  if (q) {
    delete window._pageQueue;
    q.forEach(function(args) { window.showPage(args[0], args[1]); });
  }
})();

// Monitor Internet Connection Status
window.addEventListener('online', () => {
  const offlineOverlay = document.getElementById('offlineOverlay');
  if (offlineOverlay) {
    offlineOverlay.classList.remove('active');
  }
  window.showToast("Connection restored. You are back online!", false);
  if (typeof syncCatalogDataset === 'function') {
    syncCatalogDataset();
  }
});

window.addEventListener('offline', () => {
  const offlineOverlay = document.getElementById('offlineOverlay');
  if (offlineOverlay) {
    offlineOverlay.classList.add('active');
  }
});

// Run initial check on load
window.addEventListener('DOMContentLoaded', () => {
  const offlineOverlay = document.getElementById('offlineOverlay');
  if (offlineOverlay && !navigator.onLine) {
    offlineOverlay.classList.add('active');
  }
});


// Retry connection check manually
window.retryConnection = async function() {
  const btn = document.getElementById('retryConnBtn');
  if (btn) {
    btn.textContent = 'Checking...';
    btn.disabled = true;
  }
  try {
    const testRes = await originalFetch('/');
    if (testRes.status >= 200 && testRes.status < 400) {
      const offlineOverlay = document.getElementById('offlineOverlay');
      if (offlineOverlay) {
        offlineOverlay.classList.remove('active');
        window.showToast("Connection restored. You are back online!", false);
      }
      if (typeof syncCatalogDataset === 'function') {
        syncCatalogDataset();
      }
    } else {
      throw new Error();
    }
  } catch (e) {
    window.showToast("Connection test failed. Still offline.", true);
  } finally {
    if (btn) {
      btn.textContent = 'Retry Connection';
      btn.disabled = false;
    }
  }
};
