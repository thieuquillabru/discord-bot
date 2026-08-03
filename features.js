const fs = require('fs');
const path = require('path');

const FEATURES_FILE = path.join(__dirname, 'features.json');

const FEATURE_DEFINITIONS = {
  moderation: {
    label: 'Modération',
    description: 'Kick, Ban, Mute, Warn, Clear, Lock, Unlock, Slowmode',
    icon: 'shield',
    color: '#E74C3C',
    commands: ['kick', 'ban', 'mute', 'unmute', 'warn', 'clear', 'lock', 'unlock', 'slowmode'],
  },
  welcome: {
    label: 'Messages de bienvenue',
    description: 'Message automatique quand un membre rejoint le serveur',
    icon: 'waving_hand',
    color: '#2ECC71',
    commands: [],
  },
  tickets: {
    label: 'Système de tickets',
    description: 'Création et gestion de tickets de support',
    icon: 'confirmation_number',
    color: '#F39C12',
    commands: ['ticket'],
  },
  fun: {
    label: 'Commandes fun',
    description: '8ball, Dice, Meme, Pierre-Papier-Ciseaux, Snipe',
    icon: 'sports_esports',
    color: '#9B59B6',
    commands: ['8ball', 'dice', 'meme', 'rps', 'snipe'],
  },
  utility: {
    label: 'Utilitaires',
    description: 'Help, Ping, Userinfo, Serverinfo, Avatar, Remind, Poll, Setup',
    icon: 'build',
    color: '#3498DB',
    commands: ['help', 'ping', 'userinfo', 'serverinfo', 'avatar', 'remind', 'poll', 'setup'],
  },
  messagelog: {
    label: 'Log des messages',
    description: 'Sauvegarde les messages supprimés pour la commande snipe',
    icon: 'delete_sweep',
    color: '#1ABC9C',
    commands: [],
  },
};

function loadFeatures() {
  try {
    return JSON.parse(fs.readFileSync(FEATURES_FILE, 'utf8'));
  } catch {
    const defaults = {};
    for (const key of Object.keys(FEATURE_DEFINITIONS)) {
      defaults[key] = { enabled: true };
    }
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function saveFeatures(features) {
  fs.writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2));
}

function isFeatureEnabled(featureName) {
  const features = loadFeatures();
  return features[featureName]?.enabled !== false;
}

function toggleFeature(featureName, enabled) {
  const features = loadFeatures();
  if (!features[featureName]) return false;
  features[featureName].enabled = enabled;
  saveFeatures(features);
  return true;
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
    result[key] = {
      ...def,
      enabled: states[key]?.enabled !== false,
    };
  }
  return result;
}

module.exports = {
  FEATURE_DEFINITIONS,
  loadFeatures,
  saveFeatures,
  isFeatureEnabled,
  toggleFeature,
  getFeatureForCommand,
  getAllFeatures,
};
