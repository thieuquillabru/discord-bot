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

const TYPE_LABELS = {
  weapon: 'Arme',
  shield: 'Bouclier',
  potion: 'Potion',
  ring: 'Anneau',
  collectible: 'Collection',
};

module.exports = {
  data: { name: 'inventory' },
  slash: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Affiche ton inventaire')
    .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur dont voir l\'inventaire (optionnel)'))
    .addIntegerOption(opt => opt.setName('page').setDescription('Numéro de la page').setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const target = interaction.options.getUser('user') || user;
      const page = interaction.options.getInteger('page') || 1;
      const itemsPerPage = 6;

      const inventory = db.getInventory(guildId, target.id);
      const totalPages = Math.max(1, Math.ceil(inventory.length / itemsPerPage));

      if (page > totalPages) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Page introuvable')
              .setDescription(`L\'inventaire n\'a que **${totalPages}** page${totalPages > 1 ? 's' : ''}.`)
              .setTimestamp(),
          ],
        });
      }

      if (inventory.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.info)
              .setTitle('🎒 Inventaire vide')
              .setDescription(`${target.username} n\'a aucun objet. Utilise \`/shop\` pour en acheter !`)
              .setTimestamp(),
          ],
        });
      }

      const start = (page - 1) * itemsPerPage;
      const pageItems = inventory.slice(start, start + itemsPerPage);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle(`🎒 Inventaire de ${target.username}`)
        .setDescription(`**${inventory.length}** objet${inventory.length > 1 ? 's' : ''} • Page **${page}/${totalPages}**
Utilise \`/item <index> <action>\` pour interagir avec un objet.`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        const globalIndex = start + i;
        const rarityColor = RARITY_COLORS[item.rarity] || 0x9B9B9B;
        const typeLabel = TYPE_LABELS[item.type] || item.type;
        const rarityLabel = RARITY_LABELS[item.rarity] || item.rarity;

        embed.addFields({
          name: `${item.emoji} [${globalIndex}] ${item.name}`,
          value: `**${typeLabel}** | ${rarityLabel} | Prix d\'achat: ${item.price ? item.price.toLocaleString('fr-FR') + ' coins' : 'N/A'}`,
          inline: false,
        });
      }

      const row = new ActionRowBuilder();
      if (page > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_prev_${page}_${target.id}`)
            .setLabel('◀ Précédent')
            .setStyle(ButtonStyle.Primary),
        );
      }
      if (page < totalPages) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_next_${page}_${target.id}`)
            .setLabel('Suivant ▶')
            .setStyle(ButtonStyle.Primary),
        );
      }

      const components = row.components.length > 0 ? [row] : [];
      return interaction.reply({ embeds: [embed], components });
    } catch (err) {
      console.error('Inventory error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage de l\'inventaire.')
            .setTimestamp(),
        ],
      });
    }
  },
};
