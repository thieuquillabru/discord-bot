const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const crypto = require('crypto');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'dropxp' },
  slash: new SlashCommandBuilder()
    .setName('dropxp')
    .setDescription('Crée un drop d\'XP que le premier à cliquer peut récupérer')
    .addIntegerOption(opt => opt.setName('amount').setDescription('La quantité d\'XP à lâcher').setRequired(true).setMinValue(1)),
  async execute(msg, client) {
    try {
      const { guildId, user } = msg;
      const amount = msg.options.getInteger('amount');

      const uuid = crypto.randomUUID();
      const dropId = `dropxp_${uuid}`;

      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('⭐ Un drop d\'XP !')
        .setDescription(`${user} a lâché **${amount.toLocaleString('fr-FR')}** XP !\n**Clique vite sur le bouton pour les récupérer !**`)
        .setFooter({ text: 'Premier arrivé, premier servi ! ⏱️ 60 secondes' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(dropId)
          .setLabel(`⭐ Récupérer ${amount.toLocaleString('fr-FR')} XP`)
          .setStyle(ButtonStyle.Success),
      );

      const message = await msg.reply({ embeds: [embed], components: [row], fetchReply: true });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id === user.id) {
          return btnInteraction.reply({
            content: '❌ Tu ne peux pas récupérer ton propre drop d\'XP !',
            ephemeral: true,
          });
        }

        collector.stop('claimed');
        db.addXP(guildId, btnInteraction.user.id, amount);

        const claimedEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('⭐ Drop d\'XP récupéré !')
          .setDescription(`${btnInteraction.user} a récupéré **${amount.toLocaleString('fr-FR')}** XP lâchés par ${user} !`)
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(dropId)
            .setLabel('✅ Déjà récupéré')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        );

        await btnInteraction.update({ embeds: [claimedEmbed], components: [disabledRow] });
      });

      collector.on('end', async (collected, reason) => {
        if (reason !== 'claimed') {
          try {
            const expiredEmbed = new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('⏰ Drop d\'XP expiré')
              .setDescription(`Personne n\'a récupéré les **${amount.toLocaleString('fr-FR')}** XP.`)
              .setTimestamp();

            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(dropId)
                .setLabel('⏰ Expiré')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            );

            await message.edit({ embeds: [expiredEmbed], components: [disabledRow] });
          } catch {
            // Message may have been deleted
          }
        }
      });
    } catch (err) {
      console.error('Dropxp error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du drop d\'XP.')
            .setTimestamp(),
        ],
      });
    }
  },
};
