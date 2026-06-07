const ADMIN_PIN = '7277';
const STORAGE_KEY = 'sr-nanded-stock';

const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearFilters = document.getElementById('clearFilters');
const syncButton = document.getElementById('syncButton');
const adminToggle = document.getElementById('adminToggle');
const adminModal = document.getElementById('adminModal');
const closeAdminModal = document.getElementById('closeAdminModal');
const adminSubmit = document.getElementById('adminSubmit');
const adminPin = document.getElementById('adminPin');
const adminMessage = document.getElementById('adminMessage');
const summary = document.getElementById('summary');
const productList = document.getElementById('productList');
const productTemplate = document.getElementById('productTemplate');
const totalProducts = document.getElementById('totalProducts');
const totalStock = document.getElementById('totalStock');
const adminStatus = document.getElementById('adminStatus');

const DATA_SOURCE_URL =https://raw.githubusercontent.com/srfashionned/sr-fashion-nanded/refs/heads/main/items.json; // Set this to a JSON or CSV URL for future auto-sync
let products = [];

let adminMode = false;
let stockOverrides = loadStockOverrides();

function loadStockOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

async function loadProducts() {
  if (DATA_SOURCE_URL) {
    try {
      products = await fetchInventorySource(DATA_SOURCE_URL);
    } catch (error) {
      console.error('Failed to load auto-sync data:', error);
      products = window.SRFASHION_PRODUCTS || [];
    }
  } else if (window.SRFASHION_PRODUCTS?.length) {
    products = window.SRFASHION_PRODUCTS;
  } else {
    try {
      const response = await fetch('items.json');
      if (!response.ok) throw new Error('Failed to fetch items.json');
      products = await response.json();
    } catch (error) {
      console.error('Failed to load local products:', error);
      products = window.SRFASHION_PRODUCTS || [];
    }
  }
  renderProductList();
}

function saveStockOverrides() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stockOverrides));
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '–';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return '₹' + num.toLocaleString('en-IN');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function mapCsvToObjects(lines) {
  const headers = lines[0].map(header => header.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const item = {};
    headers.forEach((key, index) => {
      item[key] = line[index] !== undefined ? line[index].trim().replace(/^"|"$/g, '') : '';
    });
    return normalizeInventoryItem(item);
  }).filter(item => item.alias || item.name);
}

async function fetchInventorySource(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load inventory source: ' + response.statusText);
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json') || url.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const loaded = Array.isArray(parsed) ? parsed : normalizeInventoryCollection(parsed);
    return loaded.map(normalizeInventoryItem);
  }

  return mapCsvToObjects(parseCsv(text));
}

function normalizeInventoryCollection(data) {
  if (Array.isArray(data)) return data;
  const keys = Object.keys(data);
  const arrayValue = keys.map(key => data[key]).find(Array.isArray);
  return Array.isArray(arrayValue) ? arrayValue : [];
}

