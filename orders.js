const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.join(__dirname, 'orders.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

function save(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
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
  const orders = load();
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
  save(orders);
  return order;
}

/**
 * Get all orders, optionally filtered by status
 */
function getAll(filter) {
  const orders = load();
  if (filter && filter !== 'all') {
    return orders.filter(o => o.status === filter);
  }
  return orders;
}

/**
 * Get a single order by ID
 */
function getById(id) {
  return load().find(o => o.id === id) || null;
}

/**
 * Update order status
 */
function updateStatus(id, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) return null;
  const orders = load();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx].status = newStatus;
  orders[idx].updatedAt = Date.now();
  save(orders);
  return orders[idx];
}

/**
 * Add a note to an order
 */
function addNote(id, note) {
  const orders = load();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  if (!orders[idx].notes) orders[idx].notes = [];
  orders[idx].notes.push({ text: note, at: Date.now() });
  orders[idx].updatedAt = Date.now();
  save(orders);
  return orders[idx];
}

/**
 * Delete an order
 */
function remove(id) {
  const orders = load();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orders.splice(idx, 1);
  save(orders);
  return true;
}

/**
 * Get order statistics
 */
function getStats() {
  const all = load();
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
};
