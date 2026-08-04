const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// Stockage des derniers messages supprimés par canal (1 par canal, auto-nettoyé 60s)
const deletedMessages = new Map();

module.exports = {
  data: { name: 'snipe' },
  description: 'Affiche le dernier message supprimé dans ce canal',
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('snipe').setDescription('Affiche le dernier message supprime dans ce canal'),
  async execute(message) {
    const key = message.channel.id;
    const sniped = deletedMessages.get(key);

    if (!sniped) {
      return message.reply('❌ Aucun message supprimé récemment dans ce canal.');
    }

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setAuthor({ name: sniped.author.tag, iconURL: sniped.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(sniped.content || '*Aucun contenu texte*')
      .setFooter({ text: `Supprimé le ${sniped.deletedAt.toLocaleString('fr-FR')}` })
      .setTimestamp();

    if (sniped.attachments && sniped.attachments.length > 0) {
      const links = sniped.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
      embed.addFields({ name: 'Pièces jointes', value: links, inline: false });
      const img = sniped.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
      if (img) {
        embed.setImage(img.url);
      }
    }

    await message.reply({ embeds: [embed] });
  },

  // Exposer le Map pour l'event messageDelete
  deletedMessages,
};