function normalizeInventoryItem(item) {
  const normalized = {};
  Object.keys(item).forEach(key => {
    const rawKey = key.toString().trim().replace(/^"|"$/g, '');
    const normalizedKey = rawKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
    const mappedKey = {
      product_code: 'alias',
      item_code: 'alias',
      code: 'alias',
      sku: 'alias',
      busy_stock: 'busy_stock',
      total_stock: 'busy_stock',
      stock: 'busy_stock',
      quantity: 'busy_stock',
      purchase: 'purchase_price',
      purchase_price: 'purchase_price',
      cost_price: 'purchase_price',
      print_name: 'print_name',
      printname: 'print_name',
      print: 'print_name',
      category: 'group',
      group_name: 'group',
      group: 'group',
      mrp: 'mrp',
      sale_price: 'sale_price',
      wholesale_price: 'wholesale_price',
      shop_stock: 'shop_stock',
      godown_stock: 'godown_stock',
      barcode: 'barcode',
      brand: 'brand',
      name: 'name',
      alias: 'alias'
    }[normalizedKey] || normalizedKey;

    const value = item[key];
    normalized[mappedKey] = ['mrp', 'sale_price', 'wholesale_price', 'purchase_price', 'shop_stock', 'godown_stock', 'busy_stock', 'total_stock'].includes(mappedKey)
      ? parseNumber(value)
      : (value === null || value === undefined ? '' : value.toString().trim());
  });
  return normalized;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = value.toString().trim().replace(/,/g, '').replace(/₹/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function getEffectiveStock(item) {
  const override = stockOverrides[item.alias] || {};
  const shop = override.shop !== undefined ? Number(override.shop) : Number(item.shop_stock || 0);
  const godown = override.godown !== undefined ? Number(override.godown) : Number(item.godown_stock || 0);
  return {
    shop: Number.isNaN(shop) ? 0 : shop,
    godown: Number.isNaN(godown) ? 0 : godown,
  };
}

function getBusyStock(item) {
  const value = item.busy_stock ?? item.total_stock ?? item.stock ?? null;
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function getTotalStock(item) {
  const busyStock = getBusyStock(item);
  if (busyStock !== null) return busyStock;
  const { shop, godown } = getEffectiveStock(item);
  return shop + godown;
}

function updateSummary(count, stockCount) {
  summary.textContent = `${count.toLocaleString()} products · Admin ${adminMode ? 'enabled' : 'off'}`;
  totalProducts.textContent = count.toLocaleString();
  totalStock.textContent = stockCount.toLocaleString();
  adminStatus.textContent = adminMode ? 'On' : 'Off';
}

async function syncInventory() {
  if (!DATA_SOURCE_URL) {
    showToast('Set DATA_SOURCE_URL in app.js to enable remote sync');
    return;
  }

  try {
    const updated = await fetchInventorySource(DATA_SOURCE_URL);
    products = Array.isArray(updated) ? updated : [];
    renderProductList();
    showToast('Busy data synchronized successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    showToast('Sync failed, see console for details');
  }
}

function createProductCard(item) {
  const copy = productTemplate.content.cloneNode(true);
  const card = copy.querySelector('.product-card');
  card.dataset.alias = item.alias;

  copy.querySelector('.product-name').textContent = item.name;
  copy.querySelector('.product-meta').textContent = `${item.alias} · ${item.group || 'General'} · ${item.barcode}`;
  copy.querySelector('.mrp').textContent = formatCurrency(item.mrp);
  copy.querySelector('.sale').textContent = formatCurrency(item.sale_price);
  copy.querySelector('.wholesale').textContent = formatCurrency(item.wholesale_price);
  copy.querySelector('.purchase-price').textContent = formatCurrency(item.purchase_price ?? 0);

  const { shop, godown } = getEffectiveStock(item);
  copy.querySelector('.shop-stock').textContent = shop.toString();
  copy.querySelector('.godown-stock').textContent = godown.toString();

  const busyStock = getBusyStock(item);
  const totalStock = getTotalStock(item);
  copy.querySelector('.total-stock').textContent = totalStock.toString();
  const busyField = copy.querySelector('.busy-stock-field');
  const busyValue = copy.querySelector('.busy-stock');
  if (busyStock !== null) {
    busyField.classList.remove('hidden');
    busyValue.textContent = busyStock.toString();
  } else {
    busyField.classList.add('hidden');
  }

  const printField = copy.querySelector('.print-field');
  if (item.print_name) {
    printField.classList.remove('hidden');
    copy.querySelector('.print-name').textContent = item.print_name;
  } else {
    printField.classList.add('hidden');
  }

  const stockLabel = copy.querySelector('.product-stock-label');
  stockLabel.textContent = busyStock !== null ? `Busy: ${busyStock}` : `Total: ${totalStock}`;
  if (totalStock === 0) {
    stockLabel.style.color = 'var(--danger)';
  }

  const purchaseField = copy.querySelector('.purchase-field');
  purchaseField.classList.toggle('hidden', !adminMode);

  const panel = copy.querySelector('.admin-panel');
  const editorWrapper = copy.querySelector('.product-values');
  const shopInput = copy.querySelector('.shop-input');
  const godownInput = copy.querySelector('.godown-input');
  const saveButton = copy.querySelector('.save-stock');
  const resetButton = copy.querySelector('.reset-stock');
  if (!adminMode) {
    panel.classList.add('hidden');
    editorWrapper.classList.add('hidden');
  } else {
    panel.classList.remove('hidden');
    editorWrapper.classList.remove('hidden');
  }

  const override = stockOverrides[item.alias] || {};
  shopInput.value = override.shop !== undefined ? override.shop : item.shop_stock || 0;
  godownInput.value = override.godown !== undefined ? override.godown : item.godown_stock || 0;

  saveButton.addEventListener('click', () => {
    const shopValue = Number(shopInput.value || 0);
    const godownValue = Number(godownInput.value || 0);
    stockOverrides[item.alias] = { shop: shopValue, godown: godownValue };
    saveStockOverrides();
    renderProductList();
    showToast(`Saved stock for ${item.alias}`);
  });

  resetButton.addEventListener('click', () => {
    delete stockOverrides[item.alias];
    saveStockOverrides();
    renderProductList();
    showToast(`Reset stock for ${item.alias}`);
  });

  if (!adminMode) {
    panel.classList.add('hidden');
  }

  return copy;
}

function sortProducts(list) {
  const criterion = sortSelect.value;
  return list.slice().sort((a, b) => {
    if (criterion === 'name') {
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    }
    if (criterion === 'priceAsc') {
      return Number(a.sale_price) - Number(b.sale_price);
    }
    if (criterion === 'priceDesc') {
      return Number(b.sale_price) - Number(a.sale_price);
    }
    if (criterion === 'shopDesc') {
      return getEffectiveStock(b).shop - getEffectiveStock(a).shop;
    }
    if (criterion === 'godownDesc') {
      return getEffectiveStock(b).godown - getEffectiveStock(a).godown;
    }
    if (criterion === 'stockDesc') {
      return getTotalStock(b) - getTotalStock(a);
    }
    return 0;
  });
}

function filterProducts() {
  const query = searchInput.value.trim().toLowerCase();
  let results = products;

  if (query) {
    results = products.filter(item => {
      const text = `${item.name} ${item.alias} ${item.barcode} ${item.group} ${item.brand}`.toLowerCase();
      return text.includes(query);
    });
  }

  return sortProducts(results);
}

function renderProductList() {
  productList.innerHTML = '';
  const filtered = filterProducts();
  const totalVisibleStock = filtered.reduce((sum, item) => sum + getTotalStock(item), 0);
  updateSummary(filtered.length, totalVisibleStock);
  if (filtered.length === 0) {
    productList.innerHTML = '<div class="empty-state">No products matched your search.</div>';
    return;
  }
  filtered.forEach(item => {
    const card = createProductCard(item);
    productList.appendChild(card);
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'page-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2000);
}

function toggleAdminMode(enabled) {
  adminMode = enabled;
  adminToggle.textContent = enabled ? 'Admin ON' : 'Admin';
  adminToggle.classList.toggle('active', enabled);
  renderProductList();
}

function openAdminModal() {
  adminMessage.textContent = '';
  adminPin.value = '';
  adminModal.classList.remove('hidden');
  adminPin.focus();
}

function closeAdminDialog() {
  adminModal.classList.add('hidden');
}

adminToggle.addEventListener('click', () => {
  if (adminMode) {
    toggleAdminMode(false);
    showToast('Admin mode turned off');
    return;
  }
  openAdminModal();
});

closeAdminModal.addEventListener('click', closeAdminDialog);
adminSubmit.addEventListener('click', () => {
  if (adminPin.value === ADMIN_PIN) {
    toggleAdminMode(true);
    closeAdminDialog();
    showToast('Admin unlocked');
  } else {
    adminMessage.textContent = 'Incorrect PIN';
    adminPin.classList.add('error');
    setTimeout(() => {
      adminPin.classList.remove('error');
    }, 800);
  }
});

adminPin.addEventListener('keydown', event => {
  if (event.key === 'Enter') adminSubmit.click();
});

clearFilters.addEventListener('click', () => {
  searchInput.value = '';
  sortSelect.value = 'default';
  renderProductList();
});

syncButton.addEventListener('click', syncInventory);
searchInput.addEventListener('input', renderProductList);
sortSelect.addEventListener('change', renderProductList);

loadProducts();

