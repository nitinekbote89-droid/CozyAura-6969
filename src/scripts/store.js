const CORE_STORE_PROXY_ROUTE = "/api/store";

window.STORE_PICKUP_ADDRESS = "Lumière Studio, Koregaon Park, Pune, Maharashtra - 411001";
window.deliveryMethod = "Shipping";

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
let pages = ['home', 'shop', 'cartPage', 'payment', 'trackPage', 'about', 'contact', 'ordersPage', 'addressesPage'];
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
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.left = '2rem';
    toast.style.zIndex = '10000';
    toast.style.background = 'var(--charcoal)';
    toast.style.color = 'var(--cream)';
    toast.style.padding = '1rem 1.5rem';
    toast.style.fontSize = '0.78rem';
    toast.style.fontFamily = "'Jost', sans-serif";
    toast.style.letterSpacing = '0.05em';
    toast.style.borderRadius = '2px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.pointerEvents = 'none';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.6rem';
    document.body.appendChild(toast);
  }
  const icon = isError 
    ? window.__svg.error 
    : window.__svg.check_circle;
  toast.innerHTML = `${icon} <span>${message}</span>`;
  toast.style.borderLeft = isError ? '3px solid var(--danger)' : '3px solid var(--gold)';
  if (window._toastTimeout) clearTimeout(window._toastTimeout);
  toast.offsetHeight; // Force reflow
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  window._toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
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
            window.PROMOS = (json.data.coupons || []).map(c => ({ code: c.code, type: c.type, discount: c.discount }));
            if (window.appliedPromoCode && !window.PROMOS.find(p => p.code === window.appliedPromoCode.code)) {
              window.appliedPromoCode = null;
              sessionStorage.removeItem('lumiere_applied_promo');
            }
            window.PRODUCTS = json.data.inventory.map(item => {
               let vars = Object.entries(item.fragranceStocks || {}).map(([fName, qty]) => ({
                  id: fName, name: fName, price: item.price, inStock: qty > 0, maxStock: qty,
image: item.fragranceImages?.[fName] ? `<img 
 src="${item.fragranceImages[fName]}"  alt="${fName}" width="400" height="500" style="width:100%;height:100%;object-fit:cover;">` : null,
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
                   image: item.coverImage ? `<img 
 src="${item.coverImage}"  alt="${item.name}" width="300" height="400" 
 style="width:100%;height:100%;object-fit:cover;">` : `<div class="cream-fallback">${window.__svg.fire}</div>`,
                  description: item.description, specs: Array.isArray(item.specifications) ? item.specifications.join('\n') : item.specifications,
                  inStock: item.stock > 0, variants: vars,
                  totalSales: item.totalSales || 0,
                  salesRank: item.salesRank || null
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
      
      // Render visual warning banner on screen for diagnostics
      const div = document.createElement('div');
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
      div.innerHTML = `<strong>Database Sync Error:</strong> ${e.message || e}`;
      document.body.appendChild(div);

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
  home:         { title: 'Lumière — Hand-Poured Soya Candles',                 desc: 'Hand-poured 100% natural soya candles crafted in small batches with botanically sourced fragrances. Clean, conscious, timeless — from our studio in India.' },
  shop:         { title: 'Shop All Candles — Lumière',                         desc: 'Browse our collection of hand-poured soya candles. Available in a variety of exquisite fragrances. 100% natural soy wax, lead-free cotton wicks.' },
  cartPage:     { title: 'Your Cart — Lumière',                                desc: 'Review your hand-poured soya candle selections before checkout.' },
  payment:      { title: 'Checkout — Lumière',                                 desc: 'Complete your purchase of hand-poured soya candles. Secure payment via Razorpay.' },
  ordersPage:   { title: 'My Orders — Lumière',                                desc: 'Track and manage your Lumière candle orders.' },
  addressesPage:{ title: 'My Addresses — Lumière',                             desc: 'Manage your shipping addresses for Lumière orders.' },
  about:        { title: 'About Us — Lumière',                                 desc: 'Lumière crafts hand-poured soya candles from our studio in India. 100% natural soy wax, ethically sourced fragrances, sustainable practices.' },
  contact:      { title: 'Contact Us — Lumière',                               desc: 'Get in touch with Lumière. We love hearing from our candle community.' },
  trackPage:    { title: 'Track Order — Lumière',                              desc: 'Track your Lumière candle order by your order ID.' },
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
  const protectedPages = ['ordersPage', 'addressesPage'];
  if (protectedPages.includes(pageId) && !localStorage.getItem('lumiere_user_email')) {
    localStorage.setItem('lumiere_login_redirect', pageId);
    window.showLogin();
    return;
  }

  // Payment page requires login — if not logged in, send to cart instead
  if (pageId === 'payment' && !localStorage.getItem('lumiere_user_email')) {
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
  if (pageId === 'shop') { window.renderCategoryFilters(); window.triggerSearch(); }
  if (pageId === 'payment') { window.prefillCheckoutForm(); }
  if (pageId === 'contact') { window.prefillContactForm(); }

  window.updatePageMeta(pageId);

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageId);
    window.history.pushState({ pageId: pageId }, '', url.pathname + url.search);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

(function() {
  var q = window._pageQueue;
  if (q) {
    delete window._pageQueue;
    q.forEach(function(args) { window.showPage(args[0], args[1]); });
  }
})();

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
};

window.selectCategory = function(cat) { 
  cat = decodeURIComponent(cat); 
  window.activeCategory = cat; 
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

  // Handle sorting
  const sortBy = document.getElementById('shopSortSelect')?.value || 'default';
  if (sortBy === 'name-asc') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'name-desc') {
    list.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortBy === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  }

  window.renderProducts(list);
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

  grid.innerHTML = fragrances.map((f, i) =>
    `<div class="scent-card" onclick="window.selectCategory('${encodeURIComponent(f)}')">
      <div class="scent-card-bg" style="background:linear-gradient(135deg,${colors[i % colors.length]});">
        ${getScentIcon(f)}
      </div>
      <h3>${f.charAt(0).toUpperCase() + f.slice(1)}</h3>
      <p>Explore our ${f} scented candles — hand-poured with natural soya wax.</p>
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
  document.getElementById('modalActionContainer').innerHTML = `<button class="btn-primary" disabled style="opacity:0.5;cursor:not-allowed;" id="addToCartBtn" onclick="window.addProductToCartFromModal()">Add to Cart</button>`;
  document.getElementById('productModalOverlay').classList.add('active');
};

window.changeVariant = function(varId) {
  window.selectedVariant = window.currentProduct.variants.find(v => v.id === varId);
  document.getElementById('modalPrice').textContent = `₹${window.selectedVariant.price}`;
  document.getElementById('modalImgWrap').innerHTML = window.selectedVariant.image || window.currentProduct.image;
  
  const actionContainer = document.getElementById('modalActionContainer');
  if (actionContainer) {
    if (!window.selectedVariant.inStock) {
      actionContainer.innerHTML = `<button class="btn-primary" id="addToCartBtn" onclick="window.notifyMe()" style="background:var(--stone); cursor:pointer;">Notify me</button>`;
    } else {
      actionContainer.innerHTML = `<button class="btn-primary" id="addToCartBtn" onclick="window.addProductToCartFromModal()">Add to Cart</button>`;
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
  const loggedInEmail = localStorage.getItem('lumiere_user_email');

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
  if (window.PROMOS.length > 0) {
    html += window.PROMOS.map(p =>
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

function renderAccountAvatar() {
  const btn = document.getElementById('navAccountBtn');
  if (!btn) return;
  const avatar = localStorage.getItem('lumiere_user_avatar');
  if (avatar) {
    btn.innerHTML = '<img src="' + avatar + '" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="window.fallbackAvatar(this)">';
  } else {
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }
  const header = document.getElementById('dropdownUserInfo');
  if (header) {
    const name = localStorage.getItem('lumiere_user_name');
    const email = localStorage.getItem('lumiere_user_email');
    if (email) {
      header.innerHTML = `<div style="font-weight:500;color:var(--charcoal);">${name || 'User'}</div><div style="font-size:0.68rem;color:var(--stone);margin-top:0.25rem;text-transform:none;letter-spacing:normal;font-weight:300;">${email}</div>`;
    } else {
      header.textContent = 'Guest';
    }
  }
  const logout = document.getElementById('dropdownLogout');
  if (logout) {
    logout.textContent = localStorage.getItem('lumiere_user_email') ? 'Log Out' : 'Sign In';
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
  if (localStorage.getItem('lumiere_user_email')) {
    window.confirmLogout();
  } else {
    window.showLogin();
  }
};

window.closeAccountMenu = function() {
  const dd = document.getElementById('accountDropdown');
  if (dd) dd.classList.remove('show');
};

window.toggleAccountMenu = function() {
  if (!localStorage.getItem('lumiere_user_email')) {
    window.showLogin();
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
  window.calculatePrices();
  if (document.getElementById('cartPage')?.classList.contains('active') || document.getElementById('cartPage')?.style.display !== 'none') {
    window.renderCart();
  }
  if (document.getElementById('payment')?.classList.contains('active') || document.getElementById('payment')?.style.display !== 'none') {
    window.renderCheckoutSidebarItems();
    window.renderCheckoutAppliedPromo();
  }
};

window.calculatePrices = function() {
  const subtotal = window.cart.reduce((sum, item) => sum + ((item.variant?.price || item.product?.price || 0) * item.quantity), 0);
  let discount = window.appliedPromoCode ? (window.appliedPromoCode.type === 'percent' ? Math.round(subtotal * (window.appliedPromoCode.discount / 100)) : window.appliedPromoCode.discount) : 0;
  
  // Conditionally add shipping fee based on step or selected address
  const guestState = document.getElementById('state')?.value || '';
  const guestPincode = document.getElementById('pincode')?.value || '';
  const hasAddress = window.checkoutStep === 'payment' || !!window.selectedAddressId || !!guestState || !!guestPincode;
  const shipState = window.shippingInfo?.state || guestState || '';
  const shipPincode = window.shippingInfo?.pincode || guestPincode || '';
  const shipping = (subtotal > 0 && hasAddress && window.deliveryMethod !== 'Pickup') ? window.getShippingCharge(shipState, shipPincode) : 0;
  let total = Math.max(0, subtotal - discount + shipping);

  if (document.getElementById('summaryTotal')) {
    document.getElementById('summaryShipping').textContent = window.deliveryMethod === 'Pickup' ? 'Free (Self Pickup)' : `₹${shipping}`;
    document.getElementById('summarySubtotal').textContent = `₹${subtotal}`;
    document.getElementById('summaryTotal').textContent = `₹${total}`;
    const summaryShippingLine = document.getElementById('summaryShipping').parentElement;
    if (summaryShippingLine) {
      summaryShippingLine.style.display = (shipping > 0 || window.deliveryMethod === 'Pickup') ? 'flex' : 'none';
    }
    const checkoutSummaryTotalEl = document.getElementById('checkoutSummaryTotal');
    if (checkoutSummaryTotalEl) {
      checkoutSummaryTotalEl.textContent = `₹${total}`;
    }
    const promoLine = document.getElementById('summaryPromoLine');
    if (window.appliedPromoCode && discount > 0) {
      promoLine.style.display = 'flex';
      document.getElementById('summaryPromo').textContent = `-₹${discount} (${window.appliedPromoCode.code})`;
    } else {
      promoLine.style.display = 'none';
    }
  }

  // Update shipping method price
  const shippingMethodPriceEl = document.getElementById('shippingMethodPrice');
  if (shippingMethodPriceEl) {
    shippingMethodPriceEl.textContent = window.deliveryMethod === 'Pickup' ? 'Free (Self Pickup)' : (shipping > 0 ? `₹${shipping}` : 'Free');
  }

  // Update Shopify-like checkout sidebar breakdown
  if (document.getElementById('checkoutSidebarTotal')) {
    document.getElementById('checkoutSidebarSubtotal').textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const shippingEl = document.getElementById('checkoutSidebarShipping');
    if (shippingEl) {
      if (window.deliveryMethod === 'Pickup') {
        shippingEl.textContent = 'Free (Self Pickup)';
      } else if (!hasAddress) {
        shippingEl.textContent = 'Enter shipping address';
      } else {
        shippingEl.textContent = `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    const discountRow = document.getElementById('checkoutSidebarDiscountRow');
    const discountEl = document.getElementById('checkoutSidebarDiscount');
    if (discountRow && discountEl) {
      if (window.appliedPromoCode && discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    document.getElementById('checkoutSidebarTotal').textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Calculate taxes (5% GST included in total)
    const taxAmount = total > 0 ? Math.round((total * 5 / 105) * 100) / 100 : 0;
    const taxLabel = document.getElementById('checkoutSidebarTaxLabel');
    if (taxLabel) {
      taxLabel.textContent = `Including ₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in taxes`;
    }
  }

  return { subtotal, discount, shipping, total };
};

window.setDeliveryMethod = function(method) {
  window.deliveryMethod = method;
  
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
        addressText.textContent = window.STORE_PICKUP_ADDRESS || "Lumière Studio, Koregaon Park, Pune, Maharashtra - 411001";
      }
    }
    
    // Hide shipping specific UI elements
    if (savedSec) savedSec.style.display = 'none';
    if (addAddressBtn) addAddressBtn.style.display = 'none';
    if (guestFields) guestFields.style.display = 'none';
    if (shippingHeader) shippingHeader.style.display = 'none';
    
    // Always show contact form for name/email/phone
    if (form) form.style.display = 'block';
    
    // Prefill form contact info if logged in
    const loggedInEmail = localStorage.getItem('lumiere_user_email');
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
        const nameParts = (localStorage.getItem('lumiere_user_name') || '').split(' ');
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
    if (pinField) pinField.value = "411001";
    if (cityField) cityField.value = "Pune";
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
    if (pinField && pinField.value === "411001") pinField.value = "";
    if (cityField && cityField.value === "Pune") cityField.value = "";
    if (stateField && stateField.value === "maharashtra") stateField.value = "";
    
    // Restore normal prefill state (saved addresses vs form)
    window.prefillCheckoutForm();
  }
  
  window.calculatePrices();
};

window.acquireCheckoutLocks = async function() {
  let sessionId = sessionStorage.getItem('lumiere_checkout_session');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

// Contact form handler
document.getElementById('contactForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  try {
    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'new_message',
        siteToken: 'LUMIERE_STORE_2026',
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
      })
    });
    const json = await res.json();
    if (json.success) {
      this.reset();
      document.getElementById('contactSuccessMsg').classList.add('show');
    } else {
      alert(json.error || 'Failed to send message.');
    }
  } catch(e) {
    alert('Could not send message. Please try again.');
  }
});

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
  const email = localStorage.getItem('lumiere_user_email');
  if (!email) {
    localStorage.setItem('lumiere_login_redirect', 'payment');
    window.showLogin();
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

window.proceedToPayment = async function() {
  const loggedInEmail = localStorage.getItem('lumiere_user_email');
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
      city: "Pune",
      state: "maharashtra",
      pincode: "411001",
      phone: document.getElementById('phone').value
    };
    window.selectedAddressId = null;
  } else if (loggedInEmail) {
    const rawAddrs = localStorage.getItem('lumiere_user_addresses');
    const addresses = rawAddrs ? JSON.parse(rawAddrs) : [];
    const selectedAddr = addresses.find(a => String(a.id) === String(window.selectedAddressId));
    if (!selectedAddr) {
      window.showToast("Please select a saved shipping address, or add a new one.", true);
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
  if (summaryAddress) {
    summaryAddress.textContent = `${window.shippingInfo.address}, ${window.shippingInfo.city}, ${window.shippingInfo.state} - ${window.shippingInfo.pincode}`;
  }

  window.checkoutStep = 'payment';
  document.getElementById('deliveryFormContainer').style.display = 'none';
  document.getElementById('paymentScreenContainer').style.display = 'block';
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

  // Double check inventory before sending transaction
  for (const item of window.cart) {
    const prod = window.PRODUCTS.find(p => p.id === item.product.id);
    const vr = prod ? prod.variants.find(v => v.id === item.variant.id) : null;
    const maxStock = vr ? vr.maxStock : 0;
    if (item.quantity > maxStock) {
      window.showToast(`Insufficient stock for ${item.product.name} (${item.variant.name}). Only ${maxStock} items are available in stock.`, true);
      return;
    }
  }

  window._submittingOrder = true;
  document.getElementById('processingOverlay').classList.add('active');
  const prices = window.calculatePrices();
  const userEmail = localStorage.getItem('lumiere_user_email') || window.shippingInfo.email;
  const sessionToken = sessionStorage.getItem('lumiere_checkout_session') || 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2);
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
      items: window.cart.map(i => `${i.product.name} (${i.variant.name}) x${i.quantity}`).join(', '),
      rawItems: { items: window.cart, subtotal: prices.subtotal, total: prices.total },
      addressId: window.selectedAddressId || null,
      fname: window.shippingInfo.fname,
      lname: window.shippingInfo.lname,
      city: window.shippingInfo.city,
      state: window.shippingInfo.state,
      pincode: window.shippingInfo.pincode,
      addressLabel: window.selectedAddressLabel || 'Home',
      couponCode: window.appliedPromoCode?.code || null,
      deliveryMethod: window.deliveryMethod || 'Shipping'
    };

    try {
      const res = await fetch(CORE_STORE_PROXY_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      document.getElementById('processingOverlay').classList.remove('active');
      if (json.success) {
        window.stopCheckoutTimer();
        sessionStorage.removeItem('lumiere_checkout_session');
        sessionStorage.removeItem('lumiere_applied_promo');
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
      document.getElementById('processingOverlay').classList.remove('active');
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
      deliveryMethod: window.deliveryMethod || 'Shipping'
    };

    try {
      const res = await fetch(CORE_STORE_PROXY_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intentPayload)
      });
      const json = await res.json();

      if (!json.success) {
        document.getElementById('processingOverlay').classList.remove('active');
        window.showToast(json.error || "Failed to initiate payment.", true);
        window._submittingOrder = false;
        return;
      }

      const options = {
        key: json.razorpayKeyId,
        amount: Math.round(json.expectedTotal * 100),
        currency: "INR",
        name: "Lumière Soya Candles",
        description: "Order Checkout",
        order_id: json.razorpayOrderId,
        handler: async function (response) {
          document.getElementById('processingOverlay').classList.add('active');
          const payload = {
            action: "new_order",
            siteToken: "LUMIERE_STORE_2026",
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            sessionId: sessionToken,
            name: `${window.shippingInfo.fname} ${window.shippingInfo.lname}`,
            email: userEmail,
            total: `₹${prices.total}`,
            phone: window.shippingInfo.phone,
            shippingAddress: window.shippingInfo.address,
            items: window.cart.map(i => `${i.product.name} (${i.variant.name}) x${i.quantity}`).join(', '),
            rawItems: { items: window.cart, subtotal: prices.subtotal, total: prices.total },
            addressId: window.selectedAddressId || null,
            fname: window.shippingInfo.fname,
            lname: window.shippingInfo.lname,
            city: window.shippingInfo.city,
            state: window.shippingInfo.state,
            pincode: window.shippingInfo.pincode,
            addressLabel: window.selectedAddressLabel || 'Home',
            couponCode: window.appliedPromoCode?.code || null,
            deliveryMethod: window.deliveryMethod || 'Shipping'
          };

          try {
            const orderRes = await fetch(CORE_STORE_PROXY_ROUTE, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            const orderJson = await orderRes.json();
            document.getElementById('processingOverlay').classList.remove('active');
            if (orderJson.success) {
              window.stopCheckoutTimer();
              sessionStorage.removeItem('lumiere_checkout_session');
              sessionStorage.removeItem('lumiere_applied_promo');
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
            document.getElementById('processingOverlay').classList.remove('active');
            window.showToast("Connection error while processing order.", true);
          }
          window._submittingOrder = false;
        },
        prefill: {
          name: `${window.shippingInfo.fname} ${window.shippingInfo.lname}`,
          email: userEmail,
          contact: window.shippingInfo.phone
        },
        theme: {
          color: "#c4b5a0"
        },
        modal: {
          ondismiss: function() {
            document.getElementById('processingOverlay').classList.remove('active');
            window._submittingOrder = false;
          }
        }
      };

      if (json.razorpayOrderId.startsWith('order_mock_')) {
        console.log("Mock Order ID detected. Bypassing Razorpay modal in development mode.");
        const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 15);
        const mockSignature = 'sig_mock_' + Math.random().toString(36).substring(2, 15);
        options.handler({
          razorpay_payment_id: mockPaymentId,
          razorpay_order_id: json.razorpayOrderId,
          razorpay_signature: mockSignature
        });
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (e) {
      document.getElementById('processingOverlay').classList.remove('active');
      window.showToast("Failed to connect to gateway server.", true);
      window._submittingOrder = false;
    }
  }
};

window.showLogin = function() {
  if (localStorage.getItem('lumiere_user_email')) {
    getSupabase().then(supabase => supabase.auth.signOut());
    localStorage.removeItem('lumiere_user_email');
    localStorage.removeItem('lumiere_user_name');
    localStorage.removeItem('lumiere_user_fname');
    localStorage.removeItem('lumiere_user_lname');
    window._ordersData = null;
    var list = document.getElementById('myOrdersListContainer');
    if (list) list.innerHTML = '<p style="font-size:0.85rem; color:var(--stone); text-align:center; padding: 2rem 0;">No order history found.</p>';
    var detail = document.getElementById('orderDetailContent');
    if (detail) { detail.style.display = 'none'; }
    var empty = document.getElementById('orderDetailEmpty');
    if (empty) empty.style.display = 'block';
    localStorage.removeItem('lumiere_user_avatar');
    localStorage.removeItem('lumiere_user_phone');
    localStorage.removeItem('lumiere_user_addresses');
    renderAccountAvatar();
    return;
  }
  window.loginWithGoogle();
};

window.loginWithGoogle = async function() {
  const supabase = await getSupabase();
  const oauthState = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  sessionStorage.setItem('lumiere_oauth_state', oauthState);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
      state: oauthState
    }
  });
  if (error) {
    sessionStorage.removeItem('lumiere_oauth_state');
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = 'Google sign-in failed: ' + error.message;
      errEl.style.display = 'block';
    } else {
      window.showToast('Google sign-in failed: ' + error.message, true);
    }
  } else if (data?.url) {
    window.location.href = data.url;
  }
};

