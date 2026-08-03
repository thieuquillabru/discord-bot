const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

const JOBS = [
  'Livreur', 'Développeur', 'Cuisinier', 'Mécanicien', 'Artiste',
  'Chanteur', 'Acteur', 'Journaliste', 'Vétérinaire', 'Pilote',
  'Professeur', 'Architecte', 'Infirmier', 'Peintre', 'Boulanger',
  'Électricien', 'Plombier', 'Musicien', 'Photographe', 'Jardinier',
  'Serveur', 'Barman', 'Coiffeur', 'Dentiste', 'Avocat',
];

module.exports = {
  data: { name: 'work' },
  slash: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Travaille pour gagner de l\'argent'),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const COOLDOWN = 60 * 60 * 1000; // 1h

      if (db.checkCooldown(guildId, userId, 'work', COOLDOWN)) {
        const remaining = db.getRemainingCooldown(guildId, userId, 'work', COOLDOWN);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('⏳ Travail')
              .setDescription(`Tu es déjà au travail ! Repos-toi pendant **${minutes}min ${seconds}s**.`)
              .setFooter({ text: user.tag })
              .setTimestamp(),
          ],
        });
      }

      const job = JOBS[Math.floor(Math.random() * JOBS.length)];
      const pay = Math.floor(Math.random() * 251) + 50; // 50-300

      db.addMoney(guildId, userId, pay);
      db.addXP(guildId, userId, 10);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('💼 Travail')
        .setDescription(`Tu as travaillé comme **${job}** !`)
        .addFields(
          { name: '💰 Salaire', value: `**${pay}** coins`, inline: true },
          { name: '⭐ XP gagné', value: `**+10**`, inline: true },
        )
        .setFooter({ text: `${user.tag} • Prochain travail dans 1h` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Work error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue pendant le travail.')
            .setTimestamp(),
        ],
      });
    }
  },
};
