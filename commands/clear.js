const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: { name: 'clear' },
  description: 'Supprime un nombre de messages dans le canal actuel',
  usage: '<nombre> [@membre]',
  permissions: [PermissionFlagsBits.ManageMessages],
  requireModRole: false,
  cooldown: 5,
  async execute(message, args) {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply('❌ Tu dois spécifier un nombre entre 1 et 100.\nUtilisation : `!clear <nombre> [@membre]`');
    }

    // Optionnel : filtrer par membre
    const targetMember = message.mentions.members.first();

    try {
      const fetchedMessages = await message.channel.messages.fetch({ limit: amount + 1 });
      let messagesToDelete = fetchedMessages;

      if (targetMember) {
        messagesToDelete = fetchedMessages.filter(m => m.author.id === targetMember.user.id);
      }

      const deleted = await message.channel.bulkDelete(messagesToDelete, true);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🗑️ Messages supprimés')
        .setDescription(`**${deleted.size}** message(s) supprimé(s)${targetMember ? ` de ${targetMember.user.tag}` : ''}.`)
        .setTimestamp();

      const confirmation = await message.channel.send({ embeds: [embed] });
      setTimeout(() => confirmation.delete().catch(() => {}), 5000);
    } catch (error) {
      console.error('Erreur clear :', error);
      message.reply('❌ Impossible de supprimer ces messages. Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.');
    }
  },
};
