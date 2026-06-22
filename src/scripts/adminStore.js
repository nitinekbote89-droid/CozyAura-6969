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

window.syncCloudInventory = async function() {
    const pwd = sessionStorage.getItem('lumiere_admin_secret');
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.classList.add('active');
    }
    const startTime = Date.now();
    try {
        const res = await fetch(`${ADMINISTRATIVE_API_ROUTE}?adminSecret=${pwd}&t=${Date.now()}`);
        const json = await res.json();
        if (json.success && json.data) {
            localStorage.setItem('lumiere_inventory', JSON.stringify(json.data.inventory));
            localStorage.setItem('lumiere_orders', JSON.stringify(json.data.orders));
            localStorage.setItem('lumiere_coupons', JSON.stringify(json.data.coupons));
            localStorage.setItem('lumiere_fragrances', JSON.stringify(json.data.fragrances));
            localStorage.setItem('lumiere_storefront_images', JSON.stringify(json.data.storefrontImages || {}));
            
            const activeTab = localStorage.getItem('lumiere_admin_active_tab') || 'dashboard';
            window.switchTab(activeTab);
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
  const inv = JSON.parse(localStorage.getItem('lumiere_inventory') || '[]');
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
    const inv = JSON.parse(localStorage.getItem('lumiere_inventory') || '[]');
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
    const globalFragrances = JSON.parse(localStorage.getItem('lumiere_fragrances') || '[]');
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

    const globalFragrances = JSON.parse(localStorage.getItem('lumiere_fragrances') || '[]');
    const existingProduct = window.editingProductId
        ? JSON.parse(localStorage.getItem('lumiere_inventory') || '[]').find(p => String(p.id) === String(window.editingProductId))
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
    } catch(e){}
};

window.updateOrderStatus = async function(orderId, newStatus) {
    const decodedId = decodeURIComponent(orderId);
    const ords = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
    const order = ords.find(o => String(o.id) === String(decodedId));
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
    const courierVal = document.getElementById('modalCourierInput').value.trim();
    const trackingVal = document.getElementById('modalTrackingInput').value.trim();
    const trackingLinkVal = document.getElementById('modalTrackingLinkInput').value.trim();
    try {
        const res = await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update_tracking", orderId: window.currentViewingOrderId,
                trackingNo: trackingVal,
                courier: courierVal,
                trackingLink: trackingLinkVal,
                status: "Shipped", adminSecret: sessionStorage.getItem('lumiere_admin_secret')
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
    
    const ords = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
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
    const ords = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
    const order = ords.find(o => String(o.id) === String(window.currentViewingOrderId));
    if(!order) return;

    const inventory = JSON.parse(localStorage.getItem('lumiere_inventory') || '[]');

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
        doc.setFont('helvetica', 'bold');
        doc.text('Shipping Address:', 15, y); y += 6;
        doc.setFont('helvetica', 'normal');
        const addrLine = addr.address || '';
        const cityLine = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
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
    if (form) form.reset();
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

window.handleCouponSubmit = async function(e) {
    e.preventDefault();
    const couponPayload = {
        code: document.getElementById('cpCode').value.trim().toUpperCase(),
        type: 'percent',
        discount: parseInt(document.getElementById('cpDiscount').value),
        status: 'Active'
    };
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_coupon", coupon: couponPayload, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        window.closeCouponModal(); window.syncCloudInventory();
    } catch(e){}
};

window.deleteCoupon = async function(code) {
    const decodedCode = decodeURIComponent(code);
    if (!confirm("Permanently disable this promotional voucher?")) return;
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_coupon", code: decodedCode, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        window.syncCloudInventory();
    } catch(e){}
};

window.addGlobalFragrance = async function() {
    const input = document.getElementById('newGlobalFragranceInput'); const val = input.value.trim().toLowerCase(); if(!val) return;
    let fragrances = JSON.parse(localStorage.getItem('lumiere_fragrances') || '[]');
    if(fragrances.includes(val)) return; fragrances.push(val);
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_global_fragrances", fragrances, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        input.value = ''; window.syncCloudInventory();
    } catch(e){}
};

window.removeGlobalFragrance = async function(fragrance) {
    const decodedFragrance = decodeURIComponent(fragrance);
    if (!confirm("Remove this target scent parameter option?")) return;
    let fragrances = JSON.parse(localStorage.getItem('lumiere_fragrances') || '[]').filter(f => f !== decodedFragrance);
    try {
        await fetch(ADMINISTRATIVE_API_ROUTE, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_global_fragrances", fragrances, adminSecret: sessionStorage.getItem('lumiere_admin_secret') })
        });
        window.syncCloudInventory();
    } catch(e){}
};

window.viewOrderDetails = function(orderId) {
    const decodedId = decodeURIComponent(orderId);
    const ords = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
    const inv = JSON.parse(localStorage.getItem('lumiere_inventory') || '[]');
    const order = ords.find(o => String(o.id) === String(decodedId));
    if (!order) return;

    window.currentViewingOrderId = order.id;

    document.getElementById('modalOrderId').textContent = String(order.id).startsWith('#') ? order.id : '#' + order.id;
    document.getElementById('orderModalCustomer').textContent = order.customer || `${order.shippingInfo?.fname || ''} ${order.shippingInfo?.lname || ''}`.trim() || 'Guest';
    document.getElementById('orderModalEmail').textContent = order.shippingInfo?.email || '';
    document.getElementById('orderModalPhone').textContent = order.shippingInfo?.phone ? `📞 ${order.shippingInfo.phone}` : '';
    document.getElementById('orderModalDate').textContent = order.date ? new Date(order.date).toLocaleDateString() : '—';
    document.getElementById('orderModalPayment').textContent = order.paymentMethod || 'COD / Pay on Delivery';
    document.getElementById('orderModalStatus').innerHTML = window.getOrderBadge(order.status);

    const addrParts = [];
    if (order.shippingInfo) {
        const s = order.shippingInfo;
        if (s.address) addrParts.push(s.address);
        if (s.city) addrParts.push(s.city);
        if (s.state) addrParts.push(s.state);
        if (s.pincode) addrParts.push(s.pincode);
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
    document.getElementById('orderModalShippingRow').textContent = shippingVal > 0 ? `Shipping: ₹${shippingVal.toLocaleString('en-IN')}` : `Shipping: Free`;
    document.getElementById('orderModalPromoRow').textContent = discountVal > 0 ? `Discount Applied: -₹${discountVal.toLocaleString('en-IN')}` : '';
    document.getElementById('orderModalTotal').textContent = `₹${totalVal.toLocaleString('en-IN')}`;

    document.getElementById('modalCourierInput').value = order.courier || '';
    document.getElementById('modalTrackingInput').value = order.trackingNumber || '';
    document.getElementById('modalTrackingLinkInput').value = order.trackingLink || '';

    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.add('active');
};

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('lumiere_admin_logged_in') === 'true') {
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        window.syncCloudInventory();
    }
});

window.currentStorefrontImages = null;

window.renderStorefrontImages = function() {
    const container = document.getElementById('storefrontPageFields');
    if (!container) return;
    
    const pageSelect = document.getElementById('storefrontPageSelect');
    const page = pageSelect ? pageSelect.value : 'home';
    
    // Initialize currentStorefrontImages if not set
    const sfImages = JSON.parse(localStorage.getItem('lumiere_storefront_images') || '{}');
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
            localStorage.setItem('lumiere_storefront_images', JSON.stringify(json.storefrontImages));
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