window.checkoutGoogleLogin = function() {
  localStorage.setItem('lumiere_login_redirect', 'payment');
  window.loginWithGoogle();
};

window.prefillContactForm = function() {
  const loggedInEmail = localStorage.getItem('lumiere_user_email');
  const fname = localStorage.getItem('lumiere_user_fname');
  const lname = localStorage.getItem('lumiere_user_lname');
  const loggedInName = (fname !== null || lname !== null) 
    ? `${fname || ''} ${lname || ''}`.trim() 
    : localStorage.getItem('lumiere_user_name');
  const nameField = document.getElementById('contactName');
  const emailField = document.getElementById('contactEmail');

  if (loggedInEmail) {
    if (emailField) {
      emailField.value = loggedInEmail;
      emailField.disabled = true;
    }
    if (nameField && loggedInName) {
      nameField.value = loggedInName;
    }
  } else {
    if (emailField) {
      emailField.value = '';
      emailField.disabled = false;
      
      if (!emailField._hasLoginHandler) {
        emailField._hasLoginHandler = true;
        const triggerLogin = function(e) {
          if (!localStorage.getItem('lumiere_user_email')) {
            e.preventDefault();
            localStorage.setItem('lumiere_login_redirect', 'contact');
            window.showLogin();
          }
        };
        emailField.addEventListener('click', triggerLogin);
      }
    }
  }
};

