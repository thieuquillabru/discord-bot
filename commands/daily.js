const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'daily' },
  slash: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Collecte ta récompense quotidienne'),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const COOLDOWN = 24 * 60 * 60 * 1000; // 24h

      if (db.checkCooldown(guildId, userId, 'daily', COOLDOWN)) {
        const remaining = db.getRemainingCooldown(guildId, userId, 'daily', COOLDOWN);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('⏳ Récompense quotidienne')
              .setDescription(`Tu as déjà collecté ta récompense aujourd'hui !\nReviens dans **${hours}h ${minutes}min**.`)
              .setFooter({ text: `${user.tag}` })
              .setTimestamp(),
          ],
        });
      }

      const userData = db.getUser('economy', guildId, userId);
      const now = Date.now();
      const lastDaily = userData.lastDaily || 0;
      const oneDay = 24 * 60 * 60 * 1000;

      // Calculate streak
      let streak = 0;
      if (now - lastDaily < oneDay * 2 && lastDaily !== 0) {
        streak = (userData.dailyStreak || 0) + 1;
      } else {
        streak = 1;
      }

      const baseReward = Math.floor(Math.random() * 301) + 200; // 200-500
      const streakBonus = Math.min(streak * 50, 500);
      const totalReward = baseReward + streakBonus;

      db.addMoney(guildId, userId, totalReward);
      db.addXP(guildId, userId, 25);

      // Update streak data
      userData.lastDaily = now;
      userData.dailyStreak = streak;
      db.setUser('economy', guildId, userId, userData);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🎁 Récompense quotidienne')
        .setDescription(`Tu as reçu tes pièces quotidiennes !`)
        .addFields(
          { name: '💰 Récompense de base', value: `**${baseReward}** coins`, inline: true },
          { name: '🔥 Série', value: `**${streak} jour${streak > 1 ? 's' : ''}** (+${streakBonus} coins)`, inline: true },
          { name: '🪙 Total', value: `**${totalReward}** coins`, inline: true },
        )
        .setFooter({ text: `${user.tag} • Reviens dans 24h !` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Daily error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la collecte quotidienne.')
            .setTimestamp(),
        ],
      });
    }
  },
};
