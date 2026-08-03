const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: { name: 'unlock' },
  description: 'Déverrouille le canal actuel',
  usage: '[raison]',
  permissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  async execute(message, args) {
    const reason = args.join(' ') || 'Aucune raison spécifiée';
    const channel = message.channel;

    const everyoneRole = message.guild.roles.everyone;
    const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);

    if (!currentPerms || !currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
      return message.reply('❌ Ce canal n\'est pas verrouillé.');
    }

    try {
      await channel.permissionOverwrites.edit(everyoneRole.id, {
        SendMessages: null,
        AddReactions: null,
      });

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🔓 Canal déverrouillé')
        .setDescription(`Ce canal a été déverrouillé par ${message.author}.`)
        .addFields({ name: 'Raison', value: reason })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur unlock :', error);
      message.reply('❌ Impossible de déverrouiller ce canal.');
    }
  },
};
