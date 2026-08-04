const fs = require('fs');
const path = require('path');

const SHOP_FILE = path.join(__dirname, 'shop_products.json');

// ── In-memory cache with write-behind ─────────────────────────
let _cache = null;
let _dirty = false;
let _saveTimer = null;
const SAVE_DELAY_MS = 1500;

function _load() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
  } catch {
    _cache = [];
    fs.writeFileSync(SHOP_FILE, JSON.stringify(_cache, null, 2));
  }
  return _cache;
}

function _scheduleSave() {
  if (_dirty) return;
  _dirty = true;
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    if (!_dirty || !_cache) return;
    _dirty = false;
    try { fs.writeFileSync(SHOP_FILE, JSON.stringify(_cache, null, 2)); } catch (e) { console.error('Shop save error:', e); }
  }, SAVE_DELAY_MS);
}

function _flushSync() {
  _dirty = false;
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (_cache) {
    try { fs.writeFileSync(SHOP_FILE, JSON.stringify(_cache, null, 2)); } catch (e) { console.error('Shop flush error:', e); }
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getAll() {
  return [..._load()]; // return copy to prevent mutation
}

function getActive() {
  return _load().filter(p => p.active !== false);
}

function getById(id) {
  return _load().find(p => p.id === id) || null;
}

function _sanitizeImageUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Only allow http(s) URLs — Discord embeds reject data URIs
  if (/^https?:\/\//i.test(trimmed) && trimmed.length <= 2048) return trimmed;
  return '';
}

function add(product) {
  const products = _load();
  const newProduct = {
    id: generateId(),
    name: product.name || 'Sans nom',
    description: product.description || '',
    price: Number(product.price) || 0,
    image: _sanitizeImageUrl(product.image),
    category: product.category || 'Général',
    stock: product.stock === undefined || product.stock === null ? -1 : Number(product.stock),
    active: true,
    createdAt: Date.now(),
  };
  products.push(newProduct);
  _scheduleSave();
  return newProduct;
}

function update(id, updates) {
  const products = _load();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'description', 'price', 'image', 'category', 'stock', 'active'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'price') products[idx][key] = Number(updates[key]);
      else if (key === 'stock') products[idx][key] = updates[key] === null ? -1 : Number(updates[key]);
      else if (key === 'active') products[idx][key] = !!updates[key];
      else if (key === 'image') products[idx][key] = _sanitizeImageUrl(updates[key]);
      else products[idx][key] = updates[key];
    }
  }
  products[idx].updatedAt = Date.now();
  _scheduleSave();
  return products[idx];
}

function remove(id) {
  const products = _load();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  _scheduleSave();
  return true;
}

function reorder(ids) {
  const products = _load();
  const reordered = [];
  for (const id of ids) {
    const p = products.find(pr => pr.id === id);
    if (p) reordered.push(p);
  }
  const remaining = products.filter(p => !ids.includes(p.id));
  const result = [...reordered, ...remaining];
  _cache = result;
  _scheduleSave();
  return result;
}

function getStats() {
  const all = _load();
  const active = all.filter(p => p.active !== false);
  return {
    total: all.length,
    active: active.length,
    categories: [...new Set(active.map(p => p.category))],
    priceRange: active.length ? [Math.min(...active.map(p => p.price)), Math.max(...active.map(p => p.price))] : [0, 0],
  };
}

module.exports = { getAll, getActive, getById, add, update, remove, reorder, getStats, _flushSync };
