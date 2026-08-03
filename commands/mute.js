const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
  data: { name: 'mute' },
  description: 'Rend un membre muet (mute) pendant une durée donnée',
  usage: '<@membre> <durée> [raison]',
  permissions: [PermissionFlagsBits.ModerateMembers],
  requireModRole: false,
  cooldown: 5,
  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('❌ Tu dois mentionner un membre à mute.\nUtilisation : `!mute <@membre> <durée> [raison]`\nExemple : `!mute @user 10m spam`');
    }

    // Vérifier la hiérarchie des rôles
    if (target.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply('❌ Tu ne peux pas mute quelqu\'un avec un rôle supérieur ou égal au tien.');
    }

    if (!target.moderatable) {
      return message.reply('❌ Je ne peux pas mute ce membre. Vérifie que mon rôle est bien placé dans la hiérarchie.');
    }

    // Parser la durée
    const durationStr = args[1];
    if (!durationStr) {
      return message.reply('❌ Tu dois spécifier une durée.\nExemples : `10m`, `1h`, `1d`, `30s`');
    }

    const duration = ms(durationStr);
    if (!duration || duration < 1000) {
      return message.reply('❌ Durée invalide. Utilise un format comme `10m`, `1h`, `1d`.');
    }
    if (duration > 28 * 24 * 60 * 60 * 1000) {
      return message.reply('❌ La durée ne peut pas dépasser 28 jours.');
    }

    const reason = args.slice(2).join(' ') || 'Aucune raison spécifiée';

    try {
      await target.timeout(duration, reason);

      const durationText = ms(duration, { long: true });
      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🔇 Membre rendu muet')
        .addFields(
          { name: 'Membre', value: `${target.user.tag} (${target.user.id})`, inline: true },
          { name: 'Durée', value: durationText, inline: true },
          { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
          { name: 'Raison', value: reason, inline: false },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur mute :', error);
      message.reply('❌ Une erreur est survenue lors du mute.');
    }
  },
};
