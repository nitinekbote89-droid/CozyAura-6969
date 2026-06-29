import { jsPDF } from 'jspdf';

const ADMINISTRATIVE_API_ROUTE = "/api/admin";

window.currentFragranceImagesMap = {};
window.currentCoverImageBase64 = "";
window.editingProductId = null;
window.currentViewingOrderId = null;

window.attemptLogin = async function() {
    let pwd = document.getElementById('adminPwd').value;
    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST",
            body: JSON.stringify({ action: "verify_secret", adminSecret: pwd }),
            headers: { "Content-Type": "application/json" }
        });
        const json = await res.json();
        if (json.success) {
            sessionStorage.setItem('lumiere_admin_secret', pwd);
            sessionStorage.setItem('lumiere_admin_logged_in', 'true');
            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) loginOverlay.style.display = 'none';
            window.syncCloudInventory();
        } else { alert('Access Denied.'); }
    } catch(e) { alert('Secure back-office system link unavailable.'); }
};

window.syncCloudInventory = async function(page = null) {
    if (page === null) {
        page = window._ordersCurrentPage || 0;
    }
    const pwd = sessionStorage.getItem('lumiere_admin_secret');
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.classList.add('active');
    }
    const startTime = Date.now();
    try {
        const activeTab = localStorage.getItem('lumiere_admin_active_tab') || 'dashboard';
        const orderSearchEl = document.getElementById('orderSearchInput');
        const searchQuery = orderSearchEl ? orderSearchEl.value.trim() : '';
        const res = await fetch(`${ADMINISTRATIVE_API_ROUTE}?t=${Date.now()}&page=${page}&tab=${activeTab}&q=${encodeURIComponent(searchQuery)}`, {
            headers: { 'X-Admin-Secret': pwd }
        });
        const json = await res.json();
        if (json.success && json.data) {
            localStorage.setItem('lumiere_admin_inventory', JSON.stringify(json.data.inventory));
            localStorage.setItem('lumiere_admin_orders', JSON.stringify(json.data.orders));
            localStorage.setItem('lumiere_admin_orders_pagination', JSON.stringify(json.data.pagination || { page: 0, pageSize: 50, totalOrders: 0, totalPages: 1 }));
            localStorage.setItem('lumiere_admin_coupons', JSON.stringify(json.data.coupons));
            localStorage.setItem('lumiere_admin_fragrances', JSON.stringify(json.data.fragrances));
            localStorage.setItem('lumiere_admin_storefront_images', JSON.stringify(json.data.storefrontImages || {}));
            if (json.data.users !== undefined) localStorage.setItem('lumiere_admin_users', JSON.stringify(json.data.users));
            if (json.data.userAddresses !== undefined) localStorage.setItem('lumiere_admin_user_addresses', JSON.stringify(json.data.userAddresses));
            if (json.data.wishlist !== undefined) localStorage.setItem('lumiere_admin_wishlist', JSON.stringify(json.data.wishlist));
            if (json.data.feedbacks !== undefined) localStorage.setItem('lumiere_admin_feedbacks', JSON.stringify(json.data.feedbacks));
            if (json.data.ordersCountMap !== undefined) localStorage.setItem('lumiere_admin_orders_counts', JSON.stringify(json.data.ordersCountMap));
            if (json.data.wishlistCountMap !== undefined) localStorage.setItem('lumiere_admin_wishlist_counts', JSON.stringify(json.data.wishlistCountMap));
            // Store total counts from server pagination metadata
            const pag = json.data.pagination || {};
            if (pag.totalUsers !== undefined) sessionStorage.setItem('lumiere_admin_total_users', String(pag.totalUsers));
            if (pag.totalFeedbacks !== undefined) sessionStorage.setItem('lumiere_admin_total_feedbacks', String(pag.totalFeedbacks));
            // Invalidate compiled customers cache on fresh data
            window._compiledCustomersCache = null;
            
            if (typeof window.updateCustomerCounts === 'function') {
                window.updateCustomerCounts();
            }
            if (typeof window.updateFeedbackCounts === 'function') {
                window.updateFeedbackCounts();
            }
            
            const activeTab = localStorage.getItem('lumiere_admin_active_tab') || 'dashboard';
            window.switchTab(activeTab, null, true);
        }
    } catch(e) { 
        console.error("Cloud syncing loop halted.", e); 
    } finally {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 500 - elapsed);
        setTimeout(() => {
            if (syncIndicator) {
                syncIndicator.classList.remove('active');
            }
        }, delay);
    }
};

window.openModalForAdd = function() {
  window.editingProductId = null;
  window.currentCoverImageBase64 = "";
  window.currentFragranceImagesMap = {};

  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) modalTitle.textContent = "Add New Product";
  
  const form = document.getElementById('productForm');
  if (form) form.reset();
  
  window.clearCoverImage();
  window.populateCategorySelect();
  window.generateFragranceStockFormFields();

  const modal = document.getElementById('productModal');
  if (modal) modal.classList.add('active');
};

window.openModalForEdit = function(productId) {
  const decodedId = decodeURIComponent(productId);
  const inv = JSON.parse(localStorage.getItem('lumiere_admin_inventory') || '[]');
  const p = inv.find(item => String(item.id) === String(decodedId));
  if (!p) return;

  window.editingProductId = decodedId;
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) modalTitle.textContent = "Edit Product Configuration";
  
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodDesc').value = (p.description && p.description.trim().toLowerCase() !== 'undefined') ? p.description : '';
  document.getElementById('prodSpecs').value = Array.isArray(p.specifications) ? p.specifications.join('\n') : (p.specifications || '');
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodWeight').value = p.weight || 220;

  // Clear cover file input
  const fileInput = document.getElementById('prodCoverImageInput');
  if (fileInput) fileInput.value = "";

  window.currentCoverImageBase64 = p.coverImage || "";
  const pBox = document.getElementById('prodCoverImagePreview');
  if (pBox) {
      if (window.currentCoverImageBase64) {
          pBox.innerHTML = `<img src="${window.currentCoverImageBase64}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="window.clearCoverImage()" style="position:absolute; top:0; right:0; background:var(--danger); color:white; border:none; font-size:10px; width:14px; height:14px; line-height:12px; cursor:pointer; text-align:center;">&times;</button>`;
      } else {
          pBox.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted);">No Cover</span>`;
      }
  }

  window.populateCategorySelect(p.category);
  window.generateFragranceStockFormFields(p.fragranceStocks || {}, p.fragranceImages || {});

  const modal = document.getElementById('productModal');
  if (modal) modal.classList.add('active');
};

window.closeModal = function() {
  const modal = document.getElementById('productModal');
  if (modal) modal.classList.remove('active');
  window.editingProductId = null;
};

window.populateCategorySelect = function(selectedCategory = '') {
    const select = document.getElementById('prodCategory');
    if (!select) return;
    const inv = JSON.parse(localStorage.getItem('lumiere_admin_inventory') || '[]');
    const categories = [...new Set(inv.map(p => p.category ? p.category.toLowerCase().trim() : ''))].filter(Boolean).sort();
    
    select.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        if(cat === selectedCategory.toLowerCase()) opt.selected = true;
        select.appendChild(opt);
    });

    const separatorOpt = document.createElement('option');
    separatorOpt.disabled = true;
    separatorOpt.textContent = "──────────";
    select.appendChild(separatorOpt);

    const customOpt = document.createElement('option');
    customOpt.value = "__custom__";
    customOpt.textContent = "+ Create New Category";
    select.appendChild(customOpt);

    window.handleCategoryChange({ target: select });
};

window.handleCategoryChange = function(e) {
    const val = e.target.value;
    const customGroup = document.getElementById('customCategoryGroup');
    if (customGroup) {
        if(val === "__custom__") {
            customGroup.style.display = 'block';
            document.getElementById('prodCategoryCustom').required = true;
        } else {
            customGroup.style.display = 'none';
            document.getElementById('prodCategoryCustom').required = false;
        }
    }
};

