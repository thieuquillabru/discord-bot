const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shopdata = require('./shopdata');
const { getFeatureSettings } = require('./features');

// In-memory pending payments (productId -> { user, product, timestamp })
const pendingPayments = new Map();

/**
 * Send email notification via EmailJS free API (no SMTP needed on Render free tier)
 * Using a webhook-like approach via fetch to a free email service
 */
async function sendPaymentNotification(product, senderNumber, userName, userId) {
  const shopSettings = getFeatureSettings('shop');
  const ownerEmail = shopSettings.ownerEmail || 'mathieurambelomanana@gmail.com';
  const mmNumber = shopSettings.mmNumber || '032 81 381 58';
  const operator = shopSettings.mmOperator || 'Telma';
  const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' });

  // Use ElasticEmail free API or Formsubmit.co for email
  // Formsubmit.co is free, no signup needed - just send a form POST
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

    // Using formsubmit.co - first submission requires email confirmation
    const response = await fetch(`https://formsubmit.co/ajax/${ownerEmail}@gmail.com`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: formData.toString(),
    });

    const result = await response.json();
    console.log(`\uD83D\uDCE7 Email notification sent: ${result.message || 'OK'}`);
    return true;
  } catch (err) {
    console.error('\u274c Email notification failed:', err.message);
    // Fallback: try with nodemailer-style log
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
      `Tu es sur le point d'acheter :

` +
      `**${product.name}**
${product.description ? product.description + '\n' : ''}` +
      `💰 **Prix : ${product.price.toLocaleString('fr-FR')} Ar**\n\n` +
      `\uD83D\uDCE1 **Envoye l'argent à ce numéro ${operator} :**\n` +
      `\`\`\`${mmNumber}\`\`\`\n\n` +
      `Une fois le paiement effectué, clique sur le bouton **Vérifier** ci-dessous et entre ton numéro d'envoi.`
    )
    .setThumbnail(product.image || null)
    .setFooter({ text: 'Assure-toi d\'avoir envoyé le bon montant avant de vérifier.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_verify_${productId}`)
      .setLabel('\u2705 Vérifier mon paiement')
      .setStyle(ButtonStyle.Success)
      .setEmoji('\u2705'),
    new ButtonBuilder()
      .setCustomId(`buy_cancel_${productId}`)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('\u274C')
  );

  // Store pending payment
  pendingPayments.set(`${interaction.user.id}_${productId}`, {
    user: interaction.user,
    product,
    timestamp: Date.now(),
  });

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Show verification modal when user clicks "Vérifier"
 */
async function showVerifyModal(interaction, productId) {
  const key = `${interaction.user.id}_${productId}`;
  const pending = pendingPayments.get(key);
  if (!pending) {
    return interaction.reply({ content: '\u274c Aucun achat en cours pour ce produit. Clique d\'abord sur "Acheter".', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`buy_modal_${productId}`)
    .setTitle(`Vérification - ${pending.product.name}`);

  const senderNumberInput = new TextInputBuilder()
    .setCustomId('sender_number')
    .setLabel(`Numéro depuis lequel tu as envoyé l'argent`)
    .setPlaceholder('Ex: 034 12 345 67')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(senderNumberInput));

  await interaction.showModal(modal);
}

/**
 * Handle modal submission - verify payment and send email
 */
async function handleModalSubmit(interaction, productId) {
  const senderNumber = interaction.fields.getTextInputValue('sender_number');
  const key = `${interaction.user.id}_${productId}`;
  const pending = pendingPayments.get(key);

  if (!pending) {
    return interaction.reply({ content: '\u274c Session expirée. Refais un achat depuis la boutique.', ephemeral: true });
  }

  const { product, user } = pending;
  const shopSettings = getFeatureSettings('shop');
  const mmNumber = shopSettings.mmNumber || '032 81 381 58';

  // Send email notification
  const emailSent = await sendPaymentNotification(product, senderNumber, user.username, user.id);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('\u2705 Paiement en cours de vérification')
    .setDescription(
      `Merci **${user.username}** ! Ta vérification a été enregistrée.\n\n` +
      `**Détails :**\n` +
      `\uD83D\uDCE6 Produit : **${product.name}**\n` +
      `\uD83D\uDCB0 Montant : **${product.price.toLocaleString('fr-FR')} Ar**\n` +
      `\uD83D\uDCDE Numéro d'envoi : **${senderNumber}**\n` +
      `\uD83D\uDCE1 Envoyé à : **${mmNumber}**\n\n` +
      `Le propriétaire a été notifié et vérifiera ton paiement.\n` +
      `Tu recevras ton produit une fois le paiement confirmé !`
    )
    .setTimestamp();

  // Clean up pending
  pendingPayments.delete(key);

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // Also send to the guild owner if possible
  if (interaction.guild) {
    try {
      const owner = await interaction.guild.fetchOwner();
      if (owner) {
        const notifEmbed = new EmbedBuilder()
          .setColor(0xFF9800)
          .setTitle('\uD83D\uDCB3 Nouveau paiement à vérifier')
          .setDescription(
            `**${user.username}** (ID: ${user.id}) a effectué un paiement :\n\n` +
            `Produit : **${product.name}**\n` +
            `Montant : **${product.price.toLocaleString('fr-FR')} Ar**\n` +
            `Numéro d'envoi : **${senderNumber}**\n` +
            (emailSent ? '\u2705 Email de notification envoyé' : '\u26A0\uFE0F Email non envoyé (vérifie la configuration)')
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
    content: '\u274C Achat annulé.',
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
