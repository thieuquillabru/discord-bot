const fs = require('fs');
const path = require('path');

const FEATURES_FILE = path.join(__dirname, 'features.json');

const FEATURE_DEFINITIONS = {
  moderation: {
    label: 'Mod\u00e9ration',
    description: 'Kick, Ban, Mute, Warn, Clear, Lock, Unlock, Slowmode',
    icon: 'shield',
    color: '#E74C3C',
    commands: ['kick', 'ban', 'mute', 'unmute', 'warn', 'clear', 'lock', 'unlock', 'slowmode'],
    settings: {
      modRole: { type: 'text', label: 'R\u00f4le mod\u00e9rateur (ID)', default: '' },
      logChannel: { type: 'text', label: 'Salon de logs mod\u00e9ration (ID)', default: '' },
      defaultClearAmount: { type: 'number', label: 'Nombre par d\u00e9faut (clear)', default: 10, min: 1, max: 100 },
      muteRole: { type: 'text', label: 'R\u00f4le mute (ID)', default: '' },
    },
  },
  welcome: {
    label: 'Bienvenue',
    description: 'Message automatique quand un membre rejoint le serveur',
    icon: 'waving_hand',
    color: '#2ECC71',
    commands: [],
    settings: {
      channel: { type: 'text', label: 'Salon de bienvenue (ID)', default: '' },
      message: { type: 'textarea', label: 'Message de bienvenue', default: 'Bienvenue {member} sur **{server}** ! \nNous sommes maintenant **{count}** membres.' },
      dmEnabled: { type: 'boolean', label: 'Envoyer en MP aussi', default: false },
    },
  },
  tickets: {
    label: 'Tickets',
    description: 'Cr\u00e9ation et gestion de tickets de support',
    icon: 'confirmation_number',
    color: '#F39C12',
    commands: ['ticket'],
    settings: {
      category: { type: 'text', label: 'Cat\u00e9gorie tickets (ID)', default: '' },
      supportRole: { type: 'text', label: 'R\u00f4le support (ID)', default: '' },
      ticketLogChannel: { type: 'text', label: 'Salon de logs tickets (ID)', default: '' },
    },
  },
  fun: {
    label: 'Fun',
    description: '8ball, Dice, Meme, RPS, Snipe, Joke, Couple',
    icon: 'sports_esports',
    color: '#9B59B6',
    commands: ['8ball', 'dice', 'meme', 'rps', 'snipe', 'joke', 'couple'],
    settings: {
      memeSubreddit: { type: 'text', label: 'Subreddit m\u00e8mes', default: 'memes' },
    },
  },
  economy: {
    label: '\u00c9conomie',
    description: 'Daily, Work, Rob, Beg, Pay, Money, Bank, Shop, Buy, Inventory, Item, TopMoney, DropMoney',
    icon: 'paid',
    color: '#FFD700',
    commands: ['daily', 'work', 'rob', 'beg', 'pay', 'money', 'bank', 'shop', 'buy', 'inventory', 'item', 'topmoney', 'dropmoney'],
    settings: {
      startingBalance: { type: 'number', label: 'Solde de d\u00e9part', default: 1000, min: 0 },
      dailyAmount: { type: 'number', label: 'R\u00e9compense daily', default: 500, min: 0 },
      workMin: { type: 'number', label: 'Gain min (work)', default: 100, min: 0 },
      workMax: { type: 'number', label: 'Gain max (work)', default: 500, min: 0 },
      robSuccessRate: { type: 'number', label: 'Taux succ\u00e8s rob (%)', default: 30, min: 0, max: 100 },
      bankInterest: { type: 'number', label: 'Int\u00e9r\u00eat banque (%/jour)', default: 0, min: 0, max: 100 },
      currency: { type: 'text', label: 'Nom de la monnaie', default: 'coins' },
    },
  },
  levels: {
    label: 'Niveaux / XP',
    description: 'Level, TopLevel, Profile, Description, Rewards, DropXP, AdminXP + XP automatique',
    icon: 'trending_up',
    color: '#00BCD4',
    commands: ['level', 'toplevel', 'profile', 'description', 'rewards', 'dropxp', 'adminxp'],
    settings: {
      xpPerMessage: { type: 'number', label: 'XP par message', default: 15, min: 1, max: 500 },
      xpMinLength: { type: 'number', label: 'Longueur min message', default: 5, min: 1 },
      xpCooldown: { type: 'number', label: 'Cooldown XP (secondes)', default: 30, min: 0 },
      levelUpMessage: { type: 'boolean', label: 'Message de level up', default: true },
      levelUpChannel: { type: 'text', label: 'Salon level up (ID, vide = courant)', default: '' },
    },
  },
  gambling: {
    label: 'Jeux d\'argent',
    description: 'CoinFlip, Slots, Roulette',
    icon: 'casino',
    color: '#FF5722',
    commands: ['coinflip', 'slots', 'roulette'],
    settings: {
      minBet: { type: 'number', label: 'Mise minimum', default: 10, min: 1 },
      maxBet: { type: 'number', label: 'Mise maximum', default: 100000, min: 1 },
      coinflipMultiplier: { type: 'number', label: 'Multiplicateur coinflip', default: 1.9, min: 1, max: 10 },
    },
  },
  games: {
    label: 'Jeux multijoueurs',
    description: 'Tic-Tac-Toe, Pendu, D\u00e9mineur, Puissance 4',
    icon: 'videogame_asset',
    color: '#E91E63',
    commands: ['tictactoe', 'hangman', 'minesweeper', 'connect4'],
    settings: {
      timeout: { type: 'number', label: 'Timeout parties (secondes)', default: 60, min: 10, max: 600 },
    },
  },
  social: {
    label: 'Social / \u00c9v\u00e9nements',
    description: 'Giveaway, Interact, Suggest, Survey, Birthday',
    icon: 'groups',
    color: '#4CAF50',
    commands: ['giveaway', 'interact', 'suggest', 'survey', 'birthday'],
    settings: {
      giveawayChannel: { type: 'text', label: 'Salon giveaways (ID)', default: '' },
      suggestChannel: { type: 'text', label: 'Salon suggestions (ID)', default: '' },
      birthdayChannel: { type: 'text', label: 'Salon anniversaires (ID)', default: '' },
    },
  },
  utility: {
    label: 'Utilitaires bot',
    description: 'Help, Ping, Userinfo, Serverinfo, Avatar, Remind, Poll, Setup',
    icon: 'build',
    color: '#3498DB',
    commands: ['help', 'ping', 'userinfo', 'serverinfo', 'avatar', 'remind', 'poll', 'setup'],
    settings: {
      prefix: { type: 'text', label: 'Pr\u00e9fixe bot', default: '/' },
    },
  },
  utilitaires: {
    label: 'Outils avanc\u00e9s',
    description: 'Color, Embed, Maths, Say, Timestamp, QRCode, React, Role, Backup, SuggestMod',
    icon: 'settings',
    color: '#607D8B',
    commands: ['color', 'embed', 'maths', 'say', 'timestamp', 'qrcode', 'react', 'role', 'backup', 'suggestmod'],
    settings: {
      embedChannel: { type: 'text', label: 'Salon embed par d\u00e9faut (ID)', default: '' },
    },
  },
  messagelog: {
    label: 'Log messages',
    description: 'Sauvegarde les messages supprim\u00e9s (snipe)',
    icon: 'delete_sweep',
    color: '#1ABC9C',
    commands: [],
    settings: {
      logChannel: { type: 'text', label: 'Salon de logs (ID)', default: '' },
      ignoreBots: { type: 'boolean', label: 'Ignorer les bots', default: true },
      maxSnipes: { type: 'number', label: 'Max messages sauvegard\u00e9s', default: 50, min: 5, max: 500 },
    },
  },
  antiraid: {
    label: 'Anti-Raid',
    description: 'Protection compl\u00e8te anti-raid : \u00e2ge compte, avatar, spam, mentions, invitations, raid mode',
    icon: 'security',
    color: '#FF1744',
    commands: ['antiraid'],
    settings: {
      logChannel: { type: 'text', label: 'Salon de logs anti-raid (ID)', default: '' },
      accountAgeDays: { type: 'number', label: '\u00c2ge minimum du compte (jours, 0 = d\u00e9sactiv\u00e9)', default: 0, min: 0, max: 365 },
      requireAvatar: { type: 'boolean', label: 'Exiger un avatar (kick si aucun)', default: false },
      maxJoinsCount: { type: 'number', label: 'Max joins avant alerte raid', default: 5, min: 2, max: 100 },
      maxJoinsWindow: { type: 'number', label: 'Fen\u00eatre de d\u00e9tection joins (secondes)', default: 10, min: 1, max: 120 },
      joinPunishment: { type: 'text', label: 'Punition raid (kick / ban / none)', default: 'kick' },
      antiSpam: { type: 'boolean', label: 'Anti-spam messages', default: true },
      spamMaxMessages: { type: 'number', label: 'Max messages avant spam', default: 8, min: 3, max: 50 },
      spamWindow: { type: 'number', label: 'Fen\u00eatre spam (secondes)', default: 5, min: 1, max: 60 },
      spamPunishment: { type: 'text', label: 'Punition spam (mute / kick / ban)', default: 'mute' },
      antiMention: { type: 'boolean', label: 'Anti-mention spam', default: true },
      maxMentions: { type: 'number', label: 'Max mentions par message', default: 5, min: 2, max: 50 },
      mentionPunishment: { type: 'text', label: 'Punition mentions (mute / kick / ban)', default: 'mute' },
      antiInvite: { type: 'boolean', label: 'Bloquer les liens d\'invitation Discord', default: true },
      antiWebhook: { type: 'boolean', label: 'Bloquer les webhooks en mode raid', default: true },
      antiZalgo: { type: 'boolean', label: 'Bloquer les textes zalgos', default: true },
      antiMassEmoji: { type: 'boolean', label: 'Anti-mass emoji', default: true },
      maxEmojiPerMsg: { type: 'number', label: 'Max emoji par message', default: 15, min: 1, max: 100 },
      autoLockChannels: { type: 'boolean', label: 'Verrouiller auto tous les salons pendant raid', default: true },
      autoUnlockMinutes: { type: 'number', label: 'Auto-d\u00e9verrouiller apr\u00e8s X minutes', default: 10, min: 1, max: 120 },
    },
  },
  shop: {
    label: 'Boutique',
    description: 'Boutique avec paiement Mobile Money, boutons Acheter, v\u00e9rification et notifications par email',
    icon: 'storefront',
    color: '#FF9800',
    commands: ['boutique', 'acheter'],
    settings: {
      mmNumber: { type: 'text', label: 'Num\u00e9ro Mobile Money', default: '032 81 381 58' },
      ownerEmail: { type: 'text', label: 'Email pour notifications de paiement', default: 'mathieurambelomanana@gmail.com' },
      mmOperator: { type: 'text', label: 'Op\u00e9rateur Mobile Money (Telma / Orange / Airtel)', default: 'Telma' },
    },
  },
};

