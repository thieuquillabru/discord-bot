const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const shopdata = require('../shopdata');

module.exports = {
  data: { name: 'boutique' },
  slash: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Parcourir la boutique du serveur')
    .addIntegerOption(o => o.setName('page').setDescription('Numéro de page').setMinValue(1))
    .addStringOption(o => o.setName('catégorie').setDescription('Filtrer par catégorie')),

  async execute(msg, args, client) {
    if (msg._interaction) return this.executeInteraction(msg, args, client);
    const page = parseInt(args[0]) || 1;
    this.showShop(msg, page, null);
  },

  async executeInteraction(msg) {
    const page = msg.options.getInteger('page') || 1;
    const category = msg.options.getString('catégorie');
    this.showShop(msg, page, category);
  },

  async showShop(msg, page, categoryFilter) {
    let products = shopdata.getActive();
    if (categoryFilter) {
      products = products.filter(p => p.category?.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (products.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('🏪 Boutique')
        .setDescription('Aucun produit disponible pour le moment.');
      return msg.reply({ embeds: [embed], ephemeral: true });
    }

    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(products.length / perPage));
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * perPage;
    const pageProducts = products.slice(start, start + perPage);

    const categories = [...new Set(products.map(pr => pr.category))];

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🏪 Boutique du serveur')
      .setDescription(`${products.length} produit${products.length > 1 ? 's' : ''} disponible${products.length > 1 ? 's' : ''} ${categoryFilter ? `dans **${categoryFilter}**` : ''}\nPage **${p}/${totalPages}**`)
      .setFooter({ text: `Catégories: ${categories.join(', ') || 'Aucune'}` })
      .setTimestamp();

    for (const prod of pageProducts) {
      const value = `${prod.description ? prod.description + '\n' : ''}💰 **Prix : ${prod.price.toLocaleString('fr-FR')}** ${prod.currency || ''}${prod.stock !== -1 ? ` | 📦 Stock : ${prod.stock}` : ' | 📦 Stock illimité'}`;
      embed.addFields({
        name: `${prod.name}`,
        value,
        inline: false,
      });
      if (prod.image) {
        embed.setImage(prod.image);
        break;
      }
    }

    const row = new ActionRowBuilder();
    if (p > 1) row.addComponents(new ButtonBuilder().setCustomId(`boutique_prev_${p}`).setLabel('◀').setStyle(ButtonStyle.Primary));
    if (p < totalPages) row.addComponents(new ButtonBuilder().setCustomId(`boutique_next_${p}`).setLabel('▶').setStyle(ButtonStyle.Primary));

    const reply = { embeds: [embed] };
    if (row.components.length > 0) reply.components = [row];
    if (msg.replied || msg.deferred) await msg.followUp(reply);
    else if (msg.deferReply) await msg.reply(reply);
    else await msg.reply(reply);
  },

  async handleButton(interaction, client) {
    const page = interaction.customId.startsWith('boutique_prev_')
      ? parseInt(interaction.customId.split('_')[2]) - 1
      : parseInt(interaction.customId.split('_')[2]) + 1;
    const products = shopdata.getActive();
    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(products.length / perPage));
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * perPage;
    const pageProducts = products.slice(start, start + perPage);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🏪 Boutique du serveur')
      .setDescription(`${products.length} produit${products.length > 1 ? 's' : ''} disponibles\nPage **${p}/${totalPages}**`)
      .setTimestamp();

    for (const prod of pageProducts) {
      embed.addFields({
        name: prod.name,
        value: `${prod.description ? prod.description + '\n' : ''}💰 **${prod.price.toLocaleString('fr-FR')}** ${prod.stock !== -1 ? `| 📦 ${prod.stock}` : '| 📦 ∞'}`,
        inline: false,
      });
      if (prod.image) { embed.setImage(prod.image); break; }
    }

    const row = new ActionRowBuilder();
    if (p > 1) row.addComponents(new ButtonBuilder().setCustomId(`boutique_prev_${p}`).setLabel('◀').setStyle(ButtonStyle.Primary));
    if (p < totalPages) row.addComponents(new ButtonBuilder().setCustomId(`boutique_next_${p}`).setLabel('▶').setStyle(ButtonStyle.Primary));

    const reply = { embeds: [embed] };
    if (row.components.length > 0) reply.components = [row];
    await interaction.update(reply);
  },
};
