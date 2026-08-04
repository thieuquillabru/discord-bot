const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ── In-memory cache with write-behind ─────────────────────────
let _cache = null;
let _dirty = false;
let _saveTimer = null;
const SAVE_DELAY_MS = 1500;

function _load() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    _cache = [];
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(_cache, null, 2));
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
    try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(_cache, null, 2)); } catch (e) { console.error('Orders save error:', e); }
  }, SAVE_DELAY_MS);
}

function _flushSync() {
  _dirty = false;
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (_cache) {
    try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(_cache, null, 2)); } catch (e) { console.error('Orders flush error:', e); }
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  delivered: 'Livré',
  cancelled: 'Annulé',
};
const STATUS_COLORS = {
  pending: '#FFE156',
  confirmed: '#00f0ff',
  delivered: '#0aff7f',
  cancelled: '#ff1744',
};

/**
 * Create a new order from a payment verification
 */
function create({ productId, productName, productPrice, productImage, userId, username, senderNumber, emailSent, emailTo }) {
  const orders = _load();
  const order = {
    id: generateId(),
    productId: productId || '',
    productName: productName || 'Inconnu',
    productPrice: productPrice || 0,
    productImage: productImage || '',
    userId: userId || '',
    username: username || 'Inconnu',
    senderNumber: senderNumber || '',
    emailSent: !!emailSent,
    emailTo: emailTo || '',
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  orders.unshift(order);
  _scheduleSave();
  return order;
}

/**
 * Get all orders, optionally filtered by status
 */
function getAll(filter) {
  const orders = _load();
  if (filter && filter !== 'all') {
    return orders.filter(o => o.status === filter);
  }
  return orders;
}

/**
 * Get a single order by ID
 */
function getById(id) {
  return _load().find(o => o.id === id) || null;
}

/**
 * Update order status
 */
function updateStatus(id, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) return null;
  const orders = _load();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx].status = newStatus;
  orders[idx].updatedAt = Date.now();
  _scheduleSave();
  return orders[idx];
}

/**
 * Add a note to an order
 */
function addNote(id, note) {
  const orders = _load();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  if (!orders[idx].notes) orders[idx].notes = [];
  orders[idx].notes.push({ text: note, at: Date.now() });
  orders[idx].updatedAt = Date.now();
  _scheduleSave();
  return orders[idx];
}

/**
 * Delete an order
 */
function remove(id) {
  const orders = _load();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orders.splice(idx, 1);
  _scheduleSave();
  return true;
}

/**
 * Get order statistics
 */
function getStats() {
  const all = _load();
  return {
    total: all.length,
    pending: all.filter(o => o.status === 'pending').length,
    confirmed: all.filter(o => o.status === 'confirmed').length,
    delivered: all.filter(o => o.status === 'delivered').length,
    cancelled: all.filter(o => o.status === 'cancelled').length,
    totalRevenue: all.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.productPrice || 0), 0),
  };
}

module.exports = {
  create, getAll, getById, updateStatus, addNote, remove, getStats,
  VALID_STATUSES, STATUS_LABELS, STATUS_COLORS,
  _flushSync,
};
