const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
  data: { name: 'suggestmod' },
  description: 'Modère les suggestions (accepter, refuser, planifié)',
  permissions: [PermissionFlagsBits.ManageMessages],
  slash: new SlashCommandBuilder()
    .setName('suggestmod')
    .setDescription('Modère les suggestions')
    .addSubcommand(sub => sub
      .setName('accept')
      .setDescription('Accepte une suggestion')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message de la suggestion').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('refuse')
      .setDescription('Refuse une suggestion')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message de la suggestion').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('planned')
      .setDescription('Marque une suggestion comme planifiée')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message de la suggestion').setRequired(true))),
  async execute(msg) {
    try {
      if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Permission refusée')
          .setDescription('Tu as besoin de la permission **Gérer les messages** pour utiliser cette commande.')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      const subcommand = msg.options.getSubcommand();
      const messageId = msg.options.getString('message_id');

      // Mettre à jour dans la DB
      const data = db.getData('suggestions');
      const guildData = data[msg.guild.id] || {};
      const suggestion = guildData[messageId];

      // Configurer le statut
      const statusConfig = {
        accept: { label: '✅ Acceptée', color: 0x2ECC71, status: 'accepted' },
        refuse: { label: '❌ Refusée', color: 0xE74C3C, status: 'refused' },
        planned: { label: '📋 Planifiée', color: 0xF39C12, status: 'planned' },
      };

      const config = statusConfig[subcommand];

      // Essayer de trouver le message et le modifier
      let messageFound = false;
      if (suggestion && suggestion.channelId) {
        try {
          const channel = msg.guild.channels.cache.get(suggestion.channelId);
          if (channel) {
            const targetMessage = await channel.messages.fetch(messageId);
            if (targetMessage && targetMessage.embeds.length > 0) {
              const originalEmbed = EmbedBuilder.from(targetMessage.embeds[0]);
              originalEmbed.setColor(config.color);
              // Mettre à jour le titre avec le statut
              const originalTitle = originalEmbed.data.title || 'Suggestion';
              originalEmbed.setTitle(config.label + ' — ' + originalTitle);
              // Ajouter/modifier le footer avec le modérateur
              originalEmbed.setFooter({ text: 'Modéré par ' + msg.user.tag });
              await targetMessage.edit({ embeds: [originalEmbed] });
              messageFound = true;
            }
          }
        } catch (e) {
          console.error('Impossible de modifier le message de suggestion:', e.message);
        }
      }

      // Si pas trouvé dans la DB, essayer dans le salon actuel
      if (!messageFound) {
        try {
          const targetMessage = await msg.channel.messages.fetch(messageId);
          if (targetMessage && targetMessage.embeds.length > 0) {
            const originalEmbed = EmbedBuilder.from(targetMessage.embeds[0]);
            originalEmbed.setColor(config.color);
            const originalTitle = originalEmbed.data.title || 'Suggestion';
            originalEmbed.setTitle(config.label + ' — ' + originalTitle);
            originalEmbed.setFooter({ text: 'Modéré par ' + msg.user.tag });
            await targetMessage.edit({ embeds: [originalEmbed] });
            messageFound = true;
          }
        } catch (e) {
          console.error('Impossible de modifier le message:', e.message);
        }
      }

      // Sauvegarder le statut dans la DB
      if (suggestion) {
        suggestion.status = config.status;
        if (!data[msg.guild.id]) data[msg.guild.id] = {};
        data[msg.guild.id][messageId] = suggestion;
        db.saveData('suggestions', data);
      }

      const confirm = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(config.label)
        .setDescription(messageFound
          ? 'La suggestion a été marquée comme **' + config.label + '**.'
          : 'Statut enregistré dans la base de données. Le message n\'a pas pu être modifié (introuvable ou pas dans ce salon).')
        .setFooter({ text: msg.user.username })
        .setTimestamp();

      await msg.reply({ embeds: [confirm], ephemeral: true });
    } catch (err) {
      console.error('Erreur suggestmod:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la modération de la suggestion.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