window.prefillCheckoutForm = async function() {
  const loggedInEmail = localStorage.getItem('lumiere_user_email');
  const loggedInName = localStorage.getItem('lumiere_user_name');
  const autofillBtn = document.getElementById('googleAutofillBtn');
  const savedSec = document.getElementById('savedAddressesSection');
  const form = document.getElementById('checkoutForm');
  const guestBtn = document.getElementById('guestProceedBtn');
  const actionsWrap = document.getElementById('addressFormActions');
  const metaFields = document.getElementById('addressMetaFields');

  if (loggedInEmail) {
    if (autofillBtn) autofillBtn.style.display = 'none';
    if (guestBtn) guestBtn.style.display = 'none';
    if (actionsWrap) actionsWrap.style.display = 'flex';
    if (metaFields) metaFields.style.display = 'block';

    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.value = loggedInEmail;
      emailField.disabled = true;
    }

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
      email: localStorage.getItem('lumiere_user_email') || '',
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
  
  const fname = localStorage.getItem('lumiere_user_fname');
  const lname = localStorage.getItem('lumiere_user_lname');
  if (fname !== null || lname !== null) {
    document.getElementById('fname').value = fname || '';
    document.getElementById('lname').value = lname || '';
  } else {
    const loggedInName = localStorage.getItem('lumiere_user_name');
    if (loggedInName) {
      const nameParts = loggedInName.trim().split(/\s+/);
      document.getElementById('fname').value = nameParts[0] || '';
      document.getElementById('lname').value = nameParts.slice(1).join(' ') || '';
    }
  }

  const defCheck = document.getElementById('isAddressDefault');
  if (defCheck) defCheck.checked = isFirst;

  window.setAddressLabel('Home');

  const savedSec = document.getElementById('savedAddressesSection');
  if (savedSec) savedSec.style.display = 'none';
  const form = document.getElementById('checkoutForm');
  if (form) form.style.display = 'block';
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
      const email = localStorage.getItem('lumiere_user_email');
      if (!email) return;

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
            });
          } else {
            window.showToast(json.error || "Failed to delete address.", true);
          }
        }).catch(e => console.error(e));
    }
  });
};

