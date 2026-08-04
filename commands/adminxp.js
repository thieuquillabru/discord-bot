const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'adminxp' },
  slash: new SlashCommandBuilder()
    .setName('adminxp')
    .setDescription('Gère l\'XP des utilisateurs (admin uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ajoute de l\'XP à un utilisateur')
        .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur ciblé').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('La quantité d\'XP à ajouter').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Retire de l\'XP à un utilisateur')
        .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur ciblé').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('La quantité d\'XP à retirer').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Définit l\'XP d\'un utilisateur')
        .addUserOption(opt => opt.setName('user').setDescription('L\'utilisateur ciblé').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('La quantité d\'XP à définir').setRequired(true).setMinValue(0)),
    ),
  async execute(msg, client) {
    try {
      if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Accès refusé')
              .setDescription('Tu n\'as pas la permission d\'utiliser cette commande.')
              .setTimestamp(),
          ],
        });
      }

      const { guildId } = msg;
      const subcommand = msg.options.getSubcommand();
      const target = msg.options.getUser('user');
      const amount = msg.options.getInteger('amount');

      let embed;

      if (subcommand === 'add') {
        const result = db.addXP(guildId, target.id, amount);
        embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ XP ajouté')
          .setDescription(`**${amount.toLocaleString('fr-FR')}** XP ont été ajoutés à ${target}.
Nouveau total : **${result.xp.toLocaleString('fr-FR')}** XP (Niveau **${result.level}**)`)
          .setTimestamp();
      } else if (subcommand === 'remove') {
        const { xp: currentXP } = db.getXP(guildId, target.id);
        const newXP = Math.max(0, currentXP - amount);
        // Use setUser to set XP directly via economy file
        const userData = db.getUser('economy', guildId, target.id);
        userData.xp = newXP;
        db.setUser('economy', guildId, target.id, userData);
        const result = db.getXP(guildId, target.id);
        const removed = currentXP - newXP;
        embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ XP retiré')
          .setDescription(`**${removed.toLocaleString('fr-FR')}** XP ont été retirés à ${target}.
Nouveau total : **${result.xp.toLocaleString('fr-FR')}** XP (Niveau **${result.level}**)`)
          .setTimestamp();
      } else if (subcommand === 'set') {
        const userData = db.getUser('economy', guildId, target.id);
        userData.xp = amount;
        db.setUser('economy', guildId, target.id, userData);
        const result = db.getXP(guildId, target.id);
        embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ XP défini')
          .setDescription(`L\'XP de ${target} a été défini à **${amount.toLocaleString('fr-FR')}** (Niveau **${result.level}**).`)
          .setTimestamp();
      }

      return msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Adminxp error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la modification de l\'XP.')
            .setTimestamp(),
        ],
      });
    }
  },
};
