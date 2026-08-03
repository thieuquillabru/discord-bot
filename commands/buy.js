const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

const RARITY_LABELS = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

module.exports = {
  data: { name: 'buy' },
  slash: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Achète un objet du magasin')
    .addIntegerOption(opt => opt.setName('item_id').setDescription('L\'ID de l\'objet à acheter').setRequired(true).setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const itemId = interaction.options.getInteger('item_id');

      const shopItems = db.ensureShop(guildId);
      const item = shopItems.find(i => i.id === itemId);

      if (!item) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Objet introuvable')
              .setDescription(`Aucun objet avec l\'ID **${itemId}** n\'existe dans le magasin.`)
              .setTimestamp(),
          ],
        });
      }

      const money = db.getMoney(guildId, userId);
      if (money < item.price) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Fonds insuffisants')
              .setDescription(`Tu as besoin de **${item.price.toLocaleString('fr-FR')}** coins mais tu n\'as que **${money.toLocaleString('fr-FR')}** coins.`)
              .setTimestamp(),
          ],
        });
      }

      db.addMoney(guildId, userId, -item.price);
      db.addToInventory(guildId, userId, {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        type: item.type,
        rarity: item.rarity,
        price: item.price,
        description: item.description,
      });
      db.addXP(guildId, userId, 10);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🛒 Achat réussi !')
        .setDescription(`Tu as acheté **${item.emoji} ${item.name}** !`)
        .addFields(
          { name: '🏷️ Rareté', value: RARITY_LABELS[item.rarity] || item.rarity, inline: true },
          { name: '💸 Prix payé', value: `**${item.price.toLocaleString('fr-FR')}** coins`, inline: true },
          { name: '🪙 Solde restant', value: `**${(money - item.price).toLocaleString('fr-FR')}** coins`, inline: true },
          { name: '📝 Description', value: item.description, inline: false },
        )
        .setFooter({ text: `${user.tag} • Utilise /inventory pour voir tes objets` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Buy error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'achat.')
            .setTimestamp(),
        ],
      });
    }
  },
};