window.saveAddressForm = function() {
  const form = document.getElementById('checkoutForm');
  if (form && !form.reportValidity()) return;

  const email = localStorage.getItem('lumiere_user_email');
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
        });
      } else {
        window.showToast(json.error || "Failed to save address.", true);
      }
    }).catch(e => console.error(e));
};

window.renderAddressesPage = function() {
  const email = localStorage.getItem('lumiere_user_email');
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
  
  const fname = localStorage.getItem('lumiere_user_fname');
  const lname = localStorage.getItem('lumiere_user_lname');
  if (fname !== null || lname !== null) {
    document.getElementById('addr_fname').value = fname || '';
    document.getElementById('addr_lname').value = lname || '';
  } else {
    const loggedInName = localStorage.getItem('lumiere_user_name');
    if (loggedInName) {
      const nameParts = loggedInName.trim().split(/\s+/);
      document.getElementById('addr_fname').value = nameParts[0] || '';
      document.getElementById('addr_lname').value = nameParts.slice(1).join(' ') || '';
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
      const email = localStorage.getItem('lumiere_user_email');
      if (!email) return;

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
            });
          } else {
            window.showToast(json.error || "Failed to delete address.", true);
          }
        }).catch(e => console.error(e));
    }
  });
};

window.saveAddressesPageForm = function() {
  const form = document.getElementById('addressesPageForm');
  if (form && !form.reportValidity()) return;

  const email = localStorage.getItem('lumiere_user_email');
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
        });
      } else {
        window.showToast(json.error || "Failed to save address.", true);
      }
    }).catch(e => console.error(e));
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
      localStorage.setItem('lumiere_user_addresses', JSON.stringify(json.user.addresses || []));
      if (callback) callback(json.user);
    }
  }).catch(e => console.error("Profile sync failed:", e));
};

