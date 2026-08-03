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
};

function loadFeatures() {
  try {
    return JSON.parse(fs.readFileSync(FEATURES_FILE, 'utf8'));
  } catch {
    const defaults = buildDefaults();
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
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

function saveFeatures(features) {
  fs.writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2));
}

function isFeatureEnabled(featureName) {
  const features = loadFeatures();
  return features[featureName]?.enabled !== false;
}

function isCommandEnabled(commandName) {
  const featureKey = getFeatureForCommand(commandName);
  if (!featureKey) return true;
  if (!isFeatureEnabled(featureKey)) return false;
  const features = loadFeatures();
  const cmdState = features[featureKey]?.commands?.[commandName];
  return cmdState !== false;
}

function toggleFeature(featureName, enabled) {
  const features = loadFeatures();
  if (!features[featureName]) return false;
  features[featureName].enabled = enabled;
  saveFeatures(features);
  return true;
}

function toggleCommand(commandName, enabled) {
  const featureKey = getFeatureForCommand(commandName);
  if (!featureKey) return false;
  const features = loadFeatures();
  if (!features[featureKey]?.commands) return false;
  features[featureKey].commands[commandName] = enabled;
  saveFeatures(features);
  return true;
}

function updateFeatureSettings(featureName, settings) {
  const features = loadFeatures();
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
  saveFeatures(features);
  return true;
}

function getFeatureSettings(featureName) {
  const features = loadFeatures();
  return features[featureName]?.settings || {};
}

function getFeatureForCommand(commandName) {
  for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
    if (def.commands.includes(commandName)) return key;
  }
  return null;
}

function getAllFeatures() {
  const states = loadFeatures();
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
  FEATURE_DEFINITIONS, loadFeatures, saveFeatures, isFeatureEnabled,
  isCommandEnabled, toggleFeature, toggleCommand,
  updateFeatureSettings, getFeatureSettings, getFeatureForCommand, getAllFeatures,
};
