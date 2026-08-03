const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./config');
const { getAllFeatures, toggleFeature, toggleCommand, updateFeatureSettings, FEATURE_DEFINITIONS } = require('./features');

const API_KEY = process.env.API_KEY || 'gamer-mg-bot-2024';

// ── Client Discord ────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// ── Chargement des commandes ─────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
const slashCommands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    if (command.slash) slashCommands.push(command.slash.toJSON());
    console.log(`\u2705 ${command.data.name}`);
  }
}

// ── Chargement des événements ────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  const handler = (...a) => event.execute(...a, client);
  if (event.once) client.once(event.name, handler);
  else client.on(event.name, handler);
  console.log(`\u2705 \u00c9v\u00e9nement : ${event.name}`);
}

// ── Serveur HTTP + API REST ──────────────────────────────────────
const PORT = process.env.PORT || 3000;

function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const authKey = url.searchParams.get('key') || (req.headers.authorization || '').replace('Bearer ', '');

  function authErr() {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Cl\u00e9 API invalide' }));
  }

  function badReq(msg) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: msg || 'Requ\u00eate invalide' }));
  }

  function ok(data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  function readBody(cb) {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => cb(body));
  }

  // GET /api/status
  if (req.method === 'GET' && url.pathname === '/api/status') {
    if (authKey !== API_KEY) return authErr();
    const guild = client.guilds.cache.get(config.guildId);
    return ok({
      bot: {
        tag: client.user?.tag || 'D\u00e9connect\u00e9',
        id: client.user?.id || null,
        avatar: client.user?.displayAvatarURL({ size: 256, extension: 'png' }) || null,
      },
      status: client.isReady() ? 'online' : 'offline',
      uptime: Math.floor(client.uptime / 1000) || 0,
      guild: guild ? {
        name: guild.name, id: guild.id, memberCount: guild.memberCount,
        icon: guild.iconURL({ size: 256, extension: 'png' }) || null,
      } : null,
      commandsCount: client.commands.size,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
  }

  // GET /api/features
  if (req.method === 'GET' && url.pathname === '/api/features') {
    if (authKey !== API_KEY) return authErr();
    return ok({ features: getAllFeatures() });
  }

  // POST /api/features/toggle  (toggle master)
  if (req.method === 'POST' && url.pathname === '/api/features/toggle') {
    if (authKey !== API_KEY) return authErr();
    readBody(body => {
      try {
        const { feature, enabled } = JSON.parse(body);
        if (!FEATURE_DEFINITIONS[feature] || typeof enabled !== 'boolean') return badReq('Fonctionnalit\u00e9 inconnue');
        toggleFeature(feature, enabled);
        console.log(`\U0001f504 Feature ${feature} \u2192 ${enabled ? 'ON' : 'OFF'}`);
        return ok({ success: true, feature, enabled });
      } catch { return badReq(); }
    });
    return;
  }

  // POST /api/features/command/toggle  (toggle individual command)
  if (req.method === 'POST' && url.pathname === '/api/features/command/toggle') {
    if (authKey !== API_KEY) return authErr();
    readBody(body => {
      try {
        const { command, enabled } = JSON.parse(body);
        if (!command || typeof enabled !== 'boolean') return badReq('Commande inconnue');
        const result = toggleCommand(command, enabled);
        if (!result) return badReq('Commande non trouv\u00e9e');
        console.log(`\U0001f504 Command /${command} \u2192 ${enabled ? 'ON' : 'OFF'}`);
        return ok({ success: true, command, enabled });
      } catch { return badReq(); }
    });
    return;
  }

  // POST /api/features/settings  (update feature settings)
  if (req.method === 'POST' && url.pathname === '/api/features/settings') {
    if (authKey !== API_KEY) return authErr();
    readBody(body => {
      try {
        const { feature, settings } = JSON.parse(body);
        if (!FEATURE_DEFINITIONS[feature] || !settings || typeof settings !== 'object') return badReq('Requ\u00eate invalide');
        const result = updateFeatureSettings(feature, settings);
        if (!result) return badReq('Fonctionnalit\u00e9 inconnue');
        console.log(`\u2699\ufe0f Settings ${feature} updated`);
        return ok({ success: true, feature });
      } catch { return badReq(); }
    });
    return;
  }

  // POST /api/restart
  if (req.method === 'POST' && url.pathname === '/api/restart') {
    if (authKey !== API_KEY) return authErr();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Red\u00e9marrage...' }));
    setTimeout(() => process.exit(0), 500);
    return;
  }

  // Default
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', bot: client.user?.tag || 'connecting...' }));
}

http.createServer(handleRequest).listen(PORT, () => console.log(`\U0001f310 HTTP + API :${PORT}`));

// ── Enregistrement slash commands + connexion ─────────────────────
client.once('ready', async () => {
  console.log(`\U0001f916 ${client.user.tag} connect\u00e9`);

  if (slashCommands.length > 0 && config.guildId) {
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), {
        body: slashCommands,
      });
      console.log(`\U0001f4dd ${slashCommands.length} slash commands enregistr\u00e9es`);
    } catch (err) {
      console.error('\u274c Erreur slash commands:', err.message);
    }
  }

  client.user.setActivity('/help pour commencer', { type: 'PLAYING' });
});

client.login(config.token).catch(err => {
  console.error('\u274c Erreur connexion :', err.message);
  process.exit(1);
});