// ── In-memory cache with write-behind ─────────────────────────────
let _cache = null;
let _dirty = false;
let _saveTimer = null;
const SAVE_DELAY_MS = 2000;

function _loadFromDisk() {
  try {
    return JSON.parse(fs.readFileSync(FEATURES_FILE, 'utf8'));
  } catch {
    const defaults = buildDefaults();
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function _ensureCache() {
  if (!_cache) _cache = _loadFromDisk();
  return _cache;
}

function _scheduleSave() {
  if (_dirty) return;
  _dirty = true;
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    if (!_dirty) return;
    _dirty = false;
    try { fs.writeFileSync(FEATURES_FILE, JSON.stringify(_cache, null, 2)); } catch (e) { console.error('Features save error:', e); }
  }, SAVE_DELAY_MS);
}

function _flushSync() {
  _dirty = false;
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (_cache) {
    try { fs.writeFileSync(FEATURES_FILE, JSON.stringify(_cache, null, 2)); } catch (e) { console.error('Features flush error:', e); }
  }
}

// For external writes that need to be persisted immediately (e.g. shutdown)
function _forceReload() {
  _flushSync();
  _cache = null;
}

function buildDefaults() {
  const defaults = {};
  for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
    defaults[key] = {
      enabled: true,
      commands: {},
      settings: {},
    };
    for (const cmd of def.commands) defaults[key].commands[cmd] = true;
    for (const [sk, sv] of Object.entries(def.settings)) defaults[key].settings[sk] = sv.default;
  }
  return defaults;
}

