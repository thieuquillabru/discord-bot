const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'lock' },
  description: 'Verrouille le canal actuel (les membres ne peuvent plus envoyer de messages)',
  usage: '[raison]',
  permissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('lock').setDescription('Verrouille le canal actuel').addStringOption(o => o.setName('raison').setDescription('La raison du verrouillage')),
  async execute(message, args) {
    const reason = args.join(' ') || 'Aucune raison spécifiée';
    const channel = message.channel;

    // Vérifier les permissions actuelles du rôle @everyone
    const everyoneRole = message.guild.roles.everyone;
    const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);

    if (currentPerms && currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
      return message.reply('❌ Ce canal est déjà verrouillé.');
    }

    try {
      await channel.permissionOverwrites.edit(everyoneRole.id, {
        SendMessages: false,
        AddReactions: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🔒 Canal verrouillé')
        .setDescription(`Ce canal a été verrouillé par ${message.author}.`)
        .addFields({ name: 'Raison', value: reason })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur lock :', error);
      message.reply('❌ Impossible de verrouiller ce canal. Vérifie la hiérarchie des rôles.');
    }
  },
};
