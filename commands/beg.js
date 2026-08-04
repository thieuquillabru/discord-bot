const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

const BEG_LUCKY = [
  'Un riche seigneur te donne une grosse pièce d\'or en te voyant mendier !',
  'Un marchand te donne sa bourse par erreur en te confondant avec un noble !',
  'Tu trouves un sac rempli de pièces d\'or dans une ruelle sombre !',
  'Un dragon (en peluche) t\'offre son trésor avec un sourire !',
];

const BEG_SUCCESS = [
  'Un passant compatissant te donne quelques pièces.',
  'Tu as trouvé des pièces par terre ! Chanceux !',
  'Un vieux monsieur te glisse des pièces dans la main.',
  'Un musicien de rue partage ses gains avec toi.',
  'Tu as chanté si bien qu\'on t\'a donné des pièces !',
  'Un enfant te donne sa tirelire en te trouvant mignon.',
  'Un boulanger te donne du pain et quelques pièces.',
];

const BEG_FAIL = [
  'Personne ne veut te donner d\'argent... Peut-être demain.',
  'Les passants t\'ignorent complètement. Pathétique.',
  'Tu as glissé dans une flaque en mendiant. 0 coins.',
  'Un pigeon t\'a volé ta seule pièce. Malchanceux !',
  'Tu as supplié pendant des heures sans succès...',
];

module.exports = {
  data: { name: 'beg' },
  slash: new SlashCommandBuilder()
    .setName('beg')
    .setDescription('Mendie pour obtenir de l\'argent'),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const COOLDOWN = 5 * 60 * 1000; // 5min

      if (db.checkCooldown(guildId, userId, 'beg', COOLDOWN)) {
        const remaining = db.getRemainingCooldown(guildId, userId, 'beg', COOLDOWN);
        const seconds = Math.floor(remaining / 1000);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('⏳ Mendicité en cooldown')
              .setDescription(`Tu viens de mendier ! Attends **${seconds}s** avant de recommencer.`)
              .setTimestamp(),
          ],
        });
      }

      const roll = Math.random();
      let amount = 0;
      let message = '';
      let color = config.colors.error;
      let title = '😢 Pas de chance';

      if (roll < 0.10) {
        // 10% lucky: 200-500
        amount = Math.floor(Math.random() * 301) + 200;
        message = BEG_LUCKY[Math.floor(Math.random() * BEG_LUCKY.length)];
        color = config.colors.success;
        title = '🍀 Incroyable chance !';
      } else if (roll < 0.80) {
        // 70% success: 10-100
        amount = Math.floor(Math.random() * 91) + 10;
        message = BEG_SUCCESS[Math.floor(Math.random() * BEG_SUCCESS.length)];
        color = config.colors.success;
        title = '🥺 Mendicité';
      } else {
        // 20% fail
        message = BEG_FAIL[Math.floor(Math.random() * BEG_FAIL.length)];
        color = config.colors.error;
        title = '😢 Pas de chance';
      }

      if (amount > 0) {
        db.addMoney(guildId, userId, amount);
        db.addXP(guildId, userId, 2);
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(message)
        .addFields(
          { name: '💰 Gain', value: amount > 0 ? `**+${amount}** coins` : '**0** coins', inline: true },
        )
        .setFooter({ text: `${user.tag} • Prochain mendiage dans 5min` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Beg error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue pendant la mendicité.')
            .setTimestamp(),
        ],
      });
    }
  },
};
