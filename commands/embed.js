const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'embed' },
  description: 'Envoie un embed personnalisé en tant que bot',
  slash: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Envoie un embed personnalisé')
    .addStringOption(o => o.setName('titre').setDescription('Titre de l\'embed').setRequired(true).setMaxLength(256))
    .addStringOption(o => o.setName('description').setDescription('Description de l\'embed (max 2000 caractères)').setRequired(true).setMaxLength(2000))
    .addStringOption(o => o.setName('couleur').setDescription('Couleur hex (ex: FF5733) ou "info"/"success"/"error"').setRequired(false)),
  async execute(msg) {
    try {
      const title = msg.options.getString('titre');
      const description = msg.options.getString('description');
      const colorInput = msg.options.getString('couleur');

      let color;
      if (!colorInput) {
        color = 0x3498DB;
      } else if (colorInput.toLowerCase() === 'success') {
        color = 0x2ECC71;
      } else if (colorInput.toLowerCase() === 'error') {
        color = 0xE74C3C;
      } else if (colorInput.toLowerCase() === 'info') {
        color = 0x3498DB;
      } else {
        const cleaned = colorInput.replace('#', '');
        if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
          const errEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('❌ Couleur invalide')
            .setDescription('Utilise un code hex (ex: `FF5733`) ou `info`/`success`/`error`.')
            .setFooter({ text: msg.user.username });
          return msg.reply({ embeds: [errEmbed], ephemeral: true });
        }
        color = parseInt(cleaned, 16);
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: `Créé par ${msg.user.tag}` })
        .setTimestamp();

      await msg.channel.send({ embeds: [embed] });

      const confirm = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Embed envoyé')
        .setDescription('L\'embed a été envoyé avec succès.')
        .setFooter({ text: msg.user.username });
      await msg.reply({ embeds: [confirm], ephemeral: true });
    } catch (err) {
      console.error('Erreur embed:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'envoi de l\'embed.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
