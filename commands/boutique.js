const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shopdata = require('../shopdata');
const { getFeatureSettings } = require('../features');

const PER_PAGE = 3;

module.exports = {
  data: { name: 'boutique' },
  slash: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Parcourir la boutique du serveur'),

  async execute(msg, args, client) {
    try {
      if (msg._interaction) {
        await this.showShop(msg, 1);
      } else {
        await this.showShop(msg, 1);
      }
    } catch (err) {
      console.error('[BOUTIQUE] Erreur execute:', err);
      const errorReply = { content: '\u274c Une erreur est survenue lors de l\'affichage de la boutique.', ephemeral: true };
      try {
        if (msg.replied || msg.deferred) await msg.followUp(errorReply);
        else await msg.reply(errorReply);
      } catch (replyErr) {
        console.error('[BOUTIQUE] Erreur reply:', replyErr);
      }
    }
  },

  async showShop(msg, page, categoryFilter) {
    let products;
    try {
      products = shopdata.getActive();
    } catch (err) {
      console.error('[BOUTIQUE] Erreur lecture produits:', err);
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('\uD83C\uDFEA Boutique')
        .setDescription('Erreur de chargement des produits. R\u00e9essaie plus tard.');
      if (msg.replied || msg.deferred) return msg.followUp({ embeds: [embed], ephemeral: true });
      return msg.reply({ embeds: [embed], ephemeral: true });
    }

    if (categoryFilter) {
      products = products.filter(p => p.category?.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (products.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('\uD83C\uDFEA Boutique')
        .setDescription('Aucun produit disponible pour le moment.\nReviens plus tard !');
      if (msg.replied || msg.deferred) return msg.followUp({ embeds: [embed], ephemeral: true });
      return msg.reply({ embeds: [embed], ephemeral: true });
    }

    const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PER_PAGE;
    const pageProducts = products.slice(start, start + PER_PAGE);

    const embed = new EmbedBuilder()
      .setColor(0xFF9800)
      .setTitle('\uD83C\uDFEA Boutique du serveur')
      .setDescription(`${products.length} produit${products.length > 1 ? 's' : ''} disponible${products.length > 1 ? 's' : ''}\nPage **${p}/${totalPages}**`)
      .setTimestamp();

    for (const prod of pageProducts) {
      const stockInfo = prod.stock === -1 ? '\u221e illimit\u00e9' : `${prod.stock} restant${prod.stock > 1 ? 's' : ''}`;
      const value = `${prod.description ? prod.description + '\n' : ''}\uD83D\uDCB0 **Prix : ${prod.price.toLocaleString('fr-FR')} Ar** \n\uD83D\uDCE6 Stock : ${stockInfo}`;
      embed.addFields({
        name: prod.name,
        value,
        inline: false,
      });
    }

    if (pageProducts[0]?.image) {
      embed.setImage(pageProducts[0].image);
    }

    // Navigation row
    const navRow = new ActionRowBuilder();
    if (p > 1) navRow.addComponents(new ButtonBuilder().setCustomId(`boutique_prev_${p}`).setLabel('\u25C0 Pr\u00e9c\u00e9dent').setStyle(ButtonStyle.Primary));
    if (p < totalPages) navRow.addComponents(new ButtonBuilder().setCustomId(`boutique_next_${p}`).setLabel('Suivant \u25B6').setStyle(ButtonStyle.Primary));

    // Buy buttons row
    const buyRow = new ActionRowBuilder();
    for (const prod of pageProducts) {
      buyRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${prod.id}`)
          .setLabel(`Acheter ${prod.name}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('\uD83D\uDCB3')
      );
    }

    const components = [];
    if (buyRow.components.length > 0) components.push(buyRow);
    if (navRow.components.length > 0) components.push(navRow);

    const reply = { embeds: [embed] };
    if (components.length > 0) reply.components = components;

    if (msg.replied || msg.deferred) await msg.followUp(reply);
    else await msg.reply(reply);
  },

  async handleButton(interaction, client) {
    try {
      const page = interaction.customId.startsWith('boutique_prev_')
        ? parseInt(interaction.customId.split('_')[2]) - 1
        : parseInt(interaction.customId.split('_')[2]) + 1;

      let products;
      try {
        products = shopdata.getActive();
      } catch (err) {
        console.error('[BOUTIQUE] Erreur lecture produits (btn):', err);
        return interaction.reply({ content: '\u274c Erreur de chargement des produits.', ephemeral: true });
      }

      const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
      const p = Math.min(Math.max(1, page), totalPages);
      const start = (p - 1) * PER_PAGE;
      const pageProducts = products.slice(start, start + PER_PAGE);

      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle('\uD83C\uDFEA Boutique du serveur')
        .setDescription(`${products.length} produit${products.length > 1 ? 's' : ''} disponibles\nPage **${p}/${totalPages}**`)
        .setTimestamp();

      for (const prod of pageProducts) {
        const stockInfo = prod.stock === -1 ? '\u221e illimit\u00e9' : `${prod.stock} restant${prod.stock > 1 ? 's' : ''}`;
        embed.addFields({
          name: prod.name,
          value: `${prod.description ? prod.description + '\n' : ''}\uD83D\uDCB0 **${prod.price.toLocaleString('fr-FR')} Ar** | \uD83D\uDCE6 ${stockInfo}`,
          inline: false,
        });
      }
      if (pageProducts[0]?.image) embed.setImage(pageProducts[0].image);

      const navRow = new ActionRowBuilder();
      if (p > 1) navRow.addComponents(new ButtonBuilder().setCustomId(`boutique_prev_${p}`).setLabel('\u25C0 Pr\u00e9c\u00e9dent').setStyle(ButtonStyle.Primary));
      if (p < totalPages) navRow.addComponents(new ButtonBuilder().setCustomId(`boutique_next_${p}`).setLabel('Suivant \u25B6').setStyle(ButtonStyle.Primary));

      const buyRow = new ActionRowBuilder();
      for (const prod of pageProducts) {
        buyRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${prod.id}`)
            .setLabel(`Acheter ${prod.name}`)
            .setStyle(ButtonStyle.Success)
            .setEmoji('\uD83D\uDCB3')
        );
      }

      const components = [];
      if (buyRow.components.length > 0) components.push(buyRow);
      if (navRow.components.length > 0) components.push(navRow);

      await interaction.update({ embeds: [embed], components });
    } catch (err) {
      console.error('[BOUTIQUE] Erreur handleButton:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '\u274c Erreur lors de la navigation.', ephemeral: true }).catch(() => {});
      }
    }
  },
};
