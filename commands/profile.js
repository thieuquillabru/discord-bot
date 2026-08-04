const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'profile' },
  slash: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Affiche le profil d\'un utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur dont voir le profil')),
  async execute(msg, client) {
    try {
      const target = msg.options.getUser('user') || msg.user;
      const { guildId } = msg;

      // Get XP and level
      const { xp, level } = db.getXP(guildId, target.id);
      const currentLevelXP = db.getXPForLevel(level);
      const nextLevelXP = db.getXPForLevel(level + 1);
      const xpInLevel = xp - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;
      const filledBars = Math.round(progress * 15);
      const emptyBars = 15 - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      const percent = Math.round(progress * 100);

      // Get money
      const money = db.getMoney(guildId, target.id);

      // Get profile description
      const profileData = db.getUser('profiles', guildId, target.id);
      const description = profileData.description || 'Aucune description définie.';

      // Get join date
      let joinDate = 'Inconnue';
      try {
        const member = await msg.guild.members.fetch(target.id);
        joinDate = `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`;
      } catch {
        // Member not found
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle(`👤 Profil de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`*${description}*`)
        .addFields(
          { name: '📊 Niveau', value: `**${level}**`, inline: true },
          { name: '✨ XP', value: `**${xp.toLocaleString('fr-FR')}**`, inline: true },
          { name: '🪙 Argent', value: `**${money.toLocaleString('fr-FR')}** coins`, inline: true },
          { name: '📈 Progression', value: `[${progressBar}] ${percent}%\n${xpInLevel.toLocaleString('fr-FR')} / ${xpNeeded.toLocaleString('fr-FR')} XP`, inline: false },
          { name: '📅 Rejoint le serveur', value: joinDate, inline: true },
        )
        .setFooter({ text: `ID : ${target.id}` })
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Profile error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage du profil.')
            .setTimestamp(),
        ],
      });
    }
  },
};
