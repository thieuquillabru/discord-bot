const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎'];
const SYMBOL_NAMES = {
  '🍒': 'Cerise', '🍋': 'Citron', '🍊': 'Orange', '🍇': 'Raisin', '🔔': 'Cloche', '💎': 'Diamant',
};

module.exports = {
  data: { name: 'slots' },
  slash: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Joue aux machines à sous !')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à miser (défaut: 100)').setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
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

      // Spin
      const reel1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const reel2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const reel3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

      let multiplier = 0;
      let title = '';
      let color = config.colors.error;

      if (reel1 === reel2 && reel2 === reel3) {
        // 3 matching = 10x
        multiplier = 10;
        title = '🎉 JACKPOT !';
        color = config.colors.success;
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        // 2 matching = 2x
        multiplier = 2;
        title = '✨ Gagné !';
        color = config.colors.success;
      } else {
        multiplier = 0;
        title = '😢 Perdu !';
        color = config.colors.error;
      }

      const winnings = amount * multiplier;
      const net = winnings - amount;

      if (multiplier > 0) {
        db.addMoney(guildId, userId, winnings - amount);
        db.addXP(guildId, userId, multiplier >= 10 ? 50 : 5);
      } else {
        db.addMoney(guildId, userId, -amount);
      }

      const visualSlot = `
│ ${reel1} │ ${reel2} │ ${reel3} │
`;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🎰 Machines à sous — ${title}`)
        .setDescription(`Mise : **${amount.toLocaleString('fr-FR')}** coins\n\n


${visualSlot}
`)
        .addFields(
          { name: '🎯 Résultat', value: multiplier === 0
            ? `Aucune correspondance — **-${amount.toLocaleString('fr-FR')}** coins`
            : multiplier === 2
              ? `2 symboles identiques — **+${winnings.toLocaleString('fr-FR')}** coins (x2)`
              : `3 symboles identiques — **+${winnings.toLocaleString('fr-FR')}** coins (x10) 🎰`,
            inline: false },
          { name: '🪙 Nouveau solde', value: `**${db.getMoney(guildId, userId).toLocaleString('fr-FR')}** coins`, inline: true },
        )
        .setFooter({ text: `${user.tag} • 3 identiques = x10 | 2 identiques = x2` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Slots error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue avec les machines à sous.')
            .setTimestamp(),
        ],
      });
    }
  },
};
