const config = require('../config');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Vérifier le préfixe
    if (!message.content.startsWith(config.prefix)) return;

    // Parser la commande
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    // ── Vérification des permissions ────────────────────────────────
    if (command.permissions) {
      const authorPerms = message.member.permissions.has(command.permissions);
      if (!authorPerms) {
        return message.reply({
          content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
          ephemeral: false,
        });
      }
    }

    // ── Vérification du mod role (si requis) ───────────────────────
    if (command.requireModRole && config.modRoleId) {
      if (!message.member.roles.cache.has(config.modRoleId)) {
        return message.reply({
          content: '❌ Seuls les modérateurs peuvent utiliser cette commande.',
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
          `⏳ Attends ${timeLeft.toFixed(1)} seconde(s) avant de réutiliser la commande \'${command.data.name}\'.`
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
      const errorMsg = { content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.' };
      if (message.deferred || message.replied) {
        await message.followUp(errorMsg);
      } else {
        await message.reply(errorMsg);
      }
    }
  },
};
