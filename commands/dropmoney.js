const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../config');
const db = require('../database');

// Store active drops: Map<dropId, { guildId, userId, amount, messageId, channelId, collector }>
const activeDrops = new Map();
let dropCounter = 0;

module.exports = {
  data: { name: 'dropmoney' },
  activeDrops,
  slash: new SlashCommandBuilder()
    .setName('dropmoney')
    .setDescription('Lâche de l\'argent pour que d\'autres le récupèrent')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à lâcher').setRequired(true).setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user, channel } = interaction;
      const amount = interaction.options.getInteger('amount');

      const money = db.getMoney(guildId, userId);
      if (amount > money) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Fonds insuffisants')
              .setDescription(`Tu n'as que **${money.toLocaleString('fr-FR')}** coins.`)
              .setTimestamp(),
          ],
        });
      }

      db.addMoney(guildId, userId, -amount);
      db.addXP(guildId, userId, 5);

      const dropId = ++dropCounter;
      const dropKey = `drop_${dropId}`;

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('💰 Un drop d\'argent !')
        .setDescription(`${user} a lâché **${amount.toLocaleString('fr-FR')}** coins !\n**Clique vite sur le bouton pour les ramasser !**`)
        .setFooter({ text: 'Premier arrivé, premier servi !' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(dropKey)
          .setLabel(`🪙 Ramasser ${amount.toLocaleString('fr-FR')} coins`)
          .setStyle(ButtonStyle.Success),
      );

      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      // Create collector
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000, // 60 seconds
      });

      activeDrops.set(dropId, { guildId, userId, amount, messageId: message.id, channelId: channel.id, collector });

      collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id === userId) {
          return btnInteraction.reply({
            content: '❌ Tu ne peux pas ramasser ton propre drop !',
            ephemeral: true,
          });
        }

        collector.stop('claimed');
        db.addMoney(guildId, btnInteraction.user.id, amount);
        db.addXP(guildId, btnInteraction.user.id, 5);

        const claimedEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('💰 Drop récupéré !')
          .setDescription(`${btnInteraction.user} a ramassé **${amount.toLocaleString('fr-FR')}** coins lâchés par ${user} !`)
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(dropKey)
            .setLabel('✅ Déjà récupéré')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        );

        await btnInteraction.update({ embeds: [claimedEmbed], components: [disabledRow] });
        activeDrops.delete(dropId);
      });

      collector.on('end', async (collected, reason) => {
        if (reason !== 'claimed') {
          // Drop expired - refund
          db.addMoney(guildId, userId, amount);
          activeDrops.delete(dropId);

          try {
            const expiredEmbed = new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('⏰ Drop expiré')
              .setDescription(`Personne n\'a ramassé les **${amount.toLocaleString('fr-FR')}** coins.\nL\'argent a été remboursé à ${user}.`)
              .setTimestamp();

            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(dropKey)
                .setLabel('⏰ Expiré')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            );

            await interaction.editReply({ embeds: [expiredEmbed], components: [disabledRow] });
          } catch (e) {
            // Message may have been deleted
          }
        }
      });
    } catch (err) {
      console.error('Dropmoney error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du drop.')
            .setTimestamp(),
        ],
      });
    }
  },
};