window.generateFragranceStockFormFields = function(selectedStocksMapping = {}, selectedImagesMapping = {}) {
    const parentContainer = document.getElementById('prodFragrancesStockMatrix');
    if (!parentContainer) return;
    const globalFragrances = JSON.parse(localStorage.getItem('lumiere_admin_fragrances') || '[]');
    parentContainer.innerHTML = '';

    const existingFragrances = Object.keys(selectedStocksMapping);
    const fragrances = [...new Set([...globalFragrances, ...existingFragrances])];

    if (fragrances.length === 0) {
        parentContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Create dynamic fragrance tags in settings window first.</p>';
        return;
    }

    window.currentFragranceImagesMap = { ...selectedImagesMapping };

    fragrances.forEach(fragrance => {
        const isGlobal = globalFragrances.includes(fragrance);
        const isChecked = selectedStocksMapping.hasOwnProperty(fragrance);
        const stockValue = isChecked ? selectedStocksMapping[fragrance] : 0;
        const imgBase64 = window.currentFragranceImagesMap[fragrance] || '';

        const row = document.createElement('div');
        row.style.cssText = "display: flex; flex-direction: column; gap: 8px; border-bottom: 1px dashed var(--border); padding-bottom: 12px; margin-bottom: 4px;";
        
        row.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; text-transform: capitalize; font-weight: 500; margin-bottom:0; cursor:pointer; ${!isGlobal ? 'opacity: 0.7;' : ''}">
               <input type="checkbox" data-fragrance="${fragrance}" ${isChecked ? 'checked' : ''} onchange="window.toggleMatrixRowInput(this)" style="width: auto; margin: 0; cursor: pointer; flex-shrink: 0;"> ${fragrance}
               ${!isGlobal ? ' <span style="font-size:0.65rem;color:var(--text-muted); text-transform:none; margin-left: 4px;">(removed from global)</span>' : ''}
            </label>
            <div style="display: flex; align-items: center; gap: 6px;">
               <span style="font-size: 0.8rem; color: var(--text-muted);">Stock Count:</span>
               <input type="number" id="stock_input_${fragrance}" data-original="${stockValue}" onclick="window.promptOrConfirmUnlockStock(this, '${fragrance}')" oninput="const addInput = document.getElementById('add_qty_${fragrance}'); if (addInput) addInput.value = ''; this.setAttribute('data-original', this.value);" min="0" value="${stockValue}" readonly ${!isChecked ? 'disabled' : ''} style="width: 75px; padding: 4px 6px; border:1px solid var(--border); border-radius:4px; font-size:0.85rem; background: var(--bg-main); color: var(--text-muted); cursor: pointer;" title="Click to unlock direct editing">
               <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 6px;">Add Qty:</span>
               <input type="number" id="add_qty_${fragrance}" placeholder="0" ${!isChecked ? 'disabled' : ''} oninput="window.handleAddQtyInput(this, '${fragrance}')" style="width: 60px; padding: 4px 6px; border:1px solid var(--border); border-radius:4px; font-size:0.85rem; background: var(--bg-surface); color: var(--text-main);">
            </div>
          </div>
          
          <div id="media_container_${fragrance}" style="display: ${isChecked ? 'flex' : 'none'}; align-items: center; gap: 12px; padding-left: 22px;">
            <div style="flex: 1;">
               <span style="display:block; font-size: 0.75rem; color: var(--text-muted); margin-bottom:4px;">Fragrance Image Allocation:</span>
               <input type="file" accept="image/*" onchange="window.handleFragranceImageSelection(event, '${fragrance}')" style="font-size:0.8rem; width: 100%; border:none; padding:0;">
            </div>
            <div id="preview_box_${fragrance}" style="width: 42px; height: 42px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-surface); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
               ${imgBase64 ? `<img src="${imgBase64}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="window.clearFragranceImage('${fragrance}')" style="position:absolute; top:0; right:0; background:var(--danger); color:white; border:none; font-size:10px; width:14px; height:14px; line-height:12px; cursor:pointer; text-align:center;">&times;</button>` : `<span style="font-size:0.65rem; color:var(--text-muted);">None</span>`}
            </div>
          </div>
        `;
        parentContainer.appendChild(row);
    });
};

window.resizeAndConvertImage = function(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const webpDataUrl = canvas.toDataURL('image/webp', 0.82);
                        resolve(webpDataUrl);
                    } else {
                        resolve(e.target.result);
                    }
                } catch (err) {
                    console.error("WebP conversion / resizing error:", err);
                    resolve(e.target.result);
                }
            };
            img.onerror = function() {
                resolve(e.target.result);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

window.handleCoverImageSelection = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const base64Str = await window.resizeAndConvertImage(file);
    window.currentCoverImageBase64 = base64Str;
    
    const pBox = document.getElementById('prodCoverImagePreview');
    if (pBox) {
        pBox.innerHTML = `<img src="${base64Str}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="window.clearCoverImage()" style="position:absolute; top:0; right:0; background:var(--danger); color:white; border:none; font-size:10px; width:14px; height:14px; line-height:12px; cursor:pointer; text-align:center;">&times;</button>`;
    }
};

window.clearCoverImage = function() {
    window.currentCoverImageBase64 = "";
    const fileInput = document.getElementById('prodCoverImageInput');
    if (fileInput) fileInput.value = "";
    const pBox = document.getElementById('prodCoverImagePreview');
    if (pBox) {
        pBox.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted);">No Cover</span>`;
    }
};

window.handleFragranceImageSelection = async function(e, fragrance) {
    const file = e.target.files[0];
    if (!file) return;
    const base64Str = await window.resizeAndConvertImage(file);
    window.currentFragranceImagesMap[fragrance] = base64Str;
    
    const pBox = document.getElementById(`preview_box_${fragrance}`);
    if (pBox) {
        pBox.innerHTML = `<img src="${base64Str}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="window.clearFragranceImage('${fragrance}')" style="position:absolute; top:0; right:0; background:var(--danger); color:white; border:none; font-size:10px; width:14px; height:14px; line-height:12px; cursor:pointer; text-align:center;">&times;</button>`;
    }
};

window.clearFragranceImage = function(fragrance) {
    if(window.currentFragranceImagesMap[fragrance]) {
       delete window.currentFragranceImagesMap[fragrance];
    }
    const pBox = document.getElementById(`preview_box_${fragrance}`);
    if(pBox) {
       pBox.innerHTML = `<span style="font-size:0.65rem; color:var(--text-muted);">None</span>`;
    }
};

window.toggleMatrixRowInput = function(cb) {
    const targetFragrance = cb.getAttribute('data-fragrance');
    const inputElement = document.getElementById(`stock_input_${targetFragrance}`);
    const addQtyElement = document.getElementById(`add_qty_${targetFragrance}`);
    const mediaContainer = document.getElementById(`media_container_${targetFragrance}`);
    
    if (cb.checked) {
        if (inputElement) {
            inputElement.disabled = false;
            inputElement.setAttribute('readonly', 'true');
            inputElement.style.background = 'var(--bg-main)';
            inputElement.style.color = 'var(--text-muted)';
            inputElement.style.cursor = 'pointer';
            if (inputElement.value == 0) inputElement.value = 10;
            inputElement.setAttribute('data-original', inputElement.value);
        }
        if (addQtyElement) {
            addQtyElement.disabled = false;
            addQtyElement.value = '';
        }
        if (mediaContainer) mediaContainer.style.display = 'flex';
    } else {
        if (inputElement) {
            inputElement.disabled = true;
            inputElement.setAttribute('readonly', 'true');
        }
        if (addQtyElement) {
            addQtyElement.disabled = true;
            addQtyElement.value = '';
        }
        if (mediaContainer) mediaContainer.style.display = 'none';
        window.clearFragranceImage(targetFragrance);
    }
};

window.promptOrConfirmUnlockStock = function(inputElement, fragrance) {
    if (inputElement.hasAttribute('readonly')) {
        const confirmUnlock = confirm("Do you want to change stock count directly? Otherwise, you should use the Add Qty feature.");
        if (confirmUnlock) {
            inputElement.removeAttribute('readonly');
            inputElement.style.background = 'var(--bg-surface)';
            inputElement.style.color = 'var(--text-main)';
            inputElement.style.cursor = 'auto';
            
            const addQtyInput = document.getElementById(`add_qty_${fragrance}`);
            if (addQtyInput) {
                addQtyInput.disabled = true;
                addQtyInput.value = '';
            }
            inputElement.focus();
        }
    }
};

window.handleAddQtyInput = function(addInput, fragrance) {
    const stockInput = document.getElementById(`stock_input_${fragrance}`);
    if (stockInput) {
        const originalVal = parseInt(stockInput.getAttribute('data-original')) || 0;
        const addVal = parseInt(addInput.value) || 0;
        stockInput.value = Math.max(0, originalVal + addVal);
    }
};

window.handleProductSubmit = async function(e) {
    e.preventDefault();
    
    let category = document.getElementById('prodCategory').value;
    if(category === "__custom__") {
        category = document.getElementById('prodCategoryCustom').value.trim().toLowerCase();
    }

    const globalFragrances = JSON.parse(localStorage.getItem('lumiere_admin_fragrances') || '[]');
    const existingProduct = window.editingProductId
        ? JSON.parse(localStorage.getItem('lumiere_admin_inventory') || '[]').find(p => String(p.id) === String(window.editingProductId))
        : null;

    const fragranceStocks = {};
    const fragranceImages = {};
    let totalStock = 0;

    const checkboxes = document.querySelectorAll('#prodFragrancesStockMatrix input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const fragrance = cb.getAttribute('data-fragrance');
        if (cb.checked) {
            const stockInput = document.getElementById(`stock_input_${fragrance}`);
            const qty = stockInput ? parseInt(stockInput.value) || 0 : 0;
            fragranceStocks[fragrance] = qty;
            totalStock += qty;

            if (window.currentFragranceImagesMap[fragrance]) {
                fragranceImages[fragrance] = window.currentFragranceImagesMap[fragrance];
            } else if (existingProduct?.fragranceImages?.[fragrance]) {
                fragranceImages[fragrance] = existingProduct.fragranceImages[fragrance];
            }
        }
    });

    const productPayload = {
        id: window.editingProductId || 'LM' + Date.now(),
        name: document.getElementById('prodName').value.trim(),
        price: parseInt(document.getElementById('prodPrice').value),
        weight: parseInt(document.getElementById('prodWeight').value),
        description: document.getElementById('prodDesc').value.trim(),
        specifications: document.getElementById('prodSpecs').value.trim().split('\n').filter(Boolean),
        category, fragranceStocks, fragranceImages, stock: totalStock,
        coverImage: window.currentCoverImageBase64 || existingProduct?.coverImage || null
    };

    // Close the modal immediately to make the UI responsive while image uploads finish in the background
    window.closeModal();

    fetch(ADMINISTRATIVE_API_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'save_product', 
            product: productPayload, 
            adminSecret: sessionStorage.getItem('lumiere_admin_secret') 
        })
    }).then(res => res.json())
      .then(json => {
          if (json.success) {
              window.syncCloudInventory();
          } else {
              alert("Failed to save product configuration: " + (json.error || "Unknown error"));
          }
      }).catch(err => {
          console.error("Background product save failed:", err);
          alert("Connection error while saving product.");
      });
};

