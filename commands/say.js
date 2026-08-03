const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: { name: 'say' },
  description: 'Fait dire un message au bot (admin uniquement)',
  permissions: [PermissionFlagsBits.ManageMessages],
  slash: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Fait dire un message au bot')
    .addStringOption(o => o.setName('texte').setDescription('Le texte que le bot doit envoyer').setRequired(true).setMaxLength(2000))
    .addChannelOption(o => o.setName('salon').setDescription('Salon de destination (par défaut : salon actuel)').addChannelTypes(ChannelType.GuildText)),
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

      const text = msg.options.getString('texte');
      const targetChannel = msg.options.getChannel('salon') || msg.channel;

      await targetChannel.send(text);

      const confirm = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Message envoyé')
        .setDescription(`Message envoyé dans ${targetChannel}.`)
        .setFooter({ text: msg.user.username });
      await msg.reply({ embeds: [confirm], ephemeral: true });
    } catch (err) {
      console.error('Erreur say:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'envoi du message.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
