const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'color' },
  description: 'Affiche un aperçu d\'une couleur hexadécimale',
  slash: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Affiche un aperçu d\'une couleur')
    .addStringOption(o => o.setName('hex').setDescription('Code hex (ex: #FF5733) ou "random"').setRequired(true)),
  async execute(msg) {
    try {
      let input = msg.options.getString('hex').trim();
      let hexColor;

      if (input.toLowerCase() === 'random') {
        hexColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      } else {
        // Nettoyer l'entrée
        if (input.startsWith('#')) input = input.slice(1);
        if (!/^[0-9A-Fa-f]{6}$/.test(input)) {
          const errEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('❌ Couleur invalide')
            .setDescription('Le format doit être un code hexadécimal (ex: `FF5733` ou `#FF5733`) ou `random`.')
            .setFooter({ text: msg.user.username });
          return msg.reply({ embeds: [errEmbed], ephemeral: true });
        }
        hexColor = '#' + input.toUpperCase();
      }

      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      // Calculer la luminance pour choisir la couleur du texte de l'aperçu
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const textColor = luminance > 0.5 ? '`███`' : '`███`';

      const embed = new EmbedBuilder()
        .setColor(parseInt(hexColor.replace('#', ''), 16))
        .setTitle(`🎨 Aperçu de la couleur ${hexColor}`)
        .setDescription(`### ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n### ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n### ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n**HEX :** \`${hexColor}\`\n**RGB :** \`${r}, ${g}, ${b}\`\n**Luminance :** \`${Math.round(luminance * 100)}%\``)
        .setFooter({ text: `Demandé par ${msg.user.tag}` })
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur color:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
