const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./config');
const { getAllFeatures, toggleFeature, toggleCommand, updateFeatureSettings, FEATURE_DEFINITIONS, _flushSync: flushFeatures, _forceReload: forceReloadFeatures } = require('./features');
const shopdata = require('./shopdata');
const orders = require('./orders');
const db = require('./database');

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn('[SECURITY] API_KEY env var is not set. HTTP API endpoints are disabled.');
}

// ── Rate limiter for HTTP API ────────────────────────────────
const apiRateLimits = new Map(); // ip → { count, resetTime }
const API_RATE_LIMIT = 30; // max requests per window
const API_RATE_WINDOW = 60000; // 1 minute window

function checkApiRateLimit(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = apiRateLimits.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + API_RATE_WINDOW };
    apiRateLimits.set(ip, entry);
  }
  entry.count++;
  return { allowed: entry.count <= API_RATE_LIMIT, remaining: Math.max(0, API_RATE_LIMIT - entry.count), resetTime: entry.resetTime };
}

// Clean rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of apiRateLimits) {
    if (now > entry.resetTime) apiRateLimits.delete(ip);
  }
}, 120000);

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
  rest: { timeout: 15000 },
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── Uptime monitor ping (no auth, no rate limit, no timeout) ──
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    return res.end(JSON.stringify({ status: 'ok', uptime: Math.floor(process.uptime()), ts: Date.now() }));
  }

  // Rate limiting
  const { allowed, remaining, resetTime } = checkApiRateLimit(req);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
  if (!allowed) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    return res.end(JSON.stringify({ error: 'Trop de requ\u00eates. R\u00e9essayez dans 60 secondes.' }));
  }

  // Request timeout (10s)
  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'D\u00e9lai d\u2019attente d\u00e9pass\u00e9' }));
    }
  }, 10000);
  res.on('finish', () => clearTimeout(timeout));

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const authKey = url.searchParams.get('key') || (req.headers.authorization || '').replace('Bearer ', '');

  // Block all authenticated endpoints if API_KEY is not configured
  function checkApiEnabled() {
    if (!API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API non configurée. Définissez API_KEY dans .env' }));
      return false;
    }
    if (authKey !== API_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Clé API invalide' }));
      return false;
    }
    return true;
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
    let size = 0;
    const MAX_BODY = 10 * 1024 * 1024; // 10MB max
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { req.destroy(); return; }
      body += c;
    });
    req.on('error', () => { /* destroyed */ });
    req.on('end', () => cb(body));
  }

  // GET /api/status
  if (req.method === 'GET' && url.pathname === '/api/status') {
    if (!checkApiEnabled()) return;
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
    if (!checkApiEnabled()) return;
    return ok({ features: getAllFeatures() });
  }

  // POST /api/features/toggle
  if (req.method === 'POST' && url.pathname === '/api/features/toggle') {
    if (!checkApiEnabled()) return;
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

  // POST /api/features/command/toggle
  if (req.method === 'POST' && url.pathname === '/api/features/command/toggle') {
    if (!checkApiEnabled()) return;
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

  // POST /api/features/settings
  if (req.method === 'POST' && url.pathname === '/api/features/settings') {
    if (!checkApiEnabled()) return;
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

  // ── Shop API ─────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/shop') {
    if (!checkApiEnabled()) return;
    return ok({ products: shopdata.getAll(), stats: shopdata.getStats() });
  }

  if (req.method === 'POST' && url.pathname === '/api/shop') {
    if (!checkApiEnabled()) return;
    readBody(body => {
      try {
        const product = JSON.parse(body);
        if (!product.name) return badReq('Nom requis');
        const created = shopdata.add(product);
        return ok({ success: true, product: created });
      } catch { return badReq(); }
    });
    return;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/shop/')) {
    if (!checkApiEnabled()) return;
    const id = url.pathname.replace('/api/shop/', '');
    readBody(body => {
      try {
        const updates = JSON.parse(body);
        const updated = shopdata.update(id, updates);
        if (!updated) return badReq('Produit introuvable');
        return ok({ success: true, product: updated });
      } catch { return badReq(); }
    });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/shop/')) {
    if (!checkApiEnabled()) return;
    const id = url.pathname.replace('/api/shop/', '');
    if (shopdata.remove(id)) return ok({ success: true });
    return badReq('Produit introuvable');
  }

  // ── Orders API ────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/orders') {
    if (!checkApiEnabled()) return;
    const filter = url.searchParams.get('status') || 'all';
    return ok({ orders: orders.getAll(filter), stats: orders.getStats() });
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/orders/')) {
    if (!checkApiEnabled()) return;
    const parts = url.pathname.replace('/api/orders/', '').split('/');
    const id = parts[0];
    const action = parts[1];
    readBody(body => {
      try {
        if (action === 'status') {
          const { status } = JSON.parse(body);
          if (!orders.VALID_STATUSES.includes(status)) return badReq('Statut invalide');
          const updated = orders.updateStatus(id, status);
          if (!updated) return badReq('Commande introuvable');
          return ok({ success: true, order: updated });
        }
        if (action === 'note') {
          const { note } = JSON.parse(body);
          if (!note) return badReq('Note requise');
          const updated = orders.addNote(id, note);
          if (!updated) return badReq('Commande introuvable');
          return ok({ success: true, order: updated });
        }
        return badReq('Action inconnue');
      } catch { return badReq(); }
    });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/orders/')) {
    if (!checkApiEnabled()) return;
    const id = url.pathname.replace('/api/orders/', '');
    if (orders.remove(id)) return ok({ success: true });
    return badReq('Commande introuvable');
  }

  // POST /api/restart
  if (req.method === 'POST' && url.pathname === '/api/restart') {
    if (!checkApiEnabled()) return;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Red\u00e9marrage...' }));
    setTimeout(() => gracefulShutdown('API_RESTART'), 500);
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint non trouv\u00e9' }));
}

const server = http.createServer(handleRequest);

// Keep-alive timeout to prevent hanging connections
server.keepAliveTimeout = 30000;
server.headersTimeout = 10000;
server.requestTimeout = 30000;

server.listen(PORT, () => console.log(`\U0001f310 HTTP + API :${PORT}`));

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

  // Bio du profil Discord
  try {
    const rest = new REST({ version: '10' }).setToken(config.token);
    await rest.patch(Routes.user('@me'), {
      body: {
        bio: 'Bot officiel de la communauté Malagasy FORGOTTEN LAND \u2022 Modération, gestion et divertissement. Développé avec soin pour offrir une expérience complète et fiable.',
      },
    });
    console.log('✅ Bio du profil mise à jour');
  } catch (err) {
    console.warn('⚠️ Impossible de mettre à jour la bio:', err.message);
  }

  // Presence professionnelle avec rotation
  const presenceList = [
    // ActivityType.Watching = 3
    { name: 'Gamer MG', type: 3 },
    // ActivityType.Listening = 2
    { name: '/help \u2022 Commandes', type: 2 },
    // ActivityType.Playing = 0
    { name: '/boutique \u2022 Boutique', type: 0 },
  ];
  let pi = 0;
  const rotatePresence = () => {
    const p = presenceList[pi % presenceList.length];
    client.user.setActivity(p.name, { type: p.type });
    pi++;
  };
  rotatePresence();
  setInterval(rotatePresence, 30000);
});