window.deleteProduct = async function(id) {
    const decodedId = decodeURIComponent(id);
    if (!confirm("Permanently strip this product definition from your database records?")) return;
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_product", productId: decodedId, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        window.syncCloudInventory();
    } catch(e){ console.error("Failed to delete product:", e); }
};

window.updateOrderStatus = async function(orderId, newStatus) {
    const decodedId = decodeURIComponent(orderId);
    const ords = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
    const order = ords.find(o => String(o.id) === String(decodedId));

    let displayStatus = newStatus;
    if (order && order.deliveryMethod === 'Pickup') {
        if (newStatus === 'Shipped') displayStatus = 'Ready to Pickup';
        if (newStatus === 'Delivered') displayStatus = 'Completed';
    } else {
        if (newStatus === 'Shipped') displayStatus = 'Shipped';
        if (newStatus === 'Delivered') displayStatus = 'Delivered';
    }

    if (!confirm(`Are you sure you want to change the status of order ${decodedId} to "${displayStatus}"?`)) {
        if (typeof window.renderOrders === 'function') {
            window.renderOrders();
        }
        return;
    }

    const trackingNo = order ? order.trackingNumber || '' : '';
    const courier = order ? order.courier || '' : '';
    const trackingLink = order ? order.trackingLink || '' : '';
    
    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update_tracking", orderId: decodedId,
                trackingNo, courier, trackingLink,
                status: newStatus, adminSecret: sessionStorage.getItem('lumiere_admin_secret')
            })
        });
        const json = await res.json();
        if(json.success) { window.syncCloudInventory(); }
    } catch(e){ console.error("Could not update order status.", e); }
};

window.saveTrackingFromModal = async function() {
    const ords = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
    const order = ords.find(o => String(o.id) === String(window.currentViewingOrderId));
    const isPickup = order && order.deliveryMethod === 'Pickup';
    const courierVal = isPickup ? 'Self Pickup' : document.getElementById('modalCourierInput').value.trim();
    const trackingVal = isPickup ? 'N/A' : document.getElementById('modalTrackingInput').value.trim();
    const trackingLinkVal = isPickup ? '' : document.getElementById('modalTrackingLinkInput').value.trim();
    
    // Auto status flow: Pending -> Shipped, Shipped -> Delivered
    const statusVal = (order && order.status === 'Shipped') ? 'Delivered' : 'Shipped';

    // No confirmation prompt for modal updates as requested.

    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update_tracking", orderId: window.currentViewingOrderId,
                trackingNo: trackingVal,
                courier: courierVal,
                trackingLink: trackingLinkVal,
                status: statusVal, adminSecret: sessionStorage.getItem('lumiere_admin_secret')
            })
        });
        const json = await res.json();
        if (json.success) {
            window.closeOrderModal();
            window.syncCloudInventory();
        }
    } catch(e){ console.error("Could not update tracking info.", e); }
};

window.clearAllOrders = async function() {
    if (!confirm("Are you sure you want to permanently delete all order history from database? This action is irreversible!")) return;
    
    const ords = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
    const adminSecret = sessionStorage.getItem('lumiere_admin_secret');
    
    try {
        await Promise.all(ords.map(order => 
            fetch(ADMINISTRATIVE_API_ROUTE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_order", orderId: order.id, adminSecret })
            })
        ));
        window.syncCloudInventory();
    } catch(e) {
        console.error("Could not clear all orders.", e);
    }
};

window.downloadInvoiceBill = function() {
    if(!window.currentViewingOrderId) return;
    const ords = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
    const order = ords.find(o => String(o.id) === String(window.currentViewingOrderId));
    if(!order) return;

    const inventory = JSON.parse(localStorage.getItem('lumiere_admin_inventory') || '[]');

    const orderNum = String(order.id).startsWith('#') ? String(order.id).slice(1) : String(order.id);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // --- helper: wrapped text lines ---
    function addWrapped(text, x, y, maxWidth, lineHeight) {
        const lines = doc.splitTextToSize(text, maxWidth);
        for (const line of lines) {
            if (y + lineHeight > 285) { doc.addPage(); y = 20; }
            doc.text(line, x, y);
            y += lineHeight;
        }
        return y;
    }

    // --- header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LUMIÈRE SOYA CANDLES', 105, 25, { align: 'center' });
    doc.setFontSize(14);
    doc.text('INVOICE RECEIPT', 105, 33, { align: 'center' });

    // horizontal rule
    doc.setDrawColor(200);
    doc.line(15, 38, 195, 38);

    let y = 46;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // --- order info ---
    doc.setFont('helvetica', 'bold');
    doc.text('Order ID:', 15, y); doc.setFont('helvetica', 'normal');
    doc.text(`#${orderNum}`, 50, y); y += 7;

    if (order.courier) {
        doc.setFont('helvetica', 'bold'); doc.text('Courier:', 15, y); doc.setFont('helvetica', 'normal');
        doc.text(order.courier, 50, y); y += 6;
    }
    if (order.trackingNumber) {
        doc.setFont('helvetica', 'bold'); doc.text('Tracking No:', 15, y); doc.setFont('helvetica', 'normal');
        doc.text(order.trackingNumber, 50, y); y += 6;
    }
    if (order.trackingLink) {
        doc.setFont('helvetica', 'bold'); doc.text('Tracking Link:', 15, y); doc.setFont('helvetica', 'normal');
        y = addWrapped(order.trackingLink, 50, y, 140, 5);
    }

    const customerFullName = order.customer || `${order.shippingInfo?.fname || ''} ${order.shippingInfo?.lname || ''}`.trim() || 'Guest';
    doc.setFont('helvetica', 'bold'); doc.text('Customer:', 15, y); doc.setFont('helvetica', 'normal');
    doc.text(customerFullName, 50, y); y += 7;
    if (order.shippingInfo?.email) {
        doc.setFont('helvetica', 'bold'); doc.text('Email:', 15, y); doc.setFont('helvetica', 'normal');
        doc.text(order.shippingInfo.email, 50, y); y += 6;
    }

    doc.setFont('helvetica', 'bold'); doc.text('Date:', 15, y); doc.setFont('helvetica', 'normal');
    doc.text(order.date ? new Date(order.date).toLocaleDateString() : '—', 50, y); y += 6;
    doc.setFont('helvetica', 'bold'); doc.text('Payment:', 15, y); doc.setFont('helvetica', 'normal');
    doc.text(order.paymentMethod || 'COD / Pay on Delivery', 50, y); y += 6;
    y += 2;

    // --- shipping address ---
    if (order.shippingInfo) {
        const addr = order.shippingInfo;
        const isPickup = order.deliveryMethod === 'Pickup';
        doc.setFont('helvetica', 'bold');
        doc.text(isPickup ? 'Pickup Location:' : 'Shipping Address:', 15, y); y += 6;
        doc.setFont('helvetica', 'normal');
        const addrLine = addr.address || '';
        const cityLine = isPickup ? '' : [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
        if (addrLine && cityLine) {
            y = addWrapped(addrLine, 15, y, 175, 5);
            y = addWrapped(cityLine, 15, y, 175, 5);
        } else {
            y = addWrapped(addrLine || cityLine || 'N/A', 15, y, 175, 5);
        }
        doc.setFont('helvetica', 'bold'); doc.text('Phone:', 15, y); doc.setFont('helvetica', 'normal');
        doc.text(addr.phone || 'N/A', 40, y); y += 8;
    }

    // --- items header ---
    doc.setDrawColor(200);
    doc.line(15, y, 195, y); y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Purchased Items', 15, y); y += 7;
    doc.setFontSize(9);

    // table header
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y - 4, 180, 6, 'F');
    doc.text('Item', 17, y);
    doc.text('Category', 90, y);
    doc.text('Price', 130, y);
    doc.text('Qty', 155, y);
    doc.text('Total', 175, y, { align: 'right' });
    y += 7;

    doc.setFont('helvetica', 'normal');
    for (const item of (order.items || [])) {
        const invItem = inventory.find(p => String(p.id) === String(item.product?.id || item.id));
        const productName = item.product?.name || item.name || 'Product';
        const chosenFragrance = item.variant?.name || item.chosenFragrance || 'Standard';
        const category = item.product?.category || item.category || (invItem ? invItem.category : '') || '';
        const itemPrice = parseInt(item.product?.price || item.price) || 0;
        const subtotal = itemPrice * item.quantity;

        if (y > 260) { doc.addPage(); y = 20; }
        const label = `${productName} (${chosenFragrance})`;
        doc.text(label, 17, y);
        doc.text(category, 90, y);
        doc.text(`Rs. ${itemPrice.toLocaleString('en-IN')}`, 130, y);
        doc.text(String(item.quantity), 155, y);
        doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, 175, y, { align: 'right' });
        y += 5;

        if (invItem && invItem.description && invItem.description.trim().toLowerCase() !== 'undefined') {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(8);
            doc.setTextColor(100);
            y = addWrapped(`Desc: ${invItem.description}`, 22, y, 165, 4);
            doc.setTextColor(0);
            doc.setFontSize(9);
        }
    }

    // totals
    y += 4;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setDrawColor(200);
    doc.line(15, y, 195, y); y += 6;

    const orderTotal = parseInt(String(order.total ?? '').replace(/[^\d]/g, '')) || 0;
    let discountAmt = parseFloat(order.discount) || 0;
    let shippingAmt = parseFloat(order.shipping) || 0;
    let subtotalAmt = orderTotal + discountAmt - shippingAmt;
    if (discountAmt === 0 && shippingAmt === 0) {
      const itemsSubtotal = (order.items || []).reduce((sum, it) => sum + ((parseInt(it.variant?.price || it.product?.price || it.price) || 0) * it.quantity), 0);
      if (itemsSubtotal > 0 && itemsSubtotal !== orderTotal) {
        subtotalAmt = itemsSubtotal;
        shippingAmt = orderTotal - itemsSubtotal;
        if (shippingAmt < 0) { shippingAmt = 0; subtotalAmt = orderTotal; }
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Subtotal: Rs. ${subtotalAmt.toLocaleString('en-IN')}`, 175, y, { align: 'right' });
    y += 6;
    if (shippingAmt > 0) {
      doc.text(`Shipping: Rs. ${shippingAmt.toLocaleString('en-IN')}`, 175, y, { align: 'right' });
    } else {
      doc.text(`Shipping: Free`, 175, y, { align: 'right' });
    }
    y += 6;
    if (discountAmt > 0) {
      doc.text(`Discount: -Rs. ${discountAmt.toLocaleString('en-IN')}`, 175, y, { align: 'right' });
      y += 6;
    }
    doc.setDrawColor(200);
    doc.line(130, y, 195, y); y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Total: Rs. ${orderTotal.toLocaleString('en-IN')}`, 175, y, { align: 'right' });
    y += 12;

    // footer
    doc.setDrawColor(200);
    doc.line(15, y, 195, y); y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for purchasing clean soya wax!', 105, y, { align: 'center' });

    // --- open in new tab (browser PDF viewer), user can download from there ---
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

window.openCouponModal = function() {
    const form = document.getElementById('couponForm');
    if (form) {
        form.reset();
        document.getElementById('cpType').value = 'percent';
        document.getElementById('cpMinOrderValue').value = '0';
        document.getElementById('cpScope').value = 'public';
        window.handleCouponTypeChange('percent');
    }
    const modal = document.getElementById('couponModal');
    if (modal) modal.classList.add('active');
};

window.closeCouponModal = function() {
    const modal = document.getElementById('couponModal');
    if (modal) modal.classList.remove('active');
};

window.closeOrderModal = function() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.remove('active');
    window.currentViewingOrderId = null;
};

