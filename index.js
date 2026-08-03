const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./config');

// ── Création du client ──────────────────────────────────────────────
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

// ── Chargement des commandes ─────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const slashCommands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    // Collecter les slash commands
    if (command.slash) {
      slashCommands.push(command.slash.toJSON());
    }
    console.log(`✅ ${command.data.name}`);
  }
}

// ── Chargement des événements ────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...a) => event.execute(...a, client));
  } else {
    client.on(event.name, (...a) => event.execute(...a, client));
  }
}

// ── Enregistrement des slash commands au démarrage ───────────────────
client.once('ready', async () => {
  if (slashCommands.length > 0 && config.guildId) {
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), {
        body: slashCommands,
      });
      console.log(`📝 ${slashCommands.length} slash commands enregistrées`);
    } catch (err) {
      console.error('Erreur slash commands:', err.message);
    }
  }
});

// ── Serveur HTTP keep-alive ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', bot: client.user?.tag || 'connecting...' }));
}).listen(PORT, () => console.log(`🌐 HTTP keep-alive :${PORT}`));

// ── Connexion ────────────────────────────────────────────────────────
client.login(config.token).catch(err => {
  console.error('❌ Erreur connexion :', err.message);
  process.exit(1);
});
