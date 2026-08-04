const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'money' },
  slash: new SlashCommandBuilder()
    .setName('money')
    .setDescription('Affiche le solde d\'un utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur dont voir le solde (optionnel)'),
    ),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const target = interaction.options.getUser('user') || user;
      const money = db.getMoney(guildId, target.id);
      const bank = db.getBank(guildId, target.id);
      const { level } = db.getXP(guildId, target.id);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle(`💰 Portefeuille de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🪙 Espèces', value: `**${money.toLocaleString('fr-FR')}** coins`, inline: true },
          { name: '🏦 Banque', value: `**${bank.toLocaleString('fr-FR')}** coins`, inline: true },
          { name: '📊 Niveau', value: `**${level}**`, inline: true },
          { name: '💎 Total', value: `**${(money + bank).toLocaleString('fr-FR')}** coins`, inline: false },
        )
        .setFooter({ text: target.tag })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Money error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage du solde.')
            .setTimestamp(),
        ],
      });
    }
  },
};