window.handleCouponTypeChange = function(type) {
    const group = document.getElementById('cpDiscountGroup');
    const label = document.getElementById('cpDiscountLabel');
    const input = document.getElementById('cpDiscount');
    
    if (!group || !label || !input) return;

    if (type === 'freeship') {
        group.style.display = 'none';
        input.removeAttribute('required');
        input.value = '0';
    } else {
        group.style.display = 'block';
        input.setAttribute('required', 'true');
        
        if (type === 'percent') {
            label.textContent = "Discount Value (%)";
            input.setAttribute('min', '1');
            input.setAttribute('max', '100');
            input.placeholder = "e.g. 15";
            if (parseInt(input.value) > 100) input.value = '100';
        } else {
            label.textContent = "Discount Value (₹)";
            input.setAttribute('min', '1');
            input.removeAttribute('max');
            input.placeholder = "e.g. 150";
        }
    }
};

window.handleCouponSubmit = async function(e) {
    e.preventDefault();
    const type = document.getElementById('cpType').value;
    const discountVal = type === 'freeship' ? 0 : parseInt(document.getElementById('cpDiscount').value) || 0;
    const minOrderVal = parseFloat(document.getElementById('cpMinOrderValue').value) || 0;
    const isPublicVal = document.getElementById('cpScope').value === 'public';

    const couponPayload = {
        code: document.getElementById('cpCode').value.trim().toUpperCase(),
        type: type,
        discount: discountVal,
        minOrderValue: minOrderVal,
        isPublic: isPublicVal,
        status: 'Active'
    };
    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_coupon", coupon: couponPayload, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        const json = await res.json();
        if (json.success) {
            window.closeCouponModal();
            window.syncCloudInventory();
        } else {
            alert("Failed to save coupon: " + (json.error || "Unknown error"));
        }
    } catch(e){
        console.error("Failed to save coupon:", e);
        alert("Failed to save coupon due to network error.");
    }
};

window.deleteCoupon = async function(code) {
    const decodedCode = decodeURIComponent(code);
    if (!confirm("Permanently disable this promotional voucher?")) return;
    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_coupon", code: decodedCode, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        const json = await res.json();
        if (json.success) {
            window.syncCloudInventory();
        } else {
            alert("Failed to delete coupon: " + (json.error || "Unknown error"));
        }
    } catch(e){
        console.error("Failed to delete coupon:", e);
        alert("Failed to delete coupon due to network error.");
    }
};

window.addGlobalFragrance = async function() {
    const input = document.getElementById('newGlobalFragranceInput'); const val = input.value.trim().toLowerCase(); if(!val) return;
    let fragrances = JSON.parse(localStorage.getItem('lumiere_admin_fragrances') || '[]');
    if(fragrances.includes(val)) return; fragrances.push(val);
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_global_fragrances", fragrances, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        input.value = ''; window.syncCloudInventory();
    } catch(e){ console.error("Failed to add global fragrance:", e); }
};

window.removeGlobalFragrance = async function(fragrance) {
    const decodedFragrance = decodeURIComponent(fragrance);
    if (!confirm("Remove this target scent parameter option?")) return;
    let fragrances = JSON.parse(localStorage.getItem('lumiere_admin_fragrances') || '[]').filter(f => f !== decodedFragrance);
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_global_fragrances", fragrances, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        window.syncCloudInventory();
    } catch(e){ console.error("Failed to remove global fragrance:", e); }
};

