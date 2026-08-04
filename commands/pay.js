const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'pay' },
  slash: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Envoie de l\'argent à un autre utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur à qui envoyer').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à envoyer').setRequired(true).setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (target.id === userId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Transfert impossible')
              .setDescription('Tu ne peux pas t\'envoyer de l\'argent à toi-même !')
              .setTimestamp(),
          ],
        });
      }

      if (target.bot) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Transfert impossible')
              .setDescription('Tu ne peux pas envoyer d\'argent à un bot !')
              .setTimestamp(),
          ],
        });
      }

      const myMoney = db.getMoney(guildId, userId);
      if (amount > myMoney) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Fonds insuffisants')
              .setDescription(`Tu n\'as que **${myMoney}** coins. Tu ne peux pas envoyer **${amount}** coins.`)
              .setTimestamp(),
          ],
        });
      }

      db.addMoney(guildId, userId, -amount);
      db.addMoney(guildId, target.id, amount);
      db.addXP(guildId, userId, 5);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('💰 Transfert réussi')
        .setDescription(`Tu as envoyé **${amount}** coins à ${target} !`)
        .addFields(
          { name: '💳 Ton solde', value: `**${myMoney - amount}** coins`, inline: true },
          { name: '💳 Son solde', value: `**${db.getMoney(guildId, target.id)}** coins`, inline: true },
        )
        .setFooter({ text: `${user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Pay error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du transfert.')
            .setTimestamp(),
        ],
      });
    }
  },
};
