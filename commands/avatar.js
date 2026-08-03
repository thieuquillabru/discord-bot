const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'avatar' },
  description: 'Affiche la photo de profil d\'un membre en grand format',
  usage: '[@membre]',
  cooldown: 3,
  slash: new SlashCommandBuilder().setName('avatar').setDescription('Affiche la photo de profil en grand format').addUserOption(o => o.setName('membre').setDescription('Le membre cible')),
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Avatar de ${target.tag}`)
      .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: 'Lien direct', value: `[Clique ici](${target.displayAvatarURL({ dynamic: true, size: 1024 })})`, inline: false },
      )
      .setFooter({ text: `Demandé par ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
