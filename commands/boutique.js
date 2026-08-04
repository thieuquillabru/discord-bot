const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shopdata = require('../shopdata');

const PER_PAGE = 5;
const SEP = '__';

/** Returns true if url looks like a valid http(s) link (not a data URI) */
function isValidImageUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url) && url.length <= 2048;
}

/** Encode page + search into a boutique customId (max 100 chars) */
function encodeCustomId(action, page, search) {
  if (!search) return `boutique_${action}_${page}`;
  const encoded = encodeURIComponent(search);
  const id = `boutique_${action}_${page}${SEP}${encoded}`;
  return id.length > 100 ? id.slice(0, 97) + '...' : id;
}

/** Decode a boutique customId → { page, search } */
function decodeCustomId(customId) {
  const parts = customId.split(SEP);
  const page = parseInt(parts[0].split('_').pop()) || 1;
  const search = parts[1] ? decodeURIComponent(parts[1]) : '';
  return { page, search };
}

/** Filter products by search query (name, description, category) */
function searchProducts(products, query) {
  if (!query) return products;
  const q = query.toLowerCase();
  return products.filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.description && p.description.toLowerCase().includes(q)) ||
    (p.category && p.category.toLowerCase().includes(q))
  );
}

module.exports = {
  data: { name: 'boutique' },
  slash: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Parcourir la boutique du serveur')
    .addStringOption(opt =>
      opt.setName('recherche')
        .setDescription('Rechercher un produit par nom, description ou catégorie')
        .setRequired(false)
        .setMaxLength(50)
    ),

  async execute(msg, args, client) {
    try {
      await msg.deferReply({ ephemeral: true });
      const searchQuery = msg.options?.getString('recherche') || '';
      await this.showShop(msg, 1, null, searchQuery);
    } catch (err) {
      console.error('[BOUTIQUE] Erreur execute:', err);
      const errorReply = { content: '\u274c Une erreur est survenue lors de l\'affichage de la boutique.', embeds: [], components: [] };
      try {
        await msg.editReply(errorReply);
      } catch {
        try {
          await msg.followUp({ ...errorReply, ephemeral: true });
        } catch (replyErr) {
          console.error('[BOUTIQUE] Erreur reply fallback:', replyErr);
        }
      }
    }
  },

  async showShop(msg, page, categoryFilter, searchQuery) {
    let products;
    try {
      products = shopdata.getActive();
    } catch (err) {
      console.error('[BOUTIQUE] Erreur lecture produits:', err);
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('\uD83C\uDFEA Boutique')
        .setDescription('Erreur de chargement des produits. R\u00e9essaie plus tard.');
      return msg.editReply({ embeds: [embed] });
    }

    if (categoryFilter) {
      products = products.filter(p => p.category?.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Apply search filter
    if (searchQuery) {
      products = searchProducts(products, searchQuery);
    }

    // Empty state with search context
    if (products.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('\uD83C\uDFEA Boutique')
        .setDescription(searchQuery
          ? `Aucun produit trouv\u00e9 pour **\`${searchQuery}\`**.\nEssaie un autre terme de recherche.`
          : 'Aucun produit disponible pour le moment.\nReviens plus tard !');
      const components = [];
      if (searchQuery) {
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(encodeCustomId('showall', 1, '')).setLabel('\uD83D\uDD0D Voir tous les produits').setStyle(ButtonStyle.Secondary)
        ));
      }
      return msg.editReply({ embeds: [embed], components });
    }

    const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PER_PAGE;
    const pageProducts = products.slice(start, start + PER_PAGE);

    // Title and description
    const title = searchQuery ? `\uD83D\uDD0D Recherche : \`${searchQuery}\`` : '\uD83C\uDFEA Boutique du serveur';
    const desc = `${products.length} produit${products.length > 1 ? 's' : ''} trouv\u00e9${products.length > 1 ? 's' : ''} \u2022 Page **${p}/${totalPages}**`;

    const embed = new EmbedBuilder()
      .setColor(searchQuery ? 0x2196F3 : 0xFF9800)
      .setTitle(title)
      .setDescription(desc)
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

    // Only set image if it's a valid http(s) URL
    const imgUrl = pageProducts[0]?.image;
    if (isValidImageUrl(imgUrl)) {
      embed.setImage(imgUrl);
    }

    const components = [];

    // Row 1: Buy buttons
    const buyRow = new ActionRowBuilder();
    for (const prod of pageProducts) {
      const label = `Acheter ${prod.name}`;
      buyRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${prod.id}`)
          .setLabel(label.length > 80 ? label.slice(0, 77) + '...' : label)
          .setStyle(ButtonStyle.Success)
          .setEmoji('\uD83D\uDCB3')
      );
    }
    if (buyRow.components.length > 0) components.push(buyRow);

    // Row 2: Navigation + search clear
    const navRow = new ActionRowBuilder();
    if (p > 1) navRow.addComponents(new ButtonBuilder().setCustomId(encodeCustomId('prev', p, searchQuery)).setLabel('\u25C0 Pr\u00e9c\u00e9dent').setStyle(ButtonStyle.Primary));
    if (p < totalPages) navRow.addComponents(new ButtonBuilder().setCustomId(encodeCustomId('next', p, searchQuery)).setLabel('Suivant \u25B6').setStyle(ButtonStyle.Primary));
    if (searchQuery) {
      navRow.addComponents(new ButtonBuilder().setCustomId(encodeCustomId('showall', 1, '')).setLabel('\u2715').setStyle(ButtonStyle.Danger));
    }
    if (navRow.components.length > 0) components.push(navRow);

    await msg.editReply({ embeds: [embed], components });
  },

  async handleButton(interaction, client) {
    try {
      const { page, search } = decodeCustomId(interaction.customId);

      let products;
      try {
        products = shopdata.getActive();
      } catch (err) {
        console.error('[BOUTIQUE] Erreur lecture produits (btn):', err);
        return interaction.reply({ content: '\u274c Erreur de chargement des produits.', ephemeral: true });
      }

      // Apply search filter
      const filtered = search ? searchProducts(products, search) : products;

      if (filtered.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle('\uD83C\uDFEA Boutique')
          .setDescription(search
            ? `Aucun produit trouv\u00e9 pour **\`${search}\`**.`
            : 'Aucun produit disponible.');
        const components = [];
        if (search) {
          components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(encodeCustomId('showall', 1, '')).setLabel('\uD83D\uDD0D Voir tous les produits').setStyle(ButtonStyle.Secondary)
          ));
        }
        return interaction.update({ embeds: [embed], components });
      }

      const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
      const p = Math.min(Math.max(1, page), totalPages);
      const start = (p - 1) * PER_PAGE;
      const pageProducts = filtered.slice(start, start + PER_PAGE);

      const title = search ? `\uD83D\uDD0D Recherche : \`${search}\`` : '\uD83C\uDFEA Boutique du serveur';
      const desc = `${filtered.length} produit${filtered.length > 1 ? 's' : ''} trouv\u00e9${filtered.length > 1 ? 's' : ''} \u2022 Page **${p}/${totalPages}**`;

      const embed = new EmbedBuilder()
        .setColor(search ? 0x2196F3 : 0xFF9800)
        .setTitle(title)
        .setDescription(desc)
        .setTimestamp();

      for (const prod of pageProducts) {
        const stockInfo = prod.stock === -1 ? '\u221e illimit\u00e9' : `${prod.stock} restant${prod.stock > 1 ? 's' : ''}`;
        embed.addFields({
          name: prod.name,
          value: `${prod.description ? prod.description + '\n' : ''}\uD83D\uDCB0 **${prod.price.toLocaleString('fr-FR')} Ar** | \uD83D\uDCE6 ${stockInfo}`,
          inline: false,
        });
      }

      const imgUrl = pageProducts[0]?.image;
      if (isValidImageUrl(imgUrl)) {
        embed.setImage(imgUrl);
      }

      const components = [];

      const buyRow = new ActionRowBuilder();
      for (const prod of pageProducts) {
        const label = `Acheter ${prod.name}`;
        buyRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${prod.id}`)
            .setLabel(label.length > 80 ? label.slice(0, 77) + '...' : label)
            .setStyle(ButtonStyle.Success)
            .setEmoji('\uD83D\uDCB3')
        );
      }
      if (buyRow.components.length > 0) components.push(buyRow);

      const navRow = new ActionRowBuilder();
      if (p > 1) navRow.addComponents(new ButtonBuilder().setCustomId(encodeCustomId('prev', p, search)).setLabel('\u25C0 Pr\u00e9c\u00e9dent').setStyle(ButtonStyle.Primary));
      if (p < totalPages) navRow.addComponents(new ButtonBuilder().setCustomId(encodeCustomId('next', p, search)).setLabel('Suivant \u25B6').setStyle(ButtonStyle.Primary));
      if (search) {
        navRow.addComponents(new ButtonBuilder().setCustomId(encodeCustomId('showall', 1, '')).setLabel('\u2715').setStyle(ButtonStyle.Danger));
      }
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
