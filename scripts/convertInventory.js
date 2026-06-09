const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const sourceUrl = process.env.INVENTORY_DATA_URL || 'https://raw.githubusercontent.com/srfashionned/sr-fashion-nanded/main/items.json';

function fetchText(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) return reject(new Error('Too many redirects'));
    const request = url.startsWith('https://') ? https.get : http.get;
    request(url, res => {
      const statusCode = res.statusCode;
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        return resolve(fetchText(new URL(res.headers.location, url).toString(), redirectCount + 1));
      }
      if (statusCode !== 200) {
        return reject(new Error(`HTTP ${statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function normalizeHeader(header) {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_');
}

function normalizeFieldName(key) {
  const map = {
    product_code: 'alias',
    item_code: 'alias',
    code: 'alias',
    sku: 'alias',
    upc: 'barcode',
    total_stock: 'busy_stock',
    stock: 'busy_stock',
    quantity: 'busy_stock',
    purchase: 'purchase_price',
    cost_price: 'purchase_price',
    printname: 'print_name',
    print: 'print_name',
    category: 'group',
    group_name: 'group',
    sale: 'sale_price',
    mrp_value: 'mrp'
  };
  return map[key] || key;
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const raw = value.toString().trim().replace(/,/g, '').replace(/₹/g, '');
  if (raw === '') return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function normalizeInventoryItem(item) {
  const normalized = {};
  Object.keys(item).forEach(key => {
    const raw = item[key];
    const normalizedKey = normalizeHeader(key);
    const mappedKey = normalizeFieldName(normalizedKey);
    if (['mrp', 'sale_price', 'wholesale_price', 'purchase_price', 'shop_stock', 'godown_stock', 'busy_stock', 'total_stock'].includes(mappedKey)) {
      normalized[mappedKey] = parseNumber(raw);
    } else {
      normalized[mappedKey] = raw === null || raw === undefined ? '' : raw.toString().trim();
    }
  });
  return normalized;
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

function csvToObjects(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] !== undefined ? row[index].trim().replace(/^"|"$/g, '') : '';
    });
    return normalizeInventoryItem(item);
  }).filter(item => item.alias || item.name);
}

function normalizeInventoryCollection(data) {
  if (Array.isArray(data)) return data;
  const arrayValue = Object.values(data).find(Array.isArray);
  return Array.isArray(arrayValue) ? arrayValue : [];
}

async function main() {
  try {
    console.log(`Fetching inventory from ${sourceUrl}`);
    const content = await fetchText(sourceUrl);
    const isJson = sourceUrl.toLowerCase().endsWith('.json');
    let items = [];

    if (isJson) {
      const parsed = JSON.parse(content);
      const loaded = Array.isArray(parsed) ? parsed : normalizeInventoryCollection(parsed);
      items = loaded.map(normalizeInventoryItem);
    } else {
      items = csvToObjects(content);
    }

    fs.writeFileSync('items.json', JSON.stringify(items, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${items.length} products to items.json`);
  } catch (error) {
    console.warn('Remote inventory fetch failed, using local fallback items.json:', error.message || error);
    if (fs.existsSync('items.json')) {
      const fallback = fs.readFileSync('items.json', 'utf8');
      fs.writeFileSync('items.json', fallback, 'utf8');
      console.log('Kept existing items.json as fallback.');
      return;
    }
    console.error('Inventory sync failed:', error.message || error);
    process.exit(1);
  }
}

main();
