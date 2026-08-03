const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'coinflip' },
  slash: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Pile ou face, parie de l\'argent !')
    .addStringOption(opt => opt
      .setName('choice')
      .setDescription('Ton choix : pile ou face')
      .setRequired(true)
      .addChoices(
        { name: 'Pile', value: 'pile' },
        { name: 'Face', value: 'face' },
      ),
    )
    .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à parier (défaut: 100)').setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const choice = interaction.options.getString('choice');
      const amount = interaction.options.getInteger('amount') || 100;

      const money = db.getMoney(guildId, userId);
      if (amount > money) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Fonds insuffisants')
              .setDescription(`Tu n\'as que **${money.toLocaleString('fr-FR')}** coins.`)
              .setTimestamp(),
          ],
        });
      }

      const result = Math.random() < 0.5 ? 'pile' : 'face';
      const won = choice === result;

      if (won) {
        db.addMoney(guildId, userId, amount);
        db.addXP(guildId, userId, 5);
      } else {
        db.addMoney(guildId, userId, -amount);
      }

      const choiceEmoji = choice === 'pile' ? '🪙' : '👤';
      const resultEmoji = result === 'pile' ? '🪙' : '👤';

      const embed = new EmbedBuilder()
        .setColor(won ? config.colors.success : config.colors.error)
        .setTitle('🪙 Pile ou Face')
        .setDescription(
          `Tu as choisi **${choice}** ${choiceEmoji}
` +
          `La pièce tombe sur **${result}** ${resultEmoji}\n\n` +
          (won
            ? `🎉 **Gagné !** Tu reçois **+${amount.toLocaleString('fr-FR')}** coins !`
            : `😢 **Perdu !** Tu perds **-${amount.toLocaleString('fr-FR')}** coins.`),
        )
        .addFields(
          { name: '🪙 Nouveau solde', value: `**${db.getMoney(guildId, userId).toLocaleString('fr-FR')}** coins`, inline: true },
        )
        .setFooter({ text: user.tag })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Coinflip error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du pile ou face.')
            .setTimestamp(),
        ],
      });
    }
  },
};
