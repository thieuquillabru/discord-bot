const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const CHOICES = [
  { name: 'Pierre', emoji: '🪨', beats: 'Ciseaux' },
  { name: 'Papier', emoji: '📄', beats: 'Pierre' },
  { name: 'Ciseaux', emoji: '✂️', beats: 'Papier' },
];

// Stockage des parties en cours
const activeGames = new Map();

module.exports = {
  data: { name: 'rps' },
  description: 'Joue au Pierre-Papier-Ciseaux contre le bot',
  cooldown: 5,
  async execute(message) {
    // Vérifier si l'utilisateur a déjà une partie en cours
    if (activeGames.has(message.author.id)) {
      return message.reply('⏳ Tu as déjà une partie en cours ! Finis-la d\'abord.');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('🪨 Pierre')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('📄 Papier')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('✂️ Ciseaux')
        .setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎮 Pierre-Papier-Ciseaux')
      .setDescription('Choisis ton coup !')
      .setFooter({ text: `Partie de ${message.author.tag}` });

    const reply = await message.reply({ embeds: [embed], components: [row] });

    // Enregistrer la partie
    activeGames.set(message.author.id, { channelId: message.channel.id, messageId: reply.id });

    // Timeout automatique après 30s
    setTimeout(() => {
      if (activeGames.has(message.author.id)) {
        activeGames.delete(message.author.id);
        // Désactiver les boutons
        const disabledRow = ActionRowBuilder.from(row).setComponents(
          row.components.map(c => ButtonBuilder.from(c).setDisabled(true))
        );
        reply.edit({
          embeds: [embed.setDescription('⏰ Temps écoulé ! La partie a été annulée.')],
          components: [disabledRow],
        }).catch(() => {});
      }
    }, 30000);
  },

  // Exposer CHOICES et activeGames pour l'event interactionCreate
  CHOICES,
  activeGames,
};
