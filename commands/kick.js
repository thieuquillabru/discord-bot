const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: { name: 'kick' },
  description: 'Expulse un membre du serveur',
  usage: '<@membre> [raison]',
  permissions: [PermissionFlagsBits.KickMembers],
  requireModRole: false,
  cooldown: 5,
  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('❌ Tu dois mentionner un membre à expulser.\nUtilisation : `!kick <@membre> [raison]`');
    }

    // Vérifier la hiérarchie des rôles
    if (target.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply('❌ Tu ne peux pas expulser quelqu\'un avec un rôle supérieur ou égal au tien.');
    }

    // Vérifier si le bot peut kick
    if (!target.kickable) {
      return message.reply('❌ Je ne peux pas expulser ce membre. Vérifie que mon rôle est bien placé dans la hiérarchie.');
    }

    const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

    try {
      await target.kick(reason);

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('👢 Membre expulsé')
        .addFields(
          { name: 'Membre', value: `${target.user.tag} (${target.user.id})`, inline: true },
          { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
          { name: 'Raison', value: reason, inline: false },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur kick :', error);
      message.reply('❌ Une erreur est survenue lors de l\'expulsion.');
    }
  },
};