window.viewOrderDetails = async function(orderId) {
    const decodedId = decodeURIComponent(orderId);
    const ords = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
    const inv = JSON.parse(localStorage.getItem('lumiere_admin_inventory') || '[]');
    
    const modal = document.getElementById('orderModal');
    const loader = document.getElementById('orderModalLoader');
    const content = document.getElementById('orderModalContent');

    document.getElementById('modalOrderId').textContent = String(decodedId).startsWith('#') ? decodedId : '#' + decodedId;

    // Always show loading view immediately when opening receipt modal
    if (loader) loader.style.display = 'flex';
    if (content) content.style.display = 'none';
    if (modal) modal.classList.add('active');

    let order = ords.find(o => String(o.id) === String(decodedId));
    if (!order) {
        try {
            const pwd = sessionStorage.getItem('lumiere_admin_secret');
            const res = await fetch(`${ADMINISTRATIVE_API_ROUTE}?action=get_order_details&orderId=${encodeURIComponent(decodedId)}&t=${Date.now()}`, {
                headers: { 'X-Admin-Secret': pwd }
            });
            const json = await res.json();
            if (json.success && json.order) {
                order = json.order;
            } else {
                throw new Error(json.error || 'Receipt not found');
            }
        } catch(e) {
            console.error("Failed to load order receipt from database:", e);
            if (modal) modal.classList.remove('active');
            alert("Could not load receipt details for order " + decodedId + " from database.");
            return;
        }
    } else {
        // Introduce a small 250ms loading display for visual consistency
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';
    window.currentViewingOrderId = order.id;

    document.getElementById('modalOrderId').textContent = String(order.id).startsWith('#') ? order.id : '#' + order.id;
    document.getElementById('orderModalCustomer').textContent = order.customer || `${order.shippingInfo?.fname || ''} ${order.shippingInfo?.lname || ''}`.trim() || 'Guest';
    document.getElementById('orderModalEmail').textContent = order.shippingInfo?.email || '';
    document.getElementById('orderModalPhone').textContent = order.shippingInfo?.phone ? `📞 ${order.shippingInfo.phone}` : '';
    document.getElementById('orderModalDate').textContent = order.date ? new Date(order.date).toLocaleDateString() : '—';
    document.getElementById('orderModalPayment').textContent = order.paymentMethod || 'COD / Pay on Delivery';
    document.getElementById('orderModalStatus').innerHTML = window.getOrderBadge(order.status, order.deliveryMethod);

    const isPickup = order.deliveryMethod === 'Pickup';
    const trackingSection = document.getElementById('modalTrackingSection');
    const trackingSaveBtn = document.getElementById('modalTrackingSaveBtn');
    const pickupActionSection = document.getElementById('modalPickupActionSection');
    const pickupSubmitBtn = document.getElementById('modalPickupSubmitBtn');
    
    if (trackingSaveBtn) trackingSaveBtn.style.display = 'none';
    if (pickupActionSection) pickupActionSection.style.display = 'none';

    if (isPickup) {
        if (trackingSection) trackingSection.style.display = 'none';
        if (pickupActionSection && pickupSubmitBtn) {
            if (order.status === 'Pending') {
                pickupActionSection.style.display = 'block';
                pickupSubmitBtn.textContent = 'Ready to Pickup';
            } else if (order.status === 'Shipped') {
                pickupActionSection.style.display = 'block';
                pickupSubmitBtn.textContent = 'Mark as Completed';
            }
        }
    } else {
        if (trackingSection) trackingSection.style.display = 'block';
        if (pickupActionSection) pickupActionSection.style.display = 'none';
        if (trackingSaveBtn) {
            if (order.status === 'Pending') {
                trackingSaveBtn.style.display = 'block';
                trackingSaveBtn.textContent = 'Ready to Ship';
            } else if (order.status === 'Shipped') {
                trackingSaveBtn.style.display = 'block';
                trackingSaveBtn.textContent = 'Mark as Delivered';
            }
        }
    }

    const addressLabelEl = document.getElementById('orderModalAddressLabel');
    if (addressLabelEl) {
        addressLabelEl.textContent = isPickup ? 'Pickup Location' : 'Shipping Address';
    }

    const addrParts = [];
    if (order.shippingInfo) {
        const s = order.shippingInfo;
        if (isPickup) {
            addrParts.push(s.address || 'Lumière Studio, Koregaon Park, Pune, Maharashtra - 411001');
        } else {
            if (s.address) addrParts.push(s.address);
            if (s.city) addrParts.push(s.city);
            if (s.state) addrParts.push(s.state);
            if (s.pincode) addrParts.push(s.pincode);
        }
    }
    document.getElementById('orderModalAddress').textContent = addrParts.length > 0 ? addrParts.join(', ') : (order.shippingInfo?.address || '—');

    let items = order.items || [];
    if (items.length === 0 && order.itemsSummary) {
        items = order.itemsSummary.split(', ').map(raw => {
            const match = raw.match(/^(.*?)\s*\((.*?)\)\s*x(\d+)$/);
            if (match) {
                const pName = match[1].trim();
                const vName = match[2].trim();
                const qty = parseInt(match[3]) || 1;
                const invItem = inv.find(p => p.name.toLowerCase() === pName.toLowerCase());
                const price = invItem ? invItem.price : 0;
                return { product: { name: pName }, variant: { name: vName }, quantity: qty, _price: price };
            }
            return { product: { name: raw }, variant: { name: 'Standard' }, quantity: 1, _price: 0 };
        });
    }

    const tbody = document.getElementById('orderItemsBody');
    if (tbody) {
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;">No item details available.</td></tr>';
        } else {
            tbody.innerHTML = items.map(item => {
                const invItem = inv.find(p => String(p.id) === String(item.product?.id || item.id));
                const category = invItem?.category || item.product?.category || '—';
                const productName = item.product?.name || item.name || 'Product';
                const variantName = item.variant?.name || item.chosenFragrance || 'Standard';
                const itemPrice = item._price || parseInt(item.variant?.price || item.product?.price || item.price) || 0;
                const subtotal = itemPrice * item.quantity;

                const fImg = invItem?.fragranceImages?.[variantName.toLowerCase()] || invItem?.fragranceImages?.[variantName];
                const fImgHTML = fImg ? `<img src="${fImg}" style="width:14px; height:14px; object-fit:cover; border-radius:50%; border:1px solid var(--border); vertical-align:middle; margin-right:4px;">` : '';

                return `<tr>
                    <td style="font-weight:500;text-transform:capitalize;">${productName} — <span style="text-transform:capitalize;color:var(--text-muted);font-weight:400;">${variantName}</span></td>
                    <td style="text-transform:capitalize;">${category}</td>
                    <td>₹${itemPrice.toLocaleString('en-IN')}</td>
                    <td>${item.quantity}</td>
                    <td>₹${subtotal.toLocaleString('en-IN')}</td>
                </tr>`;
            }).join('');
        }
    }

    const totalVal = parseInt(String(order.total ?? '').replace(/[^\d]/g, '')) || 0;
    let discountVal = parseFloat(order.discount) || 0;
    let shippingVal = parseFloat(order.shipping) || 0;
    const itemsSubtotal = items.reduce((sum, it) => sum + ((it._price || parseInt(it.variant?.price || it.product?.price || it.price) || 0) * it.quantity), 0);
    let subtotalVal = totalVal + discountVal - shippingVal;
    if (discountVal === 0 && shippingVal === 0 && itemsSubtotal > 0 && itemsSubtotal !== totalVal) {
      subtotalVal = itemsSubtotal;
      shippingVal = totalVal - itemsSubtotal;
      if (shippingVal < 0) { shippingVal = 0; subtotalVal = totalVal; }
    }

    document.getElementById('orderModalSubtotalRow').textContent = `Subtotal: ₹${subtotalVal.toLocaleString('en-IN')}`;
    document.getElementById('orderModalShippingRow').textContent = shippingVal > 0 ? `Shipping: ₹${shippingVal.toLocaleString('en-IN')}` : (order.deliveryMethod === 'Pickup' ? `Pickup: Free` : `Shipping: Free`);
    document.getElementById('orderModalPromoRow').textContent = discountVal > 0 ? `Discount Applied: -₹${discountVal.toLocaleString('en-IN')}` : '';
    document.getElementById('orderModalTotal').textContent = `₹${totalVal.toLocaleString('en-IN')}`;

    document.getElementById('modalCourierInput').value = order.courier || '';
    document.getElementById('modalTrackingInput').value = order.trackingNumber || '';
    document.getElementById('modalTrackingLinkInput').value = order.trackingLink || '';

    if (modal) modal.classList.add('active');
};

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('lumiere_admin_logged_in') === 'true') {
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        window.syncCloudInventory();
    }
    
    // Periodically sync cloud data every 10 seconds if authenticated
    setInterval(() => {
        if (sessionStorage.getItem('lumiere_admin_logged_in') === 'true') {
            window.syncCloudInventory();
        }
    }, 10000);
});

window.currentStorefrontImages = null;

