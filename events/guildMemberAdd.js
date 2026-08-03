const config = require('../config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    // Vérifier si le canal de bienvenue est configuré
    if (!config.welcome.channelId) return;

    const channel = member.guild.channels.cache.get(config.welcome.channelId);
    if (!channel) return;

    // Construire le message personnalisé
    const message = config.welcome.message
      .replace('{member}', member.toString())
      .replace('{server}', member.guild.name)
      .replace('{count}', member.guild.memberCount.toString());

    // Embed de bienvenue
    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Nouveau membre !')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(message)
      .addFields(
        { name: 'Compte créé le', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'ID', value: member.user.id, inline: true }
      )
      .setFooter({ text: 'Bienvenue parmi nous !' })
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de bienvenue :', error);
    }
  },
};
