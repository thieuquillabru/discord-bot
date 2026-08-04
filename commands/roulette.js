const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const CHOICES = [
  { name: 'Rouge', value: 'rouge' },
  { name: 'Noir', value: 'noir' },
  { name: 'Vert', value: 'vert' },
  { name: 'Impair', value: 'impair' },
  { name: 'Pair', value: 'pair' },
  { name: 'Manque (1-18)', value: 'manque' },
  { name: 'Passe (19-36)', value: 'passe' },
];

function getColor(num) {
  if (num === 0) return '🟢';
  return RED_NUMBERS.includes(num) ? '🔴' : '⚫';
}

function getNumberColor(num) {
  if (num === 0) return 'vert';
  return RED_NUMBERS.includes(num) ? 'rouge' : 'noir';
}

function checkWin(choice, num) {
  if (choice === 'vert') return num === 0;
  if (choice === 'rouge') return RED_NUMBERS.includes(num);
  if (choice === 'noir') return num > 0 && !RED_NUMBERS.includes(num);
  if (choice === 'impair') return num > 0 && num % 2 !== 0;
  if (choice === 'pair') return num > 0 && num % 2 === 0;
  if (choice === 'manque') return num >= 1 && num <= 18;
  if (choice === 'passe') return num >= 19 && num <= 36;
  return false;
}

function getMultiplier(choice) {
  if (choice === 'vert') return 36;
  return 2;
}

function getLabel(choice) {
  const labels = {
    rouge: 'Rouge',
    noir: 'Noir',
    vert: 'Vert (0)',
    impair: 'Impair',
    pair: 'Pair',
    manque: 'Manque (1-18)',
    passe: 'Passe (19-36)',
  };
  return labels[choice] || choice;
}

module.exports = {
  data: { name: 'roulette' },
  slash: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Joue à la roulette !')
    .addStringOption(opt => opt
      .setName('choice')
      .setDescription('Ton pari')
      .setRequired(true)
      .addChoices(...CHOICES),
    )
    .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à miser (défaut: 100)').setMinValue(1)),
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

      const num = Math.floor(Math.random() * 37); // 0-36
      const won = checkWin(choice, num);
      const multiplier = getMultiplier(choice);
      const winnings = won ? amount * multiplier : 0;

      if (won) {
        db.addMoney(guildId, userId, winnings - amount);
        db.addXP(guildId, userId, multiplier >= 10 ? 30 : 5);
      } else {
        db.addMoney(guildId, userId, -amount);
      }

      const numberColorEmoji = getColor(num);
      const choiceLabel = getLabel(choice);

      const embed = new EmbedBuilder()
        .setColor(won ? config.colors.success : config.colors.error)
        .setTitle(won ? '🎉 Roulette — Gagné !' : '🎰 Roulette — Perdu !')
        .setDescription(
          `Tu as parié **${amount.toLocaleString('fr-FR')}** coins sur **${choiceLabel}**

` +
          `La bille tombe sur : **${numberColorEmoji} ${num}** (${getNumberColor(num)})

` +
          (won
            ? `Multiplier **x${multiplier}** — Tu gagnes **+${winnings.toLocaleString('fr-FR')}** coins ! 🎉`
            : `Tu perds **-${amount.toLocaleString('fr-FR')}** coins. 😢`),
        )
        .addFields(
          { name: '🪙 Nouveau solde', value: `**${db.getMoney(guildId, userId).toLocaleString('fr-FR')}** coins`, inline: true },
        )
        .setFooter({ text: `${user.tag} • Vert = x36 | Autres = x2` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Roulette error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue avec la roulette.')
            .setTimestamp(),
        ],
      });
    }
  },
};