window.renderStorefrontImages = function() {
    const container = document.getElementById('storefrontPageFields');
    if (!container) return;
    
    const pageSelect = document.getElementById('storefrontPageSelect');
    const page = pageSelect ? pageSelect.value : 'home';
    
    // Initialize currentStorefrontImages if not set
    const sfImages = JSON.parse(localStorage.getItem('lumiere_admin_storefront_images') || '{}');
    if (!window.currentStorefrontImages || Object.keys(window.currentStorefrontImages).length === 0) {
        window.currentStorefrontImages = {
            home_hero: sfImages.home_hero || "",
            ig_1: sfImages.ig_1 || "",
            ig_2: sfImages.ig_2 || "",
            ig_3: sfImages.ig_3 || "",
            ig_4: sfImages.ig_4 || "",
            ig_5: sfImages.ig_5 || "",
            ig_6: sfImages.ig_6 || "",
            ig_7: sfImages.ig_7 || "",
            ig_8: sfImages.ig_8 || "",
            ig_9: sfImages.ig_9 || "",
            ig_10: sfImages.ig_10 || "",
            ig_11: sfImages.ig_11 || "",
            ig_12: sfImages.ig_12 || "",
            about_process: sfImages.about_process || "",
            contact_banner: sfImages.contact_banner || ""
        };
    }
    
    container.innerHTML = '';
    
    if (page === 'home') {
        container.innerHTML = `
            <div style="margin-bottom: 32px;">
                <h4 style="font-weight: 500; font-size: 1.05rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px; color: var(--gold-dark);">Hero Banner</h4>
                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; background: var(--bg-surface); padding: 16px; border: 1px solid var(--border); border-radius: 6px;">
                    <div id="preview-home_hero" style="width: 140px; height: 140px; border-radius: 6px; border: 1px solid var(--border); overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                        ${window.currentStorefrontImages.home_hero ? `<img src="${window.currentStorefrontImages.home_hero}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 12px; font-weight: 500;">No Hero Image</span>`}
                        ${window.currentStorefrontImages.home_hero ? `<button type="button" onclick="window.clearStorefrontImage('home_hero')" style="position:absolute; top:6px; right:6px; background:var(--danger); color:white; border:none; font-size:11px; width:18px; height:18px; line-height:16px; cursor:pointer; text-align:center; border-radius:50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2)">&times;</button>` : ''}
                    </div>
                    <div style="flex: 1; min-width: 240px;">
                        <label style="display: block; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 10px; font-weight: 500;">Upload Hero Image (Replaces default candle illustration):</label>
                        <input type="file" accept="image/*" onchange="window.handleStorefrontImageSelection(event, 'home_hero')" style="font-size: 0.9rem; font-family: inherit; color: var(--text-main);">
                    </div>
                </div>
            </div>
            
                <h4 style="font-weight: 500; font-size: 1.05rem; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px; color: var(--gold-dark);">Instagram Feed ("Follow Along")</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">Customize the 12 post boxes shown in the social integration grid at the bottom of the home tab. Uploading an image replaces the default gradient fallback.</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 20px;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => {
                        const key = `ig_${i}`;
                        const imgUrl = window.currentStorefrontImages[key] || "";
                        return `
                            <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border); border-radius: 6px; display: flex; gap: 16px; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                <div id="preview-${key}" style="width: 70px; height: 70px; border-radius: 4px; border: 1px solid var(--border); overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); position: relative; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                                    ${imgUrl ? `<img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size:0.65rem; color:var(--text-muted); font-weight: 500;">Gradient</span>`}
                                    ${imgUrl ? `<button type="button" onclick="window.clearStorefrontImage('${key}')" style="position:absolute; top:4px; right:4px; background:var(--danger); color:white; border:none; font-size:9px; width:14px; height:14px; line-height:12px; cursor:pointer; text-align:center; border-radius:50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2)">&times;</button>` : ''}
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <span style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Post Box #${i}</span>
                                    <input type="file" accept="image/*" onchange="window.handleStorefrontImageSelection(event, '${key}')" style="font-size: 0.78rem; width: 100%; font-family: inherit; color: var(--text-main);">
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else if (page === 'about') {
        container.innerHTML = `
            <div>
                <h4 style="font-weight: 500; font-size: 1.05rem; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px; color: var(--gold-dark);">Our Story: Process Illustration</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">This image replaces the default vector graphic SVG shown in the "Our Process / How We Make" section on the About tab.</p>
                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; background: var(--bg-surface); padding: 16px; border: 1px solid var(--border); border-radius: 6px;">
                    <div id="preview-about_process" style="width: 160px; height: 200px; border-radius: 6px; border: 1px solid var(--border); overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                        ${window.currentStorefrontImages.about_process ? `<img src="${window.currentStorefrontImages.about_process}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:12px; font-weight: 500;">Default SVG Illustration</span>`}
                        ${window.currentStorefrontImages.about_process ? `<button type="button" onclick="window.clearStorefrontImage('about_process')" style="position:absolute; top:6px; right:6px; background:var(--danger); color:white; border:none; font-size:11px; width:18px; height:18px; line-height:16px; cursor:pointer; text-align:center; border-radius:50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2)">&times;</button>` : ''}
                    </div>
                    <div style="flex: 1; min-width: 240px;">
                        <label style="display: block; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 10px; font-weight: 500;">Upload Process Illustration Image:</label>
                        <input type="file" accept="image/*" onchange="window.handleStorefrontImageSelection(event, 'about_process')" style="font-size: 0.9rem; font-family: inherit; color: var(--text-main);">
                    </div>
                </div>
            </div>
        `;
    } else if (page === 'contact') {
        container.innerHTML = `
            <div>
                <h4 style="font-weight: 500; font-size: 1.05rem; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px; color: var(--gold-dark);">Contact Box: Top Banner</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">This banner image will be displayed at the very top of the "Studio Details" sidebar card on the Contact tab.</p>
                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; background: var(--bg-surface); padding: 16px; border: 1px solid var(--border); border-radius: 6px;">
                    <div id="preview-contact_banner" style="width: 260px; height: 120px; border-radius: 6px; border: 1px solid var(--border); overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                        ${window.currentStorefrontImages.contact_banner ? `<img src="${window.currentStorefrontImages.contact_banner}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size:0.75rem; color:var(--text-muted); font-weight: 500;">No Banner Configured</span>`}
                        ${window.currentStorefrontImages.contact_banner ? `<button type="button" onclick="window.clearStorefrontImage('contact_banner')" style="position:absolute; top:6px; right:6px; background:var(--danger); color:white; border:none; font-size:11px; width:18px; height:18px; line-height:16px; cursor:pointer; text-align:center; border-radius:50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2)">&times;</button>` : ''}
                    </div>
                    <div style="flex: 1; min-width: 240px;">
                        <label style="display: block; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 10px; font-weight: 500;">Upload Top Banner Image:</label>
                        <input type="file" accept="image/*" onchange="window.handleStorefrontImageSelection(event, 'contact_banner')" style="font-size: 0.9rem; font-family: inherit; color: var(--text-main);">
                    </div>
                </div>
            </div>
        `;
    }
};

window.selectStorefrontPage = function(pageVal) {
    window.renderStorefrontImages();
};

window.handleStorefrontImageSelection = async function(e, key) {
    const file = e.target.files[0];
    if (!file) return;
    const base64Str = await window.resizeAndConvertImage(file);
    
    if (!window.currentStorefrontImages) {
        window.currentStorefrontImages = {};
    }
    window.currentStorefrontImages[key] = base64Str;
    
    // Update local preview immediately
    window.renderStorefrontImages();
};

window.clearStorefrontImage = function(key) {
    if (!window.currentStorefrontImages) return;
    
    window.currentStorefrontImages[key] = "";
    window.renderStorefrontImages();
};

window.saveStorefrontImages = async function() {
    const btn = document.getElementById('btnSaveStorefrontImages');
    const originalText = btn ? btn.textContent : "Save Changes";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
    }
    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "save_storefront_images",
                storefrontImages: window.currentStorefrontImages,
                adminSecret: sessionStorage.getItem('lumiere_admin_secret')
            })
        });
        const json = await res.json();
        if (json.success) {
            localStorage.setItem('lumiere_admin_storefront_images', JSON.stringify(json.storefrontImages));
            window.currentStorefrontImages = { ...json.storefrontImages };
            alert("Storefront images saved successfully!");
            window.syncCloudInventory(); // Sync changes
        } else {
            alert("Failed to save storefront images: " + (json.error || "Unknown error"));
        }
    } catch(e) {
        alert("Error saving storefront images: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
};

const esc = str => String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmtDate = d => { try { const dt = new Date(d); return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(); } catch(e) { return '—'; } };

window._selectedCustomerEmail = null;
window._compiledCustomersCache = null;

// Recompute and cache the compiled customers list. Cache is invalidated on every sync.
window.getCompiledCustomers = function() {
  if (window._compiledCustomersCache) return window._compiledCustomersCache;

  const users = JSON.parse(localStorage.getItem('lumiere_admin_users') || '[]');
  const addresses = JSON.parse(localStorage.getItem('lumiere_admin_user_addresses') || '[]');
  const orders = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
  const wishlist = JSON.parse(localStorage.getItem('lumiere_admin_wishlist') || '[]');
  const ordersCountsMap = JSON.parse(localStorage.getItem('lumiere_admin_orders_counts') || '{}');
  const wishlistCountsMap = JSON.parse(localStorage.getItem('lumiere_admin_wishlist_counts') || '{}');

  // Build fast O(1) lookup maps to avoid O(n²) nested filters
  const addrByEmail = {};
  addresses.forEach(a => {
    const em = a.user_email?.toLowerCase().trim();
    if (!em) return;
    if (!addrByEmail[em]) addrByEmail[em] = [];
    addrByEmail[em].push(a);
  });

  const ordersByEmail = {};
  orders.forEach(o => {
    const em = o.shippingInfo?.email?.toLowerCase().trim();
    if (!em) return;
    if (!ordersByEmail[em]) ordersByEmail[em] = [];
    ordersByEmail[em].push(o);
  });

  const wishlistCountByEmail = {};
  wishlist.forEach(w => {
    const em = w.user_email?.toLowerCase().trim();
    if (!em) return;
    wishlistCountByEmail[em] = (wishlistCountByEmail[em] || 0) + 1;
  });

  // Collect all unique emails
  const emailSet = new Set();
  users.forEach(u => { if (u.email) emailSet.add(u.email.toLowerCase().trim()); });
  Object.keys(addrByEmail).forEach(em => emailSet.add(em));
  Object.keys(ordersByEmail).forEach(em => emailSet.add(em));
  wishlist.forEach(w => { if (w.user_email) emailSet.add(w.user_email.toLowerCase().trim()); });

  const customers = Array.from(emailSet).map(email => {
    let fname = '';
    let lname = '';
    let phone = '';

    // Check user_addresses via map
    const userAddrs = addrByEmail[email] || [];
    const defaultAddr = userAddrs.find(a => a.is_default) || userAddrs[0];
    if (defaultAddr) {
      fname = defaultAddr.fname || '';
      lname = defaultAddr.lname || '';
      phone = defaultAddr.phone || '';
    }

    // Check orders via map
    const userOrders = ordersByEmail[email] || [];
    if (userOrders.length > 0) {
      const latestOrder = userOrders.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
      }, userOrders[0]);
      if (latestOrder.shippingInfo) {
        if (!fname) fname = latestOrder.shippingInfo.fname || '';
        if (!lname) lname = latestOrder.shippingInfo.lname || '';
        if (!phone) phone = latestOrder.shippingInfo.phone || '';
      }
    }

    return {
      email,
      fname: fname.trim(),
      lname: lname.trim(),
      phone: phone.trim(),
      ordersCount: ordersCountsMap[email] !== undefined ? ordersCountsMap[email] : userOrders.length,
      wishlistCount: wishlistCountsMap[email] !== undefined ? wishlistCountsMap[email] : (wishlistCountByEmail[email] || 0)
    };
  });

  // Sort alphabetically by name
  customers.sort((a, b) => {
    const nameA = `${a.fname} ${a.lname}`.trim().toLowerCase();
    const nameB = `${b.fname} ${b.lname}`.trim().toLowerCase();
    if (nameA && nameB) return nameA.localeCompare(nameB);
    if (nameA) return -1;
    if (nameB) return 1;
    return a.email.localeCompare(b.email);
  });

  window._compiledCustomersCache = customers;
  return customers;
};

// Customers list pagination state
window._customersListPage = 0;
const CUSTOMERS_PER_PAGE = 30;
let _customerSearchTimer = null;
window._customerSearchResults = null; // null = use local cache, array = server results

// Attach debounced server-side search to the search box when it exists
window.initCustomerSearch = function() {
  const searchInput = document.getElementById('customerSearchInput');
  if (!searchInput || searchInput.dataset.serverSearchInit === '1') return;
  searchInput.dataset.serverSearchInit = '1';

  searchInput.addEventListener('input', () => {
    clearTimeout(_customerSearchTimer);
    const q = searchInput.value.trim();

    // Clear search: revert to local cache view
    if (q.length < 2) {
      window._customerSearchResults = null;
      window.renderCustomersList(true);
      return;
    }

    // Debounce: wait 350ms after user stops typing
    _customerSearchTimer = setTimeout(() => {
      window.searchCustomersOnServer(q);
    }, 350);
  });
};

window.searchCustomersOnServer = async function(q) {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">🔍 Searching...</td></tr>';

  try {
    const pwd = sessionStorage.getItem('lumiere_admin_secret');
    const res = await fetch(`${ADMINISTRATIVE_API_ROUTE}?action=search_customers&q=${encodeURIComponent(q)}&t=${Date.now()}`, {
      headers: { 'X-Admin-Secret': pwd }
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Search failed');

    window._customerSearchResults = json.customers || [];
    window._customersListPage = 0;
    window.renderCustomersList();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--danger);">Search failed. Please try again.</td></tr>';
  }
};

window.renderCustomersList = function(resetPage) {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  window.initCustomerSearch();

  if (resetPage) window._customersListPage = 0;

  const searchInput = document.getElementById('customerSearchInput');
  const hasActiveSearch = searchInput && searchInput.value.trim().length >= 2;

  let filtered;
  if (hasActiveSearch && window._customerSearchResults !== null) {
    filtered = (window._customerSearchResults).map((c, idx) => ({ ...c, sequenceNumber: idx + 1 }));
  } else {
    const customers = window.getCompiledCustomers();

    // Sync counts
    const totalStored = sessionStorage.getItem('lumiere_admin_total_users');
    const displayCount = (totalStored !== null && totalStored !== undefined) ? parseInt(totalStored, 10) : customers.length;
    const registryCountEl = document.getElementById('customerRegistryCount');
    if (registryCountEl) registryCountEl.textContent = displayCount;
    const sidebarCountEl = document.getElementById('sidebarCustomerCount');
    if (sidebarCountEl) sidebarCountEl.textContent = displayCount;
    const dashCountEl = document.getElementById('statCustomers');
    if (dashCountEl) dashCountEl.textContent = displayCount;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const customersWithIndex = customers.map((c, idx) => ({ ...c, sequenceNumber: idx + 1 }));

    filtered = customersWithIndex.filter(c => {
      const fullName = `${c.fname} ${c.lname}`.toLowerCase();
      const seqStr = `#${c.sequenceNumber}`;
      return c.email.includes(query) || fullName.includes(query) ||
             c.phone.includes(query) || seqStr.includes(query) ||
             String(c.sequenceNumber) === query;
    });
  }

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    const searchVal = searchInput ? searchInput.value.trim() : '';
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">${
      searchVal.length >= 2 ? `No customers found for "<strong>${esc(searchVal)}</strong>"` : 'No customers found.'
    }</td></tr>`;
    return;
  }

  // Paginate
  const totalPages = Math.ceil(filtered.length / CUSTOMERS_PER_PAGE);
  window._customersListPage = Math.min(window._customersListPage, Math.max(0, totalPages - 1));
  const currentPage = window._customersListPage;
  const pageSlice = filtered.slice(currentPage * CUSTOMERS_PER_PAGE, (currentPage + 1) * CUSTOMERS_PER_PAGE);

  tbody.innerHTML = pageSlice.map(c => {
    const displayName = `${c.fname} ${c.lname}`.trim() || 'Guest Customer';
    const displayPhone = c.phone ? esc(c.phone) : '—';
    const encodedCust = encodeURIComponent(JSON.stringify(c));
    return `<tr onclick="window.viewCustomerDetailModal('${encodedCust}')" style="cursor:pointer;">` +
      `<td>#${c.sequenceNumber}</td>` +
      `<td style="font-weight:500; text-transform:capitalize;">${esc(displayName)}</td>` +
      `<td style="font-family:monospace;">${esc(c.email)}</td>` +
      `<td>${esc(displayPhone)}</td>` +
      `<td style="text-align:center; font-weight:600;">${c.ordersCount}</td>` +
      `<td style="text-align:center; font-weight:600;">${c.wishlistCount}</td>` +
      `<td style="text-align:center;">` +
        `<button class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-radius:4px;">` +
          `View` +
        `</button>` +
      `</td>` +
    `</tr>`;
  }).join('');

  // Pagination controls & hint wrapper
  const paginationContainer = document.getElementById('customersPaginationContainer');
  if (paginationContainer) {
    paginationContainer.innerHTML = '';
    if (totalPages > 1 || !hasActiveSearch) {
      const hintText = !hasActiveSearch ? `Showing <strong>${filtered.length}</strong> most recent customers &nbsp;·&nbsp; Search by name, email or phone to find anyone` : '';
      const controlsHtml = totalPages > 1 ? 
        `<div style="display:inline-flex; align-items:center; gap:12px; font-size:0.85rem; color:var(--text-muted); margin-bottom: 4px;">
          <button onclick="window._customersListPage=Math.max(0,window._customersListPage-1); window.renderCustomersList();" 
            style="padding:6px 14px; border:1px solid var(--border); border-radius:6px; background:var(--bg-surface); cursor:pointer; color:var(--text-main); font-size:0.85rem;"
            ${currentPage === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>← Prev</button>
          <span>Page ${currentPage + 1} of ${totalPages} &nbsp;(${filtered.length} total)</span>
          <button onclick="window._customersListPage=Math.min(${totalPages-1},window._customersListPage+1); window.renderCustomersList();"
            style="padding:6px 14px; border:1px solid var(--border); border-radius:6px; background:var(--bg-surface); cursor:pointer; color:var(--text-main); font-size:0.85rem;"
            ${currentPage >= totalPages - 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>Next →</button>
        </div>` : '';

      paginationContainer.innerHTML = `
        ${controlsHtml}
        ${hintText ? `<p style="font-size:0.78rem; color:var(--text-muted); margin:4px 0 0 0; opacity:0.8;">${hintText}</p>` : ''}
      `;
    }
  }
};

