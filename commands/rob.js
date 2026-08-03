const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'rob' },
  slash: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Tente de voler un autre utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur à voler').setRequired(true)),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const target = interaction.options.getUser('user');
      const COOLDOWN = 30 * 60 * 1000; // 30min

      if (target.id === userId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Vol impossible')
              .setDescription('Tu ne peux pas te voler toi-même !')
              .setTimestamp(),
          ],
        });
      }

      if (target.bot) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Vol impossible')
              .setDescription('Tu ne peux pas voler un bot !')
              .setTimestamp(),
          ],
        });
      }

      if (db.checkCooldown(guildId, userId, 'rob', COOLDOWN)) {
        const remaining = db.getRemainingCooldown(guildId, userId, 'rob', COOLDOWN);
        const minutes = Math.floor(remaining / 60000);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('⏳ Vol en cooldown')
              .setDescription(`Tu dois attendre **${minutes}min** avant de pouvoir voler à nouveau.`)
              .setTimestamp(),
          ],
        });
      }

      const targetMoney = db.getMoney(guildId, target.id);
      if (targetMoney <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('💸 Cible sans le sou')
              .setDescription(`${target} n'a pas d'argent sur lui. Pas la peine de voler.`)
              .setTimestamp(),
          ],
        });
      }

      const success = Math.random() < 0.4;

      if (success) {
        const percentage = 0.1 + Math.random() * 0.2; // 10-30%
        const stolen = Math.floor(targetMoney * percentage);
        db.addMoney(guildId, userId, stolen);
        db.addMoney(guildId, target.id, -stolen);
        db.addXP(guildId, userId, 15);

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🎯 Vol réussi !')
          .setDescription(`Tu as volé **${stolen}** coins à ${target} !`)
          .addFields(
            { name: '💰 Somme volée', value: `**${stolen}** coins (${Math.round(percentage * 100)}%)`, inline: true },
            { name: '⭐ XP gagné', value: '**+15**', inline: true },
          )
          .setFooter({ text: `${user.tag} • Prochain vol dans 30min` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } else {
        const fine = Math.floor(Math.random() * 201) + 100; // 100-300
        const myMoney = db.getMoney(guildId, userId);
        const actualFine = Math.min(fine, myMoney);
        db.addMoney(guildId, userId, -actualFine);

        const embed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('🚨 Échec du vol !')
          .setDescription(`Tu as été arrêté en train de voler ${target} !`)
          .addFields(
            { name: '💸 Amende', value: `**-${actualFine}** coins`, inline: true },
          )
          .setFooter({ text: `${user.tag} • Prochain vol dans 30min` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Rob error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la tentative de vol.')
            .setTimestamp(),
        ],
      });
    }
  },
};
