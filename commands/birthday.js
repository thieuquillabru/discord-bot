const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

function getBirthdayData() {
  return db.getData('birthdays');
}

function saveBirthdayData(data) {
  db.saveData('birthdays', data);
}

const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

module.exports = {
  data: { name: 'birthday' },
  slash: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Gère ton anniversaire')
    .addSubcommand(sc => sc
      .setName('set')
      .setDescription('Enregistre ta date d\'anniversaire')
      .addIntegerOption(o => o.setName('day').setDescription('Jour (1-31)').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption(o => o.setName('month').setDescription('Mois (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)))
    .addSubcommand(sc => sc
      .setName('remove')
      .setDescription('Supprime ta date d\'anniversaire')),
  async execute(msg, client) {
    try {
      const sub = msg.options.getSubcommand();
      const guildId = msg.guild.id;
      const userId = msg.user.id;
      const data = getBirthdayData();

      if (!data[guildId]) data[guildId] = {};

      if (sub === 'set') {
        const day = msg.options.getInteger('day');
        const month = msg.options.getInteger('month');

        // Basic validation
        const maxDays = [0,31,29,31,30,31,30,31,31,30,31,30,31];
        if (day > maxDays[month]) {
          return msg.reply({ content: `❌ Jour invalide pour le mois de ${MONTHS_FR[month]}. Maximum : ${maxDays[month]} jours.`, ephemeral: true });
        }

        data[guildId][userId] = { day, month };
        saveBirthdayData(data);

        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🎂 Anniversaire enregistré')
          .setDescription(`Ton anniversaire est le **${day} ${MONTHS_FR[month]}** !`)
          .setFooter({ text: msg.user.username })
          .setTimestamp();

        await msg.reply({ embeds: [embed] });
        return;
      }

      if (sub === 'remove') {
        if (!data[guildId] || !data[guildId][userId]) {
          return msg.reply({ content: '❌ Tu n\'as pas d\'anniversaire enregistré.', ephemeral: true });
        }

        delete data[guildId][userId];
        saveBirthdayData(data);

        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🎂 Anniversaire supprimé')
          .setDescription('Ton anniversaire a été retiré avec succès.')
          .setFooter({ text: msg.user.username })
          .setTimestamp();

        await msg.reply({ embeds: [embed] });
        return;
      }
    } catch (err) {
      console.error('Erreur birthday:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },

  getBirthdayData,
  saveBirthdayData,
  MONTHS_FR,
};
