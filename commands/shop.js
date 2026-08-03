const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const db = require('../database');

const RARITY_COLORS = {
  common: 0x9B9B9B,
  uncommon: 0x2ECC71,
  rare: 0x3498DB,
  epic: 0x9B59B6,
  legendary: 0xF1C40F,
};

const RARITY_LABELS = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

module.exports = {
  data: { name: 'shop' },
  slash: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Affiche le magasin du serveur')
    .addIntegerOption(opt => opt.setName('page').setDescription('Numéro de la page').setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, user } = interaction;
      const page = interaction.options.getInteger('page') || 1;
      const itemsPerPage = 8;

      const shopItems = db.ensureShop(guildId);
      const totalPages = Math.max(1, Math.ceil(shopItems.length / itemsPerPage));

      if (page > totalPages) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Page introuvable')
              .setDescription(`Le magasin n'a que **${totalPages}** page${totalPages > 1 ? 's' : ''}.`)
              .setTimestamp(),
          ],
        });
      }

      const start = (page - 1) * itemsPerPage;
      const pageItems = shopItems.slice(start, start + itemsPerPage);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle('🏪 Magasin')
        .setDescription(`Utilise \`/buy <id>\` pour acheter un objet.\nPage **${page}/${totalPages}**`)
        .setTimestamp();

      for (const item of pageItems) {
        const rarityColor = RARITY_COLORS[item.rarity] || 0x9B9B9B;
        embed.addFields({
          name: `${item.emoji} #${item.id} ${item.name}`,
          value: `**${item.price.toLocaleString('fr-FR')}** coins | ${RARITY_LABELS[item.rarity] || item.rarity} | ${item.description}`,
          inline: false,
        });
      }

      const row = new ActionRowBuilder();
      if (page > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`shop_prev_${page}`)
            .setLabel('◀ Précédent')
            .setStyle(ButtonStyle.Primary),
        );
      }
      if (page < totalPages) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`shop_next_${page}`)
            .setLabel('Suivant ▶')
            .setStyle(ButtonStyle.Primary),
        );
      }

      const components = row.components.length > 0 ? [row] : [];
      return interaction.reply({ embeds: [embed], components });
    } catch (err) {
      console.error('Shop error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage du magasin.')
            .setTimestamp(),
        ],
      });
    }
  },
};
