const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'qrcode' },
  description: 'Génère un QR code à partir d\'un texte',
  slash: new SlashCommandBuilder()
    .setName('qrcode')
    .setDescription('Génère un QR code à partir d\'un texte ou d\'un lien')
    .addStringOption(o => o.setName('texte').setDescription('Texte ou URL à encoder').setRequired(true).setMaxLength(500)),
  async execute(msg) {
    try {
      const text = msg.options.getString('texte');
      const encoded = encodeURIComponent(text);
      const url = 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=' + encoded;

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📱 QR Code')
        .setDescription('QR code généré pour le texte ci-dessous.')
        .setImage(url)
        .addFields({ name: 'Texte encodé', value: text.length > 1024 ? text.slice(0, 1024) + '...' : text, inline: false })
        .setFooter({ text: 'Demandé par ' + msg.user.tag })
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur qrcode:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la génération du QR code.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
