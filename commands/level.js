const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'level' },
  slash: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Affiche le niveau et l\'XP d\'un utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur dont voir le niveau')),
  async execute(msg, client) {
    try {
      const target = msg.options.getUser('user') || msg.user;
      const { guildId } = msg;

      const { xp, level } = db.getXP(guildId, target.id);
      const currentLevelXP = db.getXPForLevel(level);
      const nextLevelXP = db.getXPForLevel(level + 1);
      const xpInLevel = xp - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;

      const filledBars = Math.round(progress * 10);
      const emptyBars = 10 - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      const percent = Math.round(progress * 100);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle(`📊 Niveau de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Niveau', value: `**${level}**`, inline: true },
          { name: 'XP total', value: `**${xp.toLocaleString('fr-FR')}**`, inline: true },
          { name: 'XP pour le niveau suivant', value: `**${xpInLevel.toLocaleString('fr-FR')}** / **${xpNeeded.toLocaleString('fr-FR')}**`, inline: true },
          { name: 'Progression', value: `[${progressBar}] ${percent}%`, inline: false },
        )
        .setFooter({ text: `Demandé par ${msg.user.username}` })
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Level error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage du niveau.')
            .setTimestamp(),
        ],
      });
    }
  },
};
