const fs = require('fs');
const path = require('path');

const SHOP_FILE = path.join(__dirname, 'shop_products.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
  } catch {
    const empty = [];
    fs.writeFileSync(SHOP_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
}

function save(products) {
  fs.writeFileSync(SHOP_FILE, JSON.stringify(products, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getAll() {
  return load();
}

function getActive() {
  return load().filter(p => p.active !== false);
}

function getById(id) {
  return load().find(p => p.id === id) || null;
}

function add(product) {
  const products = load();
  const newProduct = {
    id: generateId(),
    name: product.name || 'Sans nom',
    description: product.description || '',
    price: Number(product.price) || 0,
    image: product.image || '',
    category: product.category || 'Général',
    stock: product.stock === undefined || product.stock === null ? -1 : Number(product.stock),
    active: true,
    createdAt: Date.now(),
  };
  products.push(newProduct);
  save(products);
  return newProduct;
}

function update(id, updates) {
  const products = load();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'description', 'price', 'image', 'category', 'stock', 'active'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'price') products[idx][key] = Number(updates[key]);
      else if (key === 'stock') products[idx][key] = updates[key] === null ? -1 : Number(updates[key]);
      else if (key === 'active') products[idx][key] = !!updates[key];
      else products[idx][key] = updates[key];
    }
  }
  products[idx].updatedAt = Date.now();
  save(products);
  return products[idx];
}

function remove(id) {
  const products = load();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  save(products);
  return true;
}

function reorder(ids) {
  const products = load();
  const reordered = [];
  for (const id of ids) {
    const p = products.find(pr => pr.id === id);
    if (p) reordered.push(p);
  }
  const remaining = products.filter(p => !ids.includes(p.id));
  const result = [...reordered, ...remaining];
  save(result);
  return result;
}

function getStats() {
  const all = load();
  const active = all.filter(p => p.active !== false);
  return {
    total: all.length,
    active: active.length,
    categories: [...new Set(active.map(p => p.category))],
    priceRange: active.length ? [Math.min(...active.map(p => p.price)), Math.max(...active.map(p => p.price))] : [0, 0],
  };
}

module.exports = { getAll, getActive, getById, add, update, remove, reorder, getStats };