window.fetchMyOrders = async function() {
  var email = localStorage.getItem('lumiere_user_email');
  if (!email) return;
  var list = document.getElementById('myOrdersListContainer');
  var detail = document.getElementById('orderDetailContent');
  var empty = document.getElementById('orderDetailEmpty');
  list.innerHTML = '<p style="text-align:center;padding:1rem 0;color:var(--stone);">Loading...</p>';
  try {
    var res = await fetch(CORE_STORE_PROXY_ROUTE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track_order", query: email, siteToken: "LUMIERE_STORE_2026" }) });
    var json = await res.json();
    if (json.success && json.data.length > 0) {
      const sortVal = (document.getElementById('ordersSortSelect')?.value) || 'desc';
      const processedOrders = [...json.data];
      if (sortVal === 'asc') {
        processedOrders.sort((a, b) => new Date(a.date) - new Date(b.date));
      } else {
        processedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
      list.innerHTML = processedOrders.map(function(o) {
        return '<div class="my-order-card' + (o.id === (window._selectedOrderId || json.data[0].id) ? ' active' : '') + '" onclick="window.showOrderDetail(\'' + o.id + '\')">' +
          '<div class="my-order-card-header">' +
            '<span class="my-order-card-id">' + o.id + '</span>' +
            '<span class="my-order-card-date">' + new Date(o.date).toLocaleDateString() + '</span>' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem;">' +
            '<div class="my-order-card-total" style="margin:0;">' + o.total + '</div>' +
            '<span class="status-pill ' + o.status.toLowerCase() + '" style="margin:0;">' + o.status + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
      window._ordersData = json.data;
      window._selectedOrderId = json.data[0].id;
      window.showOrderDetail(json.data[0].id);
    }
  } catch(e) {}
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

window.showOrderDetail = function(id) {
  var orders = window._ordersData || [];
  var order = orders.find(function(o) { return o.id === id; });
  if (!order) return;

  window._selectedOrderId = id;
  var cards = document.querySelectorAll('.my-order-card');
  cards.forEach(function(card) {
    var cardId = card.querySelector('.my-order-card-id').textContent.trim();
    card.classList.toggle('active', cardId === id);
  });
  document.getElementById('orderDetailEmpty').style.display = 'none';
  var detail = document.getElementById('orderDetailContent');
  detail.style.display = 'block';
  var detailContainer = document.getElementById('myOrderDetailContainer');
  if (detailContainer) detailContainer.scrollTop = 0;
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

  var subtotal = itemsBreakdown.reduce(function(sum, item) {
    return sum + (parseFloat(item.price) * item.quantity);
  }, 0);
  
  var totalStr = order.total.replace(/[^0-9.]/g, '');
  var total = parseFloat(totalStr) || 0;
  var shipping = parseFloat(order.shipping) || 0;
  var discount = Math.max(0, subtotal + shipping - total);

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

  detail.innerHTML =
    '<div class="order-detail-header"><h3 class="order-detail-title" style="margin:0;line-height:1;">Order ID: ' + order.id + '</h3><span class="status-pill ' + order.status.toLowerCase() + '" style="margin:0;">' + order.status + '</span></div>' +
    '<div class="tracker-container"><div class="tracker-steps-line"><div class="tracker-progress-line" style="width:' + (order.status === 'Delivered' ? '100' : order.status === 'Shipped' ? '50' : '0') + '%"></div></div><div class="tracker-nodes"><div class="tracker-node' + (order.status !== 'Pending' ? ' completed' : ' active') + '"><div class="tracker-circle">' + window.__svg.check + '</div><span class="tracker-label">Confirmed</span></div><div class="tracker-node' + (order.status === 'Shipped' || order.status === 'Delivered' ? ' completed' : order.status === 'Pending' ? '' : ' active') + '"><div class="tracker-circle">' + window.__svg.truck + '</div><span class="tracker-label">Shipped</span></div><div class="tracker-node' + (order.status === 'Delivered' ? ' completed active' : '') + '"><div class="tracker-circle">' + window.__svg.home + '</div><span class="tracker-label">Delivered</span></div></div></div>' +
    (details.tracking ? 
      ('<div class="order-tracking-card" style="margin-top:0; margin-bottom:1.5rem;">' +
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
      '</div>') : '') +
    '<div class="orders-grid-info">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;border-bottom:1px dashed rgba(196,181,160,0.2);padding-bottom:0.5rem;"><span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--stone);font-weight:500;">Order Invoice</span><span style="font-size:0.8rem;color:var(--stone);font-weight:400;">' + new Date(order.date).toLocaleDateString() + '</span></div>' +
      itemsHtml +
      breakdownHtml +
    '</div>';
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
        return `
          <div style="background:var(--cream); padding:1.5rem; border:1px solid var(--sand); border-radius:8px; margin-bottom:1rem; box-shadow: 0 4px 12px rgba(42,36,32,0.015);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(196,181,160,0.2); padding-bottom:0.75rem;">
              <strong style="font-family:'Cormorant Garamond',serif; font-size:1.25rem;">Order: ${o.id}</strong>
              <span class="status-pill ${o.status.toLowerCase()}">${o.status}</span>
            </div>
            <div style="font-size:0.9rem; line-height:1.6; color:var(--charcoal);">
              ${details.tracking ? `
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
                </div>
              ` : ''}
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

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('auth_error');
  if (authError) {
    window.showToast('Sign in error: ' + decodeURIComponent(authError), true);
    window.history.replaceState({}, '', '/');
  }
  const userEmail = params.get('user_email');
  const userName = params.get('user_name');
  const userAvatar = params.get('user_avatar');

  // If there's no userEmail in the URL, they did not just complete a Google login flow.
  // Clear any pending login redirect to prevent getting stuck in a redirect loop if they clicked "back" from Google.
  if (!userEmail) {
    localStorage.removeItem('lumiere_login_redirect');
  }

  const initialLoginRedirect = localStorage.getItem('lumiere_login_redirect');
  if (initialLoginRedirect) {
    localStorage.removeItem('lumiere_login_redirect');
  }

  if (userEmail) {
    localStorage.setItem('lumiere_user_email', userEmail);
    const fullName = (userName || userEmail.split('@')[0]).trim();
    const parts = fullName.split(/\s+/);
    const fName = parts[0] || '';
    const lName = parts.slice(1).join(' ') || '';
    localStorage.setItem('lumiere_user_fname', fName);
    localStorage.setItem('lumiere_user_lname', lName);
    localStorage.setItem('lumiere_user_name', fullName);
    if (userAvatar) localStorage.setItem('lumiere_user_avatar', userAvatar);
    if (window.syncUserProfile) {
      window.syncUserProfile(userEmail, (userData) => {
        const redirect = initialLoginRedirect;

        if (redirect === 'payment') {
          // After Google login for checkout: ensure they have an address first
          const addresses = userData?.addresses || [];
          if (addresses.length === 0) {
            // No address saved — open the address form, then continue to checkout after save
            window.showPage('payment');
            window.prefillCheckoutForm();
          } else {
            window.goToCheckout();
          }
        } else if (redirect === 'addressesPage') {
          window.showPage('addressesPage');
          window.displayAddressesPageList();
        } else if (redirect === 'ordersPage') {
          window.showPage('ordersPage');
        } else if (redirect === 'contact') {
          window.showPage('contact');
        } else {
          const activePage = localStorage.getItem('lumiere_active_page');
          if (activePage === 'payment') {
            window.prefillCheckoutForm();
          } else if (activePage === 'contact') {
            window.prefillContactForm();
          }
        }
      });
    }
    window.history.replaceState({}, '', '/');
  } else if (localStorage.getItem('lumiere_user_email')) {
    getSupabase().then(async (supabase) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem('lumiere_user_email');
        localStorage.removeItem('lumiere_user_fname');
        localStorage.removeItem('lumiere_user_lname');
        localStorage.removeItem('lumiere_user_name');
        localStorage.removeItem('lumiere_user_avatar');
        localStorage.removeItem('lumiere_user_addresses');
        window.renderAccountAvatar();
        return;
      }
      if (window.syncUserProfile) {
        window.syncUserProfile(localStorage.getItem('lumiere_user_email'), () => {
          const activePage = localStorage.getItem('lumiere_active_page');
          if (activePage === 'payment') {
            window.prefillCheckoutForm();
          } else if (activePage === 'addressesPage') {
            window.displayAddressesPageList();
          } else if (activePage === 'contact') {
            window.prefillContactForm();
          }
        });
      }
    });
  }
  renderAccountAvatar();

  const savedCart = localStorage.getItem('lumiere_cart');
  if (savedCart) {
    try {
      window.cart = JSON.parse(savedCart);
      if (!Array.isArray(window.cart)) window.cart = [];
      window.updateCart();
    } catch (e) {
      console.error("Failed to parse cart:", e);
      window.cart = [];
      localStorage.removeItem('lumiere_cart');
    }
  }
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

  // Require login for protected pages on initial load
  const protectedPages = ['ordersPage', 'addressesPage'];
  if (protectedPages.includes(targetPage) && !localStorage.getItem('lumiere_user_email')) {
    localStorage.setItem('lumiere_login_redirect', targetPage);
    window.showLogin();
    return;
  }

  // Payment page requires login — if not logged in and somehow landed here, go to cart
  if (targetPage === 'payment' && !localStorage.getItem('lumiere_user_email')) {
    targetPage = 'cartPage';
  }

  // Set initial state so Back button works when going back to the first page loaded
  const url = new URL(window.location.href);
  url.searchParams.set('page', targetPage);
  window.history.replaceState({ pageId: targetPage }, '', url.pathname + url.search);

  // Show page immediately to prevent flicker/redirect effect
  window.showPage(targetPage, false);

  await syncCatalogDataset();
  if (localStorage.getItem('lumiere_user_email')) { window.fetchMyOrders(); }
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
  if (e.key === 'lumiere_inventory') {
    if (typeof syncCatalogDataset === 'function') {
      syncCatalogDataset();
    }
  }
});

function cloudinaryOpt(url, width) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const params = ['f_auto', 'q_auto'];
  if (width) params.push('w_' + width);
  return url.replace('/image/upload/', '/image/upload/' + params.join(',') + '/');
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
        heroImg.setAttribute('src', cloudinaryOpt(targetSrc));
        heroImg.setAttribute('srcset', cloudinaryOpt(targetSrc, 380) + ' 380w, ' + cloudinaryOpt(targetSrc, 760) + ' 760w');
        heroImg.setAttribute('sizes', '(max-width: 768px) 280px, 380px');
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
