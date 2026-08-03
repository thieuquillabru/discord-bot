const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'help' },
  description: 'Affiche la liste des commandes disponibles',
  cooldown: 5,
  async execute(message, args, client) {
    const commands = client.commands.map(cmd => {
      const name = cmd.data.name;
      const desc = cmd.description || 'Aucune description';
      const usage = cmd.usage ? ` ${cmd.usage}` : '';
      return `\`!${name}${usage}\` — ${desc}`;
    });

    // Grouper par catégorie
    const moderation = ['kick', 'ban', 'mute', 'unmute', 'clear', 'warn'].filter(c => client.commands.has(c));
    const fun = ['8ball', 'meme', 'rps', 'ping', 'dice'].filter(c => client.commands.has(c));
    const util = ['help', 'ticket', 'setup'].filter(c => client.commands.has(c));

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: `${client.user.username} — Aide`, iconURL: client.user.displayAvatarURL() })
      .addFields(
        {
          name: '🔧 Modération',
          value: moderation.map(c => `\`!${c}\``).join(' · ') || 'Aucune',
          inline: false,
        },
        {
          name: '🎮 Fun',
          value: fun.map(c => `\`!${c}\``).join(' · ') || 'Aucune',
          inline: false,
        },
        {
          name: '⚙️ Utilitaires',
          value: util.map(c => `\`!${c}\``).join(' · ') || 'Aucune',
          inline: false,
        },
        {
          name: '💡 Info',
          value: 'Utilise `!help <commande>` pour plus de détails sur une commande.',
          inline: false,
        }
      )
      .setFooter({ text: `Total : ${client.commands.size} commandes` })
      .setTimestamp();

    // Si l'utilisateur demande l'aide d'une commande spécifique
    if (args[0]) {
      const cmd = client.commands.get(args[0].toLowerCase());
      if (!cmd) {
        return message.reply('❌ Commande introuvable. Utilise `!help` pour voir la liste.');
      }
      const detailEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`!${cmd.data.name}`)
        .setDescription(cmd.description || 'Aucune description')
        .addFields(
          { name: 'Utilisation', value: cmd.usage ? `\`!${cmd.data.name} ${cmd.usage}\`` : `\`!${cmd.data.name}\``, inline: false },
          { name: 'Cooldown', value: `${cmd.cooldown || 3} seconde(s)`, inline: true },
        );
      if (cmd.permissions) {
        const permNames = Array.isArray(cmd.permissions)
          ? cmd.permissions.map(p => `\`${p}\``).join(', ')
          : `\`${cmd.permissions}\``;
        detailEmbed.addFields({ name: 'Permissions requises', value: permNames, inline: true });
      }
      return message.reply({ embeds: [detailEmbed] });
    }

    await message.reply({ embeds: [embed] });
  },
};
