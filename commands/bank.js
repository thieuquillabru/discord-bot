const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'bank' },
  slash: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Gère ton compte en banque')
    .addSubcommand(sc => sc
      .setName('deposit')
      .setDescription('Dépose de l\'argent en banque')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à déposer').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(sc => sc
      .setName('withdraw')
      .setDescription('Retire de l\'argent de la banque')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Le montant à retirer').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(sc => sc
      .setName('all')
      .setDescription('Dépose ou retire tout'),
    ),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const sub = interaction.options.getSubcommand();

      const { level } = db.getXP(guildId, userId);
      const maxBank = Math.max(level, 1) * 10000;
      const money = db.getMoney(guildId, userId);
      const bank = db.getBank(guildId, userId);

      if (sub === 'deposit') {
        const amount = interaction.options.getInteger('amount');

        if (amount > money) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Fonds insuffisants')
                .setDescription(`Tu n\'as que **${money.toLocaleString('fr-FR')}** coins en poche.`)
                .setTimestamp(),
            ],
          });
        }

        if (bank + amount > maxBank) {
          const canDeposit = maxBank - bank;
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⚠️ Banque pleine')
                .setDescription(`Ta capacité bancaire est de **${maxBank.toLocaleString('fr-FR')}** coins (niveau ${level}).\nTu peux encore déposer **${Math.max(0, canDeposit).toLocaleString('fr-FR')}** coins.`)
                .setTimestamp(),
            ],
          });
        }

        db.addMoney(guildId, userId, -amount);
        db.addBank(guildId, userId, amount);

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🏦 Dépôt réussi')
          .setDescription(`Tu as déposé **${amount.toLocaleString('fr-FR')}** coins en banque !`)
          .addFields(
            { name: '🪙 Espèces', value: `**${(money - amount).toLocaleString('fr-FR')}** coins`, inline: true },
            { name: '🏦 Banque', value: `**${(bank + amount).toLocaleString('fr-FR')}** / **${maxBank.toLocaleString('fr-FR')}** coins`, inline: true },
          )
          .setFooter({ text: user.tag })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'withdraw') {
        const amount = interaction.options.getInteger('amount');

        if (amount > bank) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Fonds insuffisants')
                .setDescription(`Tu n\'as que **${bank.toLocaleString('fr-FR')}** coins en banque.`)
                .setTimestamp(),
            ],
          });
        }

        db.addBank(guildId, userId, -amount);
        db.addMoney(guildId, userId, amount);

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🏦 Retrait réussi')
          .setDescription(`Tu as retiré **${amount.toLocaleString('fr-FR')}** coins de la banque !`)
          .addFields(
            { name: '🪙 Espèces', value: `**${(money + amount).toLocaleString('fr-FR')}** coins`, inline: true },
            { name: '🏦 Banque', value: `**${(bank - amount).toLocaleString('fr-FR')}** / **${maxBank.toLocaleString('fr-FR')}** coins`, inline: true },
          )
          .setFooter({ text: user.tag })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'all') {
        // Deposit all if money > 0, otherwise withdraw all
        if (money > 0) {
          const canDeposit = Math.min(money, maxBank - bank);
          if (canDeposit <= 0) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(config.colors.warning)
                  .setTitle('⚠️ Banque pleine')
                  .setDescription(`Ta banque est déjà pleine (**${bank.toLocaleString('fr-FR')}** / **${maxBank.toLocaleString('fr-FR')}**).`)
                  .setTimestamp(),
              ],
            });
          }

          db.addMoney(guildId, userId, -canDeposit);
          db.addBank(guildId, userId, canDeposit);

          const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🏦 Tout déposé !')
            .setDescription(`Tu as déposé **${canDeposit.toLocaleString('fr-FR')}** coins en banque !`)
            .addFields(
              { name: '🪙 Espèces', value: `**0** coins`, inline: true },
              { name: '🏦 Banque', value: `**${(bank + canDeposit).toLocaleString('fr-FR')}** / **${maxBank.toLocaleString('fr-FR')}** coins`, inline: true },
            )
            .setFooter({ text: user.tag })
            .setTimestamp();

          return interaction.reply({ embeds: [embed] });
        } else if (bank > 0) {
          db.addBank(guildId, userId, -bank);
          db.addMoney(guildId, userId, bank);

          const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🏦 Tout retiré !')
            .setDescription(`Tu as retiré **${bank.toLocaleString('fr-FR')}** coins de la banque !`)
            .addFields(
              { name: '🪙 Espèces', value: `**${bank.toLocaleString('fr-FR')}** coins`, inline: true },
              { name: '🏦 Banque', value: `**0** / **${maxBank.toLocaleString('fr-FR')}** coins`, inline: true },
            )
            .setFooter({ text: user.tag })
            .setTimestamp();

          return interaction.reply({ embeds: [embed] });
        } else {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⚠️ Rien à transférer')
                .setDescription('Tu n\'as ni argent en poche ni en banque.')
                .setTimestamp(),
            ],
          });
        }
      }
    } catch (err) {
      console.error('Bank error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue avec la banque.')
            .setTimestamp(),
        ],
      });
    }
  },
};
