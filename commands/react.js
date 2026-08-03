const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'react' },
  description: 'Ajoute une réaction à un message spécifique',
  permissions: [PermissionFlagsBits.ManageMessages],
  slash: new SlashCommandBuilder()
    .setName('react')
    .setDescription('Ajoute une réaction à un message')
    .addStringOption(o => o.setName('message_id').setDescription('ID du message').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('L\'emoji à ajouter').setRequired(true)),
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

      const messageId = msg.options.getString('message_id');
      const emoji = msg.options.getString('emoji');

      const targetMessage = await msg.channel.messages.fetch(messageId).catch(() => null);

      if (!targetMessage) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Message introuvable')
          .setDescription('Le message avec l\'ID `' + messageId + '` n\'a pas été trouvé dans ce salon.')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      await targetMessage.react(emoji);

      const confirm = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Réaction ajoutée')
        .setDescription('La réaction ' + emoji + ' a été ajoutée au [message](' + targetMessage.url + ').')
        .setFooter({ text: msg.user.username });
      await msg.reply({ embeds: [confirm], ephemeral: true });
    } catch (err) {
      console.error('Erreur react:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue. Vérifie que l\'emoji est valide et que le bot y a accès.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
