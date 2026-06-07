const ADMIN_PIN = '7865';
const STORAGE_KEY = 'sr-nanded-stock';

const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearFilters = document.getElementById('clearFilters');
const adminToggle = document.getElementById('adminToggle');
const adminModal = document.getElementById('adminModal');
const closeAdminModal = document.getElementById('closeAdminModal');
const adminSubmit = document.getElementById('adminSubmit');
const adminPin = document.getElementById('adminPin');
const adminMessage = document.getElementById('adminMessage');
const summary = document.getElementById('summary');
const productList = document.getElementById('productList');
const productTemplate = document.getElementById('productTemplate');

const DATA_SOURCE_URL = null; // Set this to a JSON URL for future auto-sync
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
      const response = await fetch(DATA_SOURCE_URL);
      if (!response.ok) throw new Error('Network response not ok');
      products = await response.json();
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

function getEffectiveStock(item) {
  const override = stockOverrides[item.alias] || {};
  const shop = override.shop !== undefined ? Number(override.shop) : Number(item.shop_stock || 0);
  const godown = override.godown !== undefined ? Number(override.godown) : Number(item.godown_stock || 0);
  return {
    shop: Number.isNaN(shop) ? 0 : shop,
    godown: Number.isNaN(godown) ? 0 : godown,
  };
}

function getTotalStock(item) {
  const { shop, godown } = getEffectiveStock(item);
  return shop + godown;
}

function updateSummary(count) {
  summary.textContent = `${count.toLocaleString()} products · Admin ${adminMode ? 'enabled' : 'off'}`;
}

function createProductCard(item) {
  const copy = productTemplate.content.cloneNode(true);
  const card = copy.querySelector('.product-card');
  card.dataset.alias = item.alias;

  copy.querySelector('.product-name').textContent = item.name;
  copy.querySelector('.product-meta').textContent = `${item.alias} Â· ${item.group} Â· ${item.barcode}`;
  copy.querySelector('.mrp').textContent = formatCurrency(item.mrp);
  copy.querySelector('.sale').textContent = formatCurrency(item.sale_price);
  copy.querySelector('.wholesale').textContent = formatCurrency(item.wholesale_price);

  const { shop, godown } = getEffectiveStock(item);
  copy.querySelector('.shop-stock').textContent = shop.toString();
  copy.querySelector('.godown-stock').textContent = godown.toString();
  copy.querySelector('.total-stock').textContent = getTotalStock(item).toString();

  const stockLabel = copy.querySelector('.product-stock-label');
  stockLabel.textContent = `Total: ${getTotalStock(item)}`;
  if (getTotalStock(item) === 0) {
    stockLabel.style.color = 'var(--red)';
  }

  const panel = copy.querySelector('.admin-panel');
  const shopInput = copy.querySelector('.shop-input');
  const godownInput = copy.querySelector('.godown-input');
  const saveButton = copy.querySelector('.save-stock');
  const resetButton = copy.querySelector('.reset-stock');

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
  updateSummary(filtered.length);
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

searchInput.addEventListener('input', renderProductList);
sortSelect.addEventListener('change', renderProductList);

loadProducts();