// ── Error handling ────────────────────────────────────────────────
client.on('error', (err) => {
  console.error('[Discord] Client error:', err.message);
});

client.on('warn', (warn) => {
  console.warn('[Discord] Warning:', warn);
});

// ── Graceful shutdown ─────────────────────────────────────────────
const SHUTDOWN_TIMEOUT = 10000;

function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Signal: ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) console.error('[SHUTDOWN] HTTP server close error:', err.message);
    else console.log('[SHUTDOWN] HTTP server closed.');
  });

  // Set a hard timeout
  const hardTimeout = setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after timeout.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  // Flush all caches synchronously
  try {
    flushFeatures();
    shopdata._flushSync();
    orders._flushSync();
    db._flushAllSync();
    console.log('[SHUTDOWN] All data flushed to disk.');
  } catch (err) {
    console.error('[SHUTDOWN] Flush error:', err.message);
  }

  // Destroy Discord client
  client.destroy();
  console.log('[SHUTDOWN] Discord client destroyed.');

  clearTimeout(hardTimeout);
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  // Try to flush data before exiting
  try { flushFeatures(); shopdata._flushSync(); orders._flushSync(); db._flushAllSync(); } catch {}
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

// ── Memory monitoring ─────────────────────────────────────────────
setInterval(() => {
  const mem = process.memoryUsage();
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  if (heapMB > 200) {
    console.warn(`[MEMORY] High heap usage: ${heapMB}MB RSS: ${rssMB}MB`);
  }
}, 60000);

client.login(config.token).catch(err => {
  console.error('\u274c Erreur connexion :', err.message);
  process.exit(1);
});
