const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'ban' },
  description: 'Bannit un membre du serveur',
  usage: '<@membre> [raison] [durée en jours de messages à supprimer]',
  permissions: [PermissionFlagsBits.BanMembers],
  requireModRole: false,
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('ban').setDescription('Bannit un membre du serveur').addUserOption(o => o.setName('membre').setDescription('Le membre a bannir').setRequired(true)).addStringOption(o => o.setName('raison').setDescription('La raison du bannissement')).addIntegerOption(o => o.setName('jours').setDescription('Nombre de jours de messages a supprimer (0-7)').setMinValue(0).setMaxValue(7)),
  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('❌ Tu dois mentionner un membre à bannir.\nUtilisation : `!ban <@membre> [raison]`');
    }

    // Vérifier la hiérarchie des rôles
    if (target.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply('❌ Tu ne peux pas bannir quelqu\'un avec un rôle supérieur ou égal au tien.');
    }

    // Vérifier si le bot peut ban
    if (!target.bannable) {
      return message.reply('❌ Je ne peux pas bannir ce membre. Vérifie que mon rôle est bien placé dans la hiérarchie.');
    }

    // Dernier argument numérique = nombre de jours de messages à supprimer
    const lastArg = args[args.length - 1];
    let deleteMessageDays = 0;
    let reasonParts = args.slice(1);

    if (/^\d+$/.test(lastArg) && parseInt(lastArg) >= 0 && parseInt(lastArg) <= 7) {
      deleteMessageDays = parseInt(lastArg);
      reasonParts = reasonParts.slice(0, -1);
    }

    const reason = reasonParts.join(' ') || 'Aucune raison spécifiée';

    try {
      await target.ban({ deleteMessageDays, reason });

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🔨 Membre banni')
        .addFields(
          { name: 'Membre', value: `${target.user.tag} (${target.user.id})`, inline: true },
          { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
          { name: 'Raison', value: reason, inline: false },
          { name: 'Messages supprimés', value: `${deleteMessageDays} jour(s)`, inline: true },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur ban :', error);
      message.reply('❌ Une erreur est survenue lors du bannissement.');
    }
  },
};
