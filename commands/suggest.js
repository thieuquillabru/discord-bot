const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

function getSuggestionData() {
  return db.getData('suggestions');
}

function saveSuggestionData(data) {
  db.saveData('suggestions', data);
}

module.exports = {
  data: { name: 'suggest' },
  slash: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Soumets une suggestion pour le serveur')
    .addStringOption(o => o.setName('text').setDescription('Ta suggestion').setRequired(true).setMaxLength(1000)),
  async execute(msg, client) {
    try {
      const text = msg.options.getString('text');
      const guildId = msg.guild.id;
      const userId = msg.user.id;

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('💡 Nouvelle suggestion')
        .setDescription(text)
        .setAuthor({ name: msg.user.tag, iconURL: msg.user.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: `ID: ${Date.now()}` })
        .setTimestamp();

      const sent = await msg.channel.send({ embeds: [embed] });
      await sent.react('👍');
      await sent.react('👎');

      // Save suggestion
      const data = getSuggestionData();
      if (!data[guildId]) data[guildId] = {};
      data[guildId][sent.id] = {
        messageId: sent.id,
        channelId: msg.channel.id,
        userId,
        text,
        timestamp: Date.now(),
        status: 'pending',
      };
      saveSuggestionData(data);

      const confirm = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Suggestion envoyée')
        .setDescription('Ta suggestion a été publiée avec succès ! Vote avec les réactions 👍/👎.')
        .setFooter({ text: msg.user.username });

      await msg.reply({ embeds: [confirm], ephemeral: true });
    } catch (err) {
      console.error('Erreur suggest:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },

  getSuggestionData,
  saveSuggestionData,
};
