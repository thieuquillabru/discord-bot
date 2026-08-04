const config = require('../config');
const { isFeatureEnabled } = require('../features');
const db = require('../database');
const antiRaid = require('../antiraid');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ── Anti-Raid checks (spam, mentions, invites, etc.) ─────
    if (isFeatureEnabled('antiraid')) {
      const blocked = await antiRaid.handleMessage(message);
      if (blocked) return;
    }

    // ── XP automatique (15-25 XP par message, cooldown 60s) ─────
    if (isFeatureEnabled('levels')) {
      const xpCD = message.author.id + '_xp_msg';
      if (!db.checkCooldown(message.guild.id, message.author.id, 'xp_msg', 60000)) {
        const xp = Math.floor(Math.random() * 11) + 15;
        db.addXP(message.guild.id, message.author.id, xp);
      }
    }

    // Prefix commands (legacy)
    if (!message.content.startsWith(config.prefix)) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    // ── Vérification des permissions ────────────────────────────────
    if (command.permissions) {
      const authorPerms = message.member.permissions.has(command.permissions);
      if (!authorPerms) {
        return message.reply({
          content: 'Tu n\'as pas la permission d\'utiliser cette commande.',
          ephemeral: false,
        });
      }
    }

    // ── Vérification du mod role (si requis) ───────────────────────
    if (command.requireModRole && config.modRoleId) {
      if (!message.member.roles.cache.has(config.modRoleId)) {
        return message.reply({
          content: 'Seuls les modérateurs peuvent utiliser cette commande.',
          ephemeral: false,
        });
      }
    }

    // ── Système de cooldown ─────────────────────────────────────────
    if (!client.cooldowns.has(command.data.name)) {
      client.cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return message.reply(
          `Attends ${timeLeft.toFixed(1)} seconde(s) avant de réutiliser la commande '${command.data.name}'.`
        );
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // ── Exécution ───────────────────────────────────────────────────
    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error(`Erreur dans la commande ${command.data.name}:`, error);
      const errorMsg = { content: 'Une erreur est survenue lors de l\'exécution de cette commande.' };
      if (message.deferred || message.replied) {
        await message.followUp(errorMsg);
      } else {
        await message.reply(errorMsg);
      }
    }
  },
};
