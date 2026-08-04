const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shopdata = require('./shopdata');
const orders = require('./orders');
const { getFeatureSettings } = require('./features');

// In-memory pending payments (productId -> { user, product, timestamp })
const pendingPayments = new Map();

/**
 * Send email notification via Formsubmit.co (free, no SMTP needed)
 */
async function sendPaymentNotification(product, senderNumber, userName, userId) {
  const shopSettings = getFeatureSettings('shop');
  const ownerEmail = shopSettings.ownerEmail || 'mathieurambelomanana@gmail.com';
  const mmNumber = shopSettings.mmNumber || '032 81 381 58';
  const operator = shopSettings.mmOperator || 'Telma';
  const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' });

  try {
    const formData = new URLSearchParams();
    formData.append('_subject', `[GAMER MG BOT] Nouveau paiement - ${product.name}`);
    formData.append('_template', 'box');
    formData.append('_captcha', 'false');
    formData.append('Produit', product.name);
    formData.append('Prix', `${product.price.toLocaleString('fr-FR')} Ar`);
    formData.append('Numero_envoi', senderNumber);
    formData.append('Acheteur', `${userName} (ID: ${userId})`);
    formData.append('Numero_MM', mmNumber);
    formData.append('Operateur', operator);
    formData.append('Date', timestamp);

    const response = await fetch(`https://formsubmit.co/ajax/${ownerEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: formData.toString(),
    });

    const result = await response.json();
    console.log(`\uD83D\uDCE7 Email notification sent: ${result.message || 'OK'}`);
    return true;
  } catch (err) {
    console.error('\u274c Email notification failed:', err.message);
    return false;
  }
}

/**
 * Show payment info when user clicks "Acheter" on a product
 */
async function showPaymentInfo(interaction, productId, client) {
  const product = shopdata.getById(productId);
  if (!product) {
    return interaction.reply({ content: '\u274c Produit introuvable.', ephemeral: true });
  }

  if (product.stock === 0) {
    return interaction.reply({ content: '\u274c Ce produit est en rupture de stock.', ephemeral: true });
  }

  const shopSettings = getFeatureSettings('shop');
  const mmNumber = shopSettings.mmNumber || '032 81 381 58';
  const operator = shopSettings.mmOperator || 'Telma';

  const embed = new EmbedBuilder()
    .setColor(0xFF9800)
    .setTitle(`\uD83D\uDCB3 Paiement - ${product.name}`)
    .setDescription(
      `Tu es sur le point d'acheter :\n\n` +
      `**${product.name}**\n` +
      (product.description ? product.description + '\n' : '') +
      `\uD83D\uDCB0 **Prix : ${product.price.toLocaleString('fr-FR')} Ar**\n\n` +
      `\uD83D\uDCE1 **Envoye l'argent \u00e0 ce num\u00e9ro ${operator} :**\n` +
      `\`\`\`${mmNumber}\`\`\`\n\n` +
      `Une fois le paiement effectu\u00e9, clique sur le bouton **V\u00e9rifier** ci-dessous et entre ton num\u00e9ro d'envoi.`
    )
    .setThumbnail(product.image || null)
    .setFooter({ text: "Assure-toi d'avoir envoy\u00e9 le bon montant avant de v\u00e9rifier." })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_verify_${productId}`)
      .setLabel('\u2705 V\u00e9rifier mon paiement')
      .setStyle(ButtonStyle.Success)
      .setEmoji('\u2705'),
    new ButtonBuilder()
      .setCustomId(`buy_cancel_${productId}`)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('\u274C')
  );

  pendingPayments.set(`${interaction.user.id}_${productId}`, {
    user: interaction.user,
    product,
    timestamp: Date.now(),
  });

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Show verification modal when user clicks "V\u00e9rifier"
 */
async function showVerifyModal(interaction, productId) {
  const key = `${interaction.user.id}_${productId}`;
  const pending = pendingPayments.get(key);
  if (!pending) {
    return interaction.reply({ content: "\u274c Aucun achat en cours. Clique d'abord sur \"Acheter\".", ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`buy_modal_${productId}`)
    .setTitle(`V\u00e9rification - ${pending.product.name}`);

  const senderNumberInput = new TextInputBuilder()
    .setCustomId('sender_number')
    .setLabel("Num\u00e9ro depuis lequel tu as envoy\u00e9 l'argent")
    .setPlaceholder('Ex: 034 12 345 67')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(senderNumberInput));
  await interaction.showModal(modal);
}

/**
 * Handle modal submission - verify payment, send email, save order
 */
async function handleModalSubmit(interaction, productId) {
  const senderNumber = interaction.fields.getTextInputValue('sender_number');
  const key = `${interaction.user.id}_${productId}`;
  const pending = pendingPayments.get(key);

  if (!pending) {
    return interaction.reply({ content: '\u274c Session expir\u00e9e. Refais un achat depuis la boutique.', ephemeral: true });
  }

  const { product, user } = pending;
  const shopSettings = getFeatureSettings('shop');
  const mmNumber = shopSettings.mmNumber || '032 81 381 58';

  // Send email notification
  const emailSent = await sendPaymentNotification(product, senderNumber, user.username, user.id);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('\u2705 Paiement en cours de v\u00e9rification')
    .setDescription(
      `Merci **${user.username}** ! Ta v\u00e9rification a \u00e9t\u00e9 enregistr\u00e9e.\n\n` +
      `**D\u00e9tails :**\n` +
      `\uD83D\uDCE6 Produit : **${product.name}**\n` +
      `\uD83D\uDCB0 Montant : **${product.price.toLocaleString('fr-FR')} Ar**\n` +
      `\uD83D\uDCDE Num\u00e9ro d'envoi : **${senderNumber}**\n` +
      `\uD83D\uDCE1 Envoy\u00e9 \u00e0 : **${mmNumber}**\n\n` +
      `Le propri\u00e9taire a \u00e9t\u00e9 notifi\u00e9 et v\u00e9rifiera ton paiement.\n` +
      `Tu recevras ton produit une fois le paiement confirm\u00e9 !`
    )
    .setTimestamp();

  // Save order to database
  const order = orders.create({
    productId: product.id,
    productName: product.name,
    productPrice: product.price,
    productImage: product.image || '',
    userId: user.id,
    username: user.username,
    senderNumber,
    emailSent,
    emailTo: shopSettings.ownerEmail || 'mathieurambelomanana@gmail.com',
  });
  console.log(`\uD83D\uDCE6 Order ${order.id} created for ${user.username} - ${product.name}`);

  // Clean up pending
  pendingPayments.delete(key);

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // Notify guild owner
  if (interaction.guild) {
    try {
      const owner = await interaction.guild.fetchOwner();
      if (owner) {
        const notifEmbed = new EmbedBuilder()
          .setColor(0xFF9800)
          .setTitle('\uD83D\uDCB3 Nouveau paiement')
          .setDescription(
            `**${user.username}** (ID: ${user.id}) a effectu\u00e9 un paiement :\n\n` +
            `Produit : **${product.name}**\n` +
            `Montant : **${product.price.toLocaleString('fr-FR')} Ar**\n` +
            `Num\u00e9ro d'envoi : **${senderNumber}**\n` +
            `Commande : **#${order.id}**\n` +
            (emailSent ? '\u2705 Email envoy\u00e9' : '\u26a0\ufe0f Email non envoy\u00e9')
          )
          .setTimestamp();
        await owner.send({ embeds: [notifEmbed] }).catch(() => {});
      }
    } catch {}
  }
}

/**
 * Handle buy cancel
 */
async function handleCancel(interaction, productId) {
  const key = `${interaction.user.id}_${productId}`;
  pendingPayments.delete(key);
  await interaction.update({
    content: '\u274C Achat annul\u00e9.',
    embeds: [],
    components: [],
  });
}

module.exports = {
  showPaymentInfo,
  showVerifyModal,
  handleModalSubmit,
  handleCancel,
  pendingPayments,
};
