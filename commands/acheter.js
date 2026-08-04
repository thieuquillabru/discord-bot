const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shopdata = require('../shopdata');
const payments = require('../payments');

module.exports = {
  data: { name: 'acheter' },
  slash: new SlashCommandBuilder()
    .setName('acheter')
    .setDescription('Acheter un produit de la boutique')
    .addStringOption(o => o.setName('produit').setDescription('Nom ou ID du produit').setRequired(true)),

  async execute(msg, args, client) {
    if (msg._interaction) return this.executeInteraction(msg, client);
    return msg.reply({ content: 'Utilise **/acheter** avec le nom du produit.', ephemeral: true });
  },

  async executeInteraction(msg, client) {
    const query = msg.options.getString('produit');
    const products = shopdata.getActive();

    // Search by ID first, then by name
    let product = products.find(p => p.id === query);
    if (!product) {
      product = products.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
    }
    if (!product) {
      // Try partial match
      product = products.find(p => query.toLowerCase().split(' ').every(w => p.name.toLowerCase().includes(w)));
    }

    if (!product) {
      return msg.reply({ content: `❌ Produit "${query}" introuvable. Utilise **/boutique** pour voir les produits disponibles.`, ephemeral: true });
    }

    await payments.showPaymentInfo(msg, product.id, client);
  },
};
