const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

const TYPE_LABELS = {
  weapon: 'Arme',
  shield: 'Bouclier',
  potion: 'Potion',
  ring: 'Anneau',
  collectible: 'Collection',
};

const USE_MESSAGES = {
  weapon: ['Tu brandis ton arme avec fierté ! Les ennemis tremblent.', 'Tu te sens puissant en équipant cette arme !'],
  shield: ['Tu lèves ton bouclier ! Tu te sens protégé.', 'Ce bouclier pourrait résister à n\'importe quel assaut !'],
  potion: ['Tu bois la potion... Un effet mystérieux te parcourt !', 'La potion a un goût étrange mais tu te sens mieux.'],
  ring: ['Tu mets l\'anneau à ton doigt. Une lueur mystérieuse apparaît !', 'L\'anneau brille faiblement sur ton doigt.'],
  collectible: ['Tu contemples cet objet avec admiration.', 'Cet objet rappelle de bons souvenirs.'],
};

module.exports = {
  data: { name: 'item' },
  slash: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Interagis avec un objet de ton inventaire')
    .addSubcommand(sc => sc
      .setName('use')
      .setDescription('Utilise un objet')
      .addIntegerOption(opt => opt.setName('index').setDescription('L\'index de l\'objet').setRequired(true).setMinValue(0)),
    )
    .addSubcommand(sc => sc
      .setName('sell')
      .setDescription('Vends un objet (50% du prix d\'achat)')
      .addIntegerOption(opt => opt.setName('index').setDescription('L\'index de l\'objet').setRequired(true).setMinValue(0)),
    )
    .addSubcommand(sc => sc
      .setName('give')
      .setDescription('Donne un objet à un utilisateur')
      .addIntegerOption(opt => opt.setName('index').setDescription('L\'index de l\'objet').setRequired(true).setMinValue(0))
      .addUserOption(opt => opt.setName('user').setDescription('Le destinataire').setRequired(true)),
    )
    .addSubcommand(sc => sc
      .setName('drop')
      .setDescription('Détruis un objet')
      .addIntegerOption(opt => opt.setName('index').setDescription('L\'index de l\'objet').setRequired(true).setMinValue(0)),
    ),
  async execute(interaction, client) {
    try {
      const { guildId, userId, user } = interaction;
      const sub = interaction.options.getSubcommand();
      const index = interaction.options.getInteger('index');
      const inventory = db.getInventory(guildId, userId);

      if (index >= inventory.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Objet introuvable')
              .setDescription(`Tu n\'as pas d\'objet à l\'index **${index}**. Ton inventaire a **${inventory.length}** objet${inventory.length > 1 ? 's' : ''}.`)
              .setTimestamp(),
          ],
        });
      }

      const item = inventory[index];

      if (sub === 'use') {
        const messages = USE_MESSAGES[item.type] || ['Tu utilises cet objet.'];
        const msg = messages[Math.floor(Math.random() * messages.length)];

        const embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle(`${item.emoji} Utilisation : ${item.name}`)
          .setDescription(msg)
          .addFields(
            { name: '🏷️ Type', value: TYPE_LABELS[item.type] || item.type, inline: true },
            { name: '📋 Rareté', value: item.rarity, inline: true },
          )
          .setFooter({ text: user.tag })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'sell') {
        const sellPrice = Math.floor((item.price || 0) * 0.5);
        if (sellPrice <= 0) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⚠️ Vente impossible')
                .setDescription('Cet objet n\'a aucune valeur de revente.')
                .setTimestamp(),
            ],
          });
        }

        db.removeFromInventory(guildId, userId, index);
        db.addMoney(guildId, userId, sellPrice);

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`💰 Objet vendu : ${item.emoji} ${item.name}`)
          .setDescription(`Tu as vendu cet objet pour **${sellPrice.toLocaleString('fr-FR')}** coins (50% du prix d\'achat).`)
          .setFooter({ text: user.tag })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'give') {
        const target = interaction.options.getUser('user');

        if (target.id === userId) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Action impossible')
                .setDescription('Tu ne peux pas te donner un objet à toi-même !')
                .setTimestamp(),
            ],
          });
        }

        if (target.bot) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Action impossible')
                .setDescription('Tu ne peux pas donner un objet à un bot !')
                .setTimestamp(),
            ],
          });
        }

        const removed = db.removeFromInventory(guildId, userId, index);
        if (removed) {
          db.addToInventory(guildId, target.id, removed);
        }

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`🎁 Objet donné : ${item.emoji} ${item.name}`)
          .setDescription(`Tu as donné **${item.emoji} ${item.name}** à ${target} !`)
          .setFooter({ text: user.tag })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'drop') {
        db.removeFromInventory(guildId, userId, index);

        const embed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`🗑️ Objet détruit : ${item.emoji} ${item.name}`)
          .setDescription(`Tu as détruit **${item.emoji} ${item.name}**. Il n\'y a pas de retour en arrière !`)
          .setFooter({ text: user.tag })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Item error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue avec l\'objet.')
            .setTimestamp(),
        ],
      });
    }
  },
};