function isFeatureEnabled(featureName) {
  const features = _ensureCache();
  return features[featureName]?.enabled !== false;
}

function isCommandEnabled(commandName) {
  const featureKey = getFeatureForCommand(commandName);
  if (!featureKey) return true;
  if (!isFeatureEnabled(featureKey)) return false;
  const features = _ensureCache();
  const cmdState = features[featureKey]?.commands?.[commandName];
  return cmdState !== false;
}

function toggleFeature(featureName, enabled) {
  const features = _ensureCache();
  if (!features[featureName]) return false;
  features[featureName].enabled = enabled;
  _scheduleSave();
  return true;
}

function toggleCommand(commandName, enabled) {
  const featureKey = getFeatureForCommand(commandName);
  if (!featureKey) return false;
  const features = _ensureCache();
  if (!features[featureKey]?.commands) return false;
  features[featureKey].commands[commandName] = enabled;
  _scheduleSave();
  return true;
}

function updateFeatureSettings(featureName, settings) {
  const features = _ensureCache();
  if (!features[featureName]) return false;
  const def = FEATURE_DEFINITIONS[featureName];
  if (!def) return false;
  if (!features[featureName].settings) features[featureName].settings = {};
  for (const [key, val] of Object.entries(settings)) {
    const schema = def.settings[key];
    if (!schema) continue;
    if (schema.type === 'number') {
      const n = Number(val);
      if (isNaN(n)) continue;
      if (schema.min !== undefined) features[featureName].settings[key] = Math.max(schema.min, n);
      else features[featureName].settings[key] = n;
      if (schema.max !== undefined) features[featureName].settings[key] = Math.min(schema.max, features[featureName].settings[key]);
    } else if (schema.type === 'boolean') {
      features[featureName].settings[key] = !!val;
    } else {
      features[featureName].settings[key] = String(val);
    }
  }
  _scheduleSave();
  return true;
}

function getFeatureSettings(featureName) {
  const features = _ensureCache();
  return features[featureName]?.settings || {};
}

function getFeatureForCommand(commandName) {
  for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
    if (def.commands.includes(commandName)) return key;
  }
  return null;
}

function getAllFeatures() {
  const states = _ensureCache();
  const result = {};
  for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
    const state = states[key] || { enabled: true, commands: {}, settings: {} };
    const cmds = {};
    for (const c of def.commands) cmds[c] = state.commands?.[c] !== false;
    const settings = {};
    for (const [sk, sv] of Object.entries(def.settings)) {
      settings[sk] = state.settings?.[sk] !== undefined ? state.settings[sk] : sv.default;
    }
    result[key] = {
      ...def,
      enabled: state.enabled !== false,
      commands: cmds,
      settings,
      _schema: def.settings || {},
    };
  }
  return result;
}

module.exports = {
  FEATURE_DEFINITIONS, isFeatureEnabled,
  isCommandEnabled, toggleFeature, toggleCommand,
  updateFeatureSettings, getFeatureSettings, getFeatureForCommand, getAllFeatures,
  _flushSync, _forceReload,
};