window._modalCustomerOrdersPage = 0;
window._modalCustomerWishlistPage = 0;
const MODAL_ITEMS_PER_PAGE = 5;
window._currentViewingModalCustomer = null;

window.closeCustomerDetailModal = function() {
  const modal = document.getElementById('customerDetailModal');
  if (modal) modal.classList.remove('active');
};

window.viewCustomerDetailModal = function(encodedCustomer) {
  const customer = JSON.parse(decodeURIComponent(encodedCustomer));
  window._currentViewingModalCustomer = customer;
  window._modalCustomerOrdersPage = 0;
  window._modalCustomerWishlistPage = 0;
  
  const modal = document.getElementById('customerDetailModal');
  if (modal) modal.classList.add('active');

  const body = document.getElementById('customerDetailModalBody');
  if (body) {
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px; color:var(--text-muted); gap:16px;">
        <div class="spinner-gold-mini" style="width:24px; height:24px; border:2px solid rgba(184, 151, 90, 0.2); border-top-color:#b8975a; border-radius:50%; animation:spinCircle 0.8s linear infinite;"></div>
        <div style="font-size:0.9rem; font-weight:500;">Loading customer profile...</div>
      </div>
    `;
  }

  (async () => {
    try {
      const pwd = sessionStorage.getItem('lumiere_admin_secret');
      const res = await fetch(`${ADMINISTRATIVE_API_ROUTE}?action=get_customer_profile&email=${encodeURIComponent(customer.email)}&t=${Date.now()}`, {
        headers: { 'X-Admin-Secret': pwd }
      });
      const json = await res.json();
      if (json.success && json.customer) {
        window._currentViewingModalCustomer = json.customer;
        window.renderCustomerDetailModalContent();
      } else {
        throw new Error(json.error || 'Failed to fetch details');
      }
    } catch (e) {
      console.error(e);
      if (body) {
        body.innerHTML = `
          <div style="text-align:center; padding:48px; color:var(--danger); font-size:0.9rem;">
            Failed to load profile. <a href="#" onclick="window.viewCustomerDetailModal('${encodedCustomer}'); return false;" style="color:var(--info); text-decoration:underline;">Retry</a>
          </div>
        `;
      }
    }
  })();
};

window.renderCustomerDetailModalContent = function() {
  const customer = window._currentViewingModalCustomer;
  if (!customer) return;

  const body = document.getElementById('customerDetailModalBody');
  if (!body) return;

  const email = customer.email.toLowerCase().trim();
  const displayName = `${customer.fname} ${customer.lname}`.trim() || 'Guest Customer';
  const phoneSection = customer.phone ? `<p style="margin:4px 0 0 0; font-size:0.9rem; color:var(--text-muted);"><strong>Phone:</strong> ${esc(customer.phone)}</p>` : '';

  let headerHtml = `
    <div style="border-bottom:1px solid var(--border); padding-bottom:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h3 style="margin:0; font-size:1.4rem; text-transform:capitalize; font-family:'Cormorant Garamond',serif; color:var(--gold-dark);">${esc(displayName)}</h3>
        <p style="margin:6px 0 0 0; font-size:0.9rem; color:var(--text-muted);"><strong>Email:</strong> ${esc(customer.email)}</p>
        ${phoneSection}
      </div>
      <button class="btn btn-secondary" onclick="window.deleteCustomerProfileFromModal('${encodeURIComponent(customer.email)}')" style="border-color:var(--danger); color:var(--danger); display:flex; align-items:center; gap:6px; padding:6px 12px; font-size:0.8rem; height:fit-content; border-radius:6px; font-family:inherit; cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Delete Profile
      </button>
    </div>
  `;

  // Get orders
  let ordersToUse = [];
  if (customer.recentOrders) {
    ordersToUse = customer.recentOrders;
  } else {
    const orders = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
    ordersToUse = orders.filter(o => o.shippingInfo?.email?.toLowerCase().trim() === email).map(o => ({
      id: o.id,
      total: o.total,
      status: o.status,
      date: o.date,
      deliveryMethod: o.deliveryMethod || 'Shipping'
    }));
  }

  // Get wishlist
  const wishlist = JSON.parse(localStorage.getItem('lumiere_admin_wishlist') || '[]');
  const wishlistToUse = wishlist.filter(w => w.user_email?.toLowerCase().trim() === email);
  const inventory = JSON.parse(localStorage.getItem('lumiere_admin_inventory') || '[]');

  // Paginate Orders (large limit to show all scrollable)
  const MODAL_ORDERS_LIMIT = 200;
  const ordersSlice = ordersToUse.slice(0, MODAL_ORDERS_LIMIT);

  let ordersHtml = '';
  if (ordersToUse.length === 0) {
    ordersHtml = '<p style="color:var(--text-muted); font-size:0.88rem; margin:0;">No order history.</p>';
  } else {
    ordersHtml = `
      <div class="table-container" style="border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px;">
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-main);">
            <tr style="border-bottom:1px solid var(--border);">
              <th style="width: 20%; padding:8px 10px; text-align:left; font-size:0.75rem;">Order ID</th>
              <th style="width: 20%; padding:8px 10px; text-align:left; font-size:0.75rem;">Date</th>
              <th style="width: 25%; padding:8px 10px; text-align:left; font-size:0.75rem;">Status</th>
              <th style="width: 20%; padding:8px 10px; text-align:left; font-size:0.75rem;">Total</th>
              <th style="width: 15%; padding:8px 10px; text-align:center; font-size:0.75rem;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${ordersSlice.map(o => {
              const formattedId = String(o.id).startsWith('#') ? o.id : '#' + o.id;
              const totalVal = typeof o.total === 'number' ? o.total : (parseInt(String(o.total || '').replace(/[^\d]/g, '')) || 0);
              return `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="width: 20%; padding:8px 10px; font-weight:500;">${formattedId}</td>
                  <td style="width: 20%; padding:8px 10px;">${o.date ? fmtDate(o.date) : '—'}</td>
                  <td style="width: 25%; padding:8px 10px;">${window.getOrderBadge(o.status, o.deliveryMethod)}</td>
                  <td style="width: 20%; padding:8px 10px; font-weight:500;">₹${totalVal.toLocaleString('en-IN')}</td>
                  <td style="width: 15%; padding:8px 10px; text-align:center;">
                    <button class="btn btn-secondary" onclick="window.viewOrderDetails('${encodeURIComponent(String(o.id ?? ''))}')" style="padding:2px 6px; font-size:0.7rem;">Receipt</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${ordersToUse.length > MODAL_ORDERS_LIMIT ? `<p style="font-size:0.78rem; color:var(--text-muted); text-align:center; margin-top:4px;">Showing top ${MODAL_ORDERS_LIMIT} orders.</p>` : ''}
    `;
  }

  // Paginate Wishlist
  const wishlistSlice = wishlistToUse.slice(0, 100);

  let wishlistHtml = '';
  if (wishlistToUse.length === 0) {
    wishlistHtml = '<p style="color:var(--text-muted); font-size:0.88rem; margin:0;">No items in wishlist.</p>';
  } else {
    wishlistHtml = `
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:8px;">
        ${wishlistSlice.map(w => {
          const product = inventory.find(p => String(p.id) === String(w.product_id));
          const prodName = product ? product.name : w.product_id;
          const coverImg = (product && product.coverImage) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23E5E7EB'/%3E%3C/svg%3E";
          const variantName = w.variant_name;
          const price = product ? `₹${product.price}` : '—';
          return `
            <div style="display:flex; align-items:center; gap:12px; padding:8px 12px; border:1px solid var(--border); border-radius:6px; background:var(--bg-main);">
              <img src="${coverImg}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid var(--border);">
              <div style="flex:1;">
                <div style="font-weight:500; font-size:0.85rem; text-transform:capitalize; color:var(--text-main);">${esc(prodName)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:capitalize;">Variant: ${esc(variantName)}</div>
              </div>
              <div style="font-weight:600; font-size:0.85rem; color:var(--gold-dark);">${price}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  body.innerHTML = `
    ${headerHtml}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:12px; text-align:center;">
        <div style="font-size:1.4rem; font-weight:700; color:var(--brand);">${customer.ordersCount}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Total Orders</div>
      </div>
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:12px; text-align:center;">
        <div style="font-size:1.4rem; font-weight:700; color:var(--brand);">${customer.wishlistCount}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Wishlist Items</div>
      </div>
    </div>
    
    <div style="margin-bottom:24px;">
      <h4 style="margin:0 0 10px 0; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted);">Wishlist</h4>
      ${wishlistHtml}
    </div>

    <div>
      <h4 style="margin:0 0 10px 0; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted);">Orders History</h4>
      ${ordersHtml}
    </div>
  `;
};

window.deleteCustomerProfileFromModal = async function(encodedEmail) {
  const email = decodeURIComponent(encodedEmail);
  if (!confirm(`Are you sure you want to delete customer "${email}"? This will permanently delete their profile, saved addresses, wishlist, and all associated order history.`)) {
    return;
  }
  
  try {
    const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_customer",
        email: email,
        adminSecret: sessionStorage.getItem('lumiere_admin_secret')
      })
    });
    const json = await res.json();
    if (json.success) {
      window.closeCustomerDetailModal();
      window.syncCloudInventory();
    } else {
      alert(`Failed to delete customer: ${json.error}`);
    }
  } catch (e) {
    console.error("Failed to delete customer:", e);
  }
};

