const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'unmute' },
  description: 'Retire le mute d\'un membre',
  usage: '<@membre>',
  permissions: [PermissionFlagsBits.ModerateMembers],
  requireModRole: false,
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('unmute').setDescription('Retire le mute d\'un membre').addUserOption(o => o.setName('membre').setDescription('Le membre a unmute').setRequired(true)),
  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('❌ Tu dois mentionner un membre à unmute.\nUtilisation : `!unmute <@membre>`');
    }

    if (!target.communicationDisabledUntil) {
      return message.reply('ℹ️ Ce membre n\'est pas mute.');
    }

    try {
      await target.timeout(null);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🔊 Membre unmute')
        .addFields(
          { name: 'Membre', value: `${target.user.tag} (${target.user.id})`, inline: true },
          { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur unmute :', error);
      message.reply('❌ Une erreur est survenue lors de l\'unmute.');
    }
  },
};
