const { EmbedBuilder, PermissionFlagsBits, time } = require('discord.js');

module.exports = {
  data: { name: 'userinfo' },
  description: 'Affiche les informations détaillées sur un membre',
  usage: '[@membre]',
  cooldown: 5,
  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;

    const roles = target.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`);

    const memberSince = time(target.joinedAt, 'R');
    const accountCreated = time(target.user.createdAt, 'R');

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor || 0x5865F2)
      .setAuthor({ name: target.user.tag, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: 'ID', value: target.user.id, inline: true },
        { name: 'Surnom', value: target.nickname || 'Aucun', inline: true },
        { name: 'En serveur depuis', value: memberSince, inline: true },
        { name: 'Compte créé', value: accountCreated, inline: true },
        { name: 'Rôles (' + roles.length + ')', value: roles.length > 0 ? roles.slice(0, 10).join(' ') + (roles.length > 10 ? ` et ${roles.length - 10} autres...` : '') : 'Aucun rôle', inline: false },
        { name: 'Statut', value: target.presence?.status || 'hors ligne', inline: true },
      )
      .setFooter({ text: `Demandé par ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
