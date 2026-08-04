const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// ── In-memory file cache with write-behind ──────────────────────
// Each file is cached: key = filename, value = { data, dirty, timer }
const fileCache = new Map();
const SAVE_DELAY_MS = 2000;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// ── Cached file read/write ──────────────────────────────────────
function _getCached(file) {
  const cached = fileCache.get(file);
  if (cached) return cached;
  ensureDataDir();
  const filePath = path.join(dataDir, file + '.json');
  let data = {};
  if (fs.existsSync(filePath)) {
    try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { console.error(`Error reading ${file}.json:`, e); }
  }
  const entry = { data, dirty: false, timer: null };
  fileCache.set(file, entry);
  return entry;
}

function _scheduleWrite(file, entry) {
  if (entry.dirty) return;
  entry.dirty = true;
  if (entry.timer) return;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    if (!entry.dirty) return;
    entry.dirty = false;
    ensureDataDir();
    const filePath = path.join(dataDir, file + '.json');
    try { fs.writeFileSync(filePath, JSON.stringify(entry.data, null, 2), 'utf8'); } catch (e) { console.error(`Error writing ${file}.json:`, e); }
  }, SAVE_DELAY_MS);
}

function _flushAllSync() {
  for (const [file, entry] of fileCache) {
    if (!entry.dirty) continue;
    entry.dirty = false;
    if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; }
    ensureDataDir();
    const filePath = path.join(dataDir, file + '.json');
    try { fs.writeFileSync(filePath, JSON.stringify(entry.data, null, 2), 'utf8'); } catch (e) { console.error(`Flush error ${file}.json:`, e); }
  }
}

// ── Public API (same as before but cached) ──────────────────────
function getData(file) {
  return _getCached(file).data;
}

function saveData(file, data) {
  const entry = _getCached(file);
  entry.data = data;
  _scheduleWrite(file, entry);
}

function getUser(file, guildId, userId) {
  const entry = _getCached(file);
  if (!entry.data[guildId]) entry.data[guildId] = {};
  if (!entry.data[guildId][userId]) {
    entry.data[guildId][userId] = { money: 0, bank: 0, xp: 0, inventory: [], lastDaily: 0, dailyStreak: 0 };
    _scheduleWrite(file, entry);
  }
  return entry.data[guildId][userId];
}

function setUser(file, guildId, userId, userData) {
  const entry = _getCached(file);
  if (!entry.data[guildId]) entry.data[guildId] = {};
  entry.data[guildId][userId] = userData;
  _scheduleWrite(file, entry);
}

function getGuild(file, guildId) {
  const entry = _getCached(file);
  if (!entry.data[guildId]) {
    entry.data[guildId] = {};
    _scheduleWrite(file, entry);
  }
  return entry.data[guildId];
}

function setGuild(file, guildId, guildData) {
  const entry = _getCached(file);
  entry.data[guildId] = guildData;
  _scheduleWrite(file, entry);
}

function getTop(file, guildId, key, limit = 10) {
  const data = _getCached(file).data;
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

// ─── Cooldown tracking with periodic cleanup ──────────────────────
const cooldowns = new Map();
let _cooldownCleanupTimer = null;

function _startCooldownCleanup() {
  if (_cooldownCleanupTimer) return;
  _cooldownCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cooldowns) {
      // Remove entries older than 10 minutes
      if (now - v > 600000) cooldowns.delete(k);
    }
  }, 60000); // Clean every minute
}

function checkCooldown(guildId, userId, action, cooldownMs) {
  _startCooldownCleanup();
  const key = `${guildId}:${userId}:${action}`;
  const now = Date.now();

  const lastUsed = cooldowns.get(key);
  if (lastUsed && now - lastUsed < cooldownMs) {
    return true;
  }

  cooldowns.set(key, now);
  return false;
}

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

function ensureShop(guildId) {
  const shopData = getData('shop');
  if (!shopData[guildId]) {
    shopData[guildId] = JSON.parse(JSON.stringify(DEFAULT_SHOP_ITEMS));
    saveData('shop', shopData);
  }
  return shopData[guildId];
}

module.exports = {
  getData, saveData, getUser, setUser, getGuild, setGuild, getTop,
  addMoney, getMoney, setMoney, addBank, getBank,
  addToInventory, getInventory, removeFromInventory,
  addXP, getXP, getLevel, getXPForLevel,
  checkCooldown, getRemainingCooldown,
  DEFAULT_SHOP_ITEMS, ensureShop,
  _flushAllSync,
};