// Feedbacks list pagination state
window._feedbacksPage = 0;
const FEEDBACKS_PER_PAGE = 50;

window.updateFeedbackCounts = function() {
  const feedbacks = JSON.parse(localStorage.getItem('lumiere_admin_feedbacks') || '[]');
  const total = parseInt(sessionStorage.getItem('lumiere_admin_total_feedbacks') || String(feedbacks.length), 10);
  const sidebarCountEl = document.getElementById('sidebarFeedbackCount');
  if (sidebarCountEl) sidebarCountEl.textContent = total || feedbacks.length;
};

window.renderFeedbacks = function(resetPage) {
  const tbody = document.getElementById('feedbackTableBody');
  if (!tbody) return;

  if (resetPage) window._feedbacksPage = 0;
  
  const feedbacks = JSON.parse(localStorage.getItem('lumiere_admin_feedbacks') || '[]');
  
  if (feedbacks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">No customer feedback submissions recorded in database.</td></tr>';
    return;
  }

  // Paginate feedbacks — never render more than FEEDBACKS_PER_PAGE rows at once
  const totalPages = Math.ceil(feedbacks.length / FEEDBACKS_PER_PAGE);
  window._feedbacksPage = Math.min(window._feedbacksPage, Math.max(0, totalPages - 1));
  const currentPage = window._feedbacksPage;
  const pageSlice = feedbacks.slice(currentPage * FEEDBACKS_PER_PAGE, (currentPage + 1) * FEEDBACKS_PER_PAGE);
  
  tbody.innerHTML = pageSlice.map(function(f) {
    const escF = str => String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const starsHtml = '<span style="color:#FFC107; font-size:1.1rem; letter-spacing:1px;">' + '★'.repeat(f.rating) + '</span>' + '<span style="color:var(--text-muted); opacity:0.25; font-size:1.1rem; letter-spacing:1px;">' + '★'.repeat(5 - f.rating) + '</span>';
    const hasComment = !!(f.comment || '').trim();
    return '<tr style="cursor:pointer;" onclick="window.openFeedbackModal(\'' + f.order_id + '\')">' +
      '<td style="font-weight:500;">' + escF(f.customer_name || 'Anonymous') + '</td>' +
      '<td>' + escF(f.user_email || '—') + '</td>' +
      '<td style="font-family:monospace; font-weight:600;">' + escF(f.order_id) + '</td>' +
      '<td>' + starsHtml + '</td>' +
      '<td style="text-align:center;">' +
        '<button class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-radius:4px;" onclick="event.stopPropagation(); window.openFeedbackModal(\'' + f.order_id + '\')">' +
          (hasComment ? 'Read' : 'View') +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  // Pagination controls row
  if (totalPages > 1) {
    const controlRow = document.createElement('tr');
    controlRow.innerHTML = `<td colspan="5" style="padding:10px 0; text-align:center;">
      <div style="display:inline-flex; align-items:center; gap:12px; font-size:0.8rem; color:var(--text-muted);">
        <button onclick="window._feedbacksPage=Math.max(0,window._feedbacksPage-1); window.renderFeedbacks();" 
          style="padding:4px 12px; border:1px solid var(--border); border-radius:4px; background:var(--bg-surface); cursor:pointer; color:var(--text-main); font-size:0.78rem;"
          ${currentPage === 0 ? 'disabled' : ''}>← Prev</button>
        Page ${currentPage + 1} of ${totalPages} &nbsp;(${feedbacks.length} loaded)
        <button onclick="window._feedbacksPage=Math.min(${totalPages-1},window._feedbacksPage+1); window.renderFeedbacks();"
          style="padding:4px 12px; border:1px solid var(--border); border-radius:4px; background:var(--bg-surface); cursor:pointer; color:var(--text-main); font-size:0.78rem;"
          ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
      </div>
    </td>`;
    tbody.appendChild(controlRow);
  }
};

window.openFeedbackModal = function(orderId) {
  const feedbacks = JSON.parse(localStorage.getItem('lumiere_admin_feedbacks') || '[]');
  const f = feedbacks.find(item => item.order_id === orderId);
  if (!f) return;
  
  // Resolve purchase items summary from orders list in local storage
  const orders = JSON.parse(localStorage.getItem('lumiere_admin_orders') || '[]');
  const matchedOrder = orders.find(o => String(o.id) === String(orderId));
  const itemsSummary = matchedOrder ? (matchedOrder.itemsSummary || '(No details found)') : '(No details found)';
  
  document.getElementById('feedbackModalCustomerName').textContent = f.customer_name || 'Anonymous';
  document.getElementById('feedbackModalCustomerEmail').textContent = f.user_email || '—';
  document.getElementById('feedbackModalOrderId').textContent = f.order_id;
  document.getElementById('feedbackModalRating').innerHTML = '<span style="color:#FFC107;">' + '★'.repeat(f.rating) + '</span>' + '<span style="color:var(--text-muted); opacity:0.25;">' + '★'.repeat(5 - f.rating) + '</span>';
  document.getElementById('feedbackModalPurchasedItems').textContent = itemsSummary;
  document.getElementById('feedbackModalComment').textContent = f.comment || '(No written review comments provided by the customer.)';
  
  const modal = document.getElementById('feedbackDetailModal');
  if (modal) modal.classList.add('active');
};

window.closeFeedbackModal = function() {
  const modal = document.getElementById('feedbackDetailModal');
  if (modal) modal.classList.remove('active');
};
