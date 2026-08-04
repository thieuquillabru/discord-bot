const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// Cooldown tracking in memory
const cooldowns = new Map();

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Read and parse JSON from data/{file}.json
 * @param {string} file
 * @returns {Object}
 */
function getData(file) {
  ensureDataDir();
  const filePath = path.join(dataDir, file + '.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${file}.json:`, e);
    return {};
  }
}

/**
 * Write JSON to data/{file}.json with pretty print
 * @param {string} file
 * @param {Object} data
 */
function saveData(file, data) {
  ensureDataDir();
  const filePath = path.join(dataDir, file + '.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get user data, auto-creates with defaults
 * @param {string} file
 * @param {string} guildId
 * @param {string} userId
 * @returns {Object}
 */
function getUser(file, guildId, userId) {
  const data = getData(file);
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) {
    data[guildId][userId] = { money: 0, bank: 0, xp: 0, inventory: [], lastDaily: 0, dailyStreak: 0 };
    saveData(file, data);
  }
  return data[guildId][userId];
}

/**
 * Set user data
 * @param {string} file
 * @param {string} guildId
 * @param {string} userId
 * @param {Object} userData
 */
function setUser(file, guildId, userId, userData) {
  const data = getData(file);
  if (!data[guildId]) data[guildId] = {};
  data[guildId][userId] = userData;
  saveData(file, data);
}

/**
 * Get guild data, auto-creates
 * @param {string} file
 * @param {string} guildId
 * @returns {Object}
 */
function getGuild(file, guildId) {
  const data = getData(file);
  if (!data[guildId]) {
    data[guildId] = {};
    saveData(file, data);
  }
  return data[guildId];
}

/**
 * Set guild data
 * @param {string} file
 * @param {string} guildId
 * @param {Object} guildData
 */
function setGuild(file, guildId, guildData) {
  const data = getData(file);
  data[guildId] = guildData;
  saveData(file, data);
}

/**
 * Get top users by a numeric key
 * @param {string} file
 * @param {string} guildId
 * @param {string} key
 * @param {number} limit
 * @returns {Array<{userId, value}>}
 */
function getTop(file, guildId, key, limit = 10) {
  const data = getData(file);
  const guildData = data[guildId] || {};
  const entries = [];
  for (const [userId, userData] of Object.entries(guildData)) {
    if (userData && typeof userData[key] === 'number') {
      entries.push({ userId, value: userData[key] });
    }
  }
  entries.sort((a, b) => b.value - a.value);
  return entries.slice(0, limit);
}

// ─── Economy helpers ───────────────────────────────────────────────

function addMoney(guildId, userId, amount) {
  const userData = getUser('economy', guildId, userId);
  userData.money = (userData.money || 0) + amount;
  setUser('economy', guildId, userId, userData);
  return userData.money;
}

function getMoney(guildId, userId) {
  const userData = getUser('economy', guildId, userId);
  return userData.money || 0;
}

function setMoney(guildId, userId, amount) {
  const userData = getUser('economy', guildId, userId);
  userData.money = amount;
  setUser('economy', guildId, userId, userData);
  return userData.money;
}

function addBank(guildId, userId, amount) {
  const userData = getUser('economy', guildId, userId);
  userData.bank = (userData.bank || 0) + amount;
  setUser('economy', guildId, userId, userData);
  return userData.bank;
}

function getBank(guildId, userId) {
  const userData = getUser('economy', guildId, userId);
  return userData.bank || 0;
}

function addToInventory(guildId, userId, item) {
  const userData = getUser('economy', guildId, userId);
  if (!userData.inventory) userData.inventory = [];
  userData.inventory.push(item);
  setUser('economy', guildId, userId, userData);
  return userData.inventory;
}

function getInventory(guildId, userId) {
  const userData = getUser('economy', guildId, userId);
  return userData.inventory || [];
}

function removeFromInventory(guildId, userId, index) {
  const userData = getUser('economy', guildId, userId);
  if (!userData.inventory) userData.inventory = [];
  if (index < 0 || index >= userData.inventory.length) return null;
  const removed = userData.inventory.splice(index, 1)[0];
  setUser('economy', guildId, userId, userData);
  return removed;
}

function addXP(guildId, userId, amount) {
  const userData = getUser('economy', guildId, userId);
  userData.xp = (userData.xp || 0) + amount;
  setUser('economy', guildId, userId, userData);
  return getXP(guildId, userId);
}

function getXP(guildId, userId) {
  const userData = getUser('economy', guildId, userId);
  const xp = userData.xp || 0;
  const level = getLevel(xp);
  return { xp, level };
}

function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function getXPForLevel(level) {
  return level * level * 100;
}

// ─── Cooldown tracking ─────────────────────────────────────────────

/**
 * Check if user is on cooldown for an action
 * @param {string} guildId
 * @param {string} userId
 * @param {string} action
 * @param {number} cooldownMs
 * @returns {boolean} true if on cooldown, false if ready
 */
function checkCooldown(guildId, userId, action, cooldownMs) {
  const key = `${guildId}:${userId}:${action}`;
  const now = Date.now();

  // Auto-cleanup expired cooldowns periodically
  if (cooldowns.size > 10000) {
    for (const [k, v] of cooldowns) {
      if (now - v > cooldownMs * 2) cooldowns.delete(k);
    }
  }

  const lastUsed = cooldowns.get(key);
  if (lastUsed && now - lastUsed < cooldownMs) {
    return true;
  }

  cooldowns.set(key, now);
  return false;
}

/**
 * Get remaining cooldown time in ms
 * @param {string} guildId
 * @param {string} userId
 * @param {string} action
 * @param {number} cooldownMs
 * @returns {number} remaining ms, 0 if not on cooldown
 */
function getRemainingCooldown(guildId, userId, action, cooldownMs) {
  const key = `${guildId}:${userId}:${action}`;
  const now = Date.now();
  const lastUsed = cooldowns.get(key);
  if (!lastUsed) return 0;
  const remaining = cooldownMs - (now - lastUsed);
  return remaining > 0 ? remaining : 0;
}

// ─── Default shop items ────────────────────────────────────────────

const DEFAULT_SHOP_ITEMS = [
  { id: 1, name: 'Épée rouillée', emoji: '🗡️', price: 100, type: 'weapon', rarity: 'common', description: 'Une vieille épée couverte de rouille. Mieux que rien.' },
  { id: 2, name: 'Bouclier en bois', emoji: '🛡️', price: 150, type: 'shield', rarity: 'common', description: 'Un bouclier simple en bois. Offre une protection basique.' },
  { id: 3, name: 'Potion de chance', emoji: '🧪', price: 200, type: 'potion', rarity: 'uncommon', description: 'Augmente temporairement votre chance.' },
  { id: 4, name: 'Anneau de fortune', emoji: '💍', price: 300, type: 'ring', rarity: 'uncommon', description: 'Un anneau qui attire la richesse.' },
  { id: 5, name: 'Épée de fer', emoji: '⚔️', price: 500, type: 'weapon', rarity: 'rare', description: 'Une épée en fer solide et bien équilibrée.' },
  { id: 6, name: 'Médaille d\'honneur', emoji: '🏆', price: 750, type: 'collectible', rarity: 'rare', description: 'Une médaille prestigieuse. Symbole de bravoure.' },
  { id: 7, name: 'Élixir de force', emoji: '🧬', price: 1000, type: 'potion', rarity: 'epic', description: 'Confère une force surhumaine temporaire.' },
  { id: 8, name: 'Couronne royale', emoji: '💎', price: 2500, type: 'collectible', rarity: 'epic', description: 'Une couronne ornée de bijoux. Le pouvoir absolu.' },
  { id: 9, name: 'Épée légendaire', emoji: '⚡', price: 5000, type: 'weapon', rarity: 'legendary', description: 'Une épée légendaire aux pouvoirs mystiques.' },
  { id: 10, name: 'Sceptre divin', emoji: '🌟', price: 10000, type: 'weapon', rarity: 'legendary', description: 'Un sceptre d\'une puissance divine inégalée.' },
];

/**
 * Ensure shop exists for a guild, initialize with defaults if not
 * @param {string} guildId
 * @returns {Array}
 */
function ensureShop(guildId) {
  const shopData = getData('shop');
  if (!shopData[guildId]) {
    shopData[guildId] = JSON.parse(JSON.stringify(DEFAULT_SHOP_ITEMS));
    saveData('shop', shopData);
  }
  return shopData[guildId];
}

module.exports = {
  getData,
  saveData,
  getUser,
  setUser,
  getGuild,
  setGuild,
  getTop,
  addMoney,
  getMoney,
  setMoney,
  addBank,
  getBank,
  addToInventory,
  getInventory,
  removeFromInventory,
  addXP,
  getXP,
  getLevel,
  getXPForLevel,
  checkCooldown,
  getRemainingCooldown,
  DEFAULT_SHOP_ITEMS,
  ensureShop,
};
