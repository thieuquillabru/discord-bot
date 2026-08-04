const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'slowmode' },
  description: 'Définit un ralentisseur (slowmode) sur le canal actuel',
  usage: '<durée en secondes (0 pour désactiver)>',
  permissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('slowmode').setDescription('Definit un ralentisseur sur le canal').addIntegerOption(o => o.setName('secondes').setDescription('Duree en secondes (0 pour desactiver, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600)),
  async execute(message, args) {
    const seconds = parseInt(args[0]);

    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply('❌ Spécifie une durée entre 0 et 21600 secondes (6h max).\nUtilisation : `!slowmode <secondes>`');
    }

    try {
      await message.channel.setRateLimitPerUser(seconds);

      let desc;
      if (seconds === 0) {
        desc = 'Le slowmode a été **désactivé**.';
      } else {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        let readable = '';
        if (h > 0) readable += `${h}h `;
        if (m > 0) readable += `${m}m `;
        if (s > 0) readable += `${s}s`;
        desc = `Le slowmode a été défini sur **${readable.trim()}**.`;
      }

      const embed = new EmbedBuilder()
        .setColor(seconds === 0 ? 0x2ECC71 : 0xF39C12)
        .setTitle(seconds === 0 ? '⏩ Slowmode désactivé' : '⏳ Slowmode activé')
        .setDescription(desc)
        .setFooter({ text: `Par ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur slowmode :', error);
      message.reply('❌ Impossible de modifier le slowmode.');
    }
  },
};
