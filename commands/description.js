const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'description' },
  slash: new SlashCommandBuilder()
    .setName('description')
    .setDescription('Modifie la description de ton profil')
    .addStringOption(opt => opt.setName('text').setDescription('Ta nouvelle description (max 200 caractères)').setRequired(true).setMaxLength(200)),
  async execute(msg, client) {
    try {
      const { guildId, user } = msg;
      const text = msg.options.getString('text');

      const profileData = db.getUser('profiles', guildId, user.id);
      profileData.description = text;
      db.setUser('profiles', guildId, user.id, profileData);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Description mise à jour')
        .setDescription(`Ta nouvelle description :
> *${text}*`)
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Description error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la modification de la description.')
            .setTimestamp(),
        ],
      });
    }
  },
};
