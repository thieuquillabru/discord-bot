const { EmbedBuilder } = require('discord.js');

const responses = [
  'Oui, absolument ! ✨',
  'Non, pas du tout. ❌',
  'Peut-être... 🤔',
  "C'est certain ! 💯",
  'Je ne pense pas. 🙅',
  'Demande-moi plus tard. ⏳',
  'Les étoiles disent oui... 🌟',
  'Très peu probable. 🌀',
  'Sans aucun doute ! ✅',
  'Repose ta question plus tard. 🔄',
  'Mon instinct dit oui. 🎯',
  "N'y compte pas trop. 💤",
];

module.exports = {
  data: { name: '8ball' },
  description: 'Pose une question et la boule magique y répondra',
  usage: '<ta question>',
  cooldown: 3,
  async execute(message, args) {
    const question = args.join(' ');
    if (!question) {
      return message.reply('❌ Pose-moi une question !\nUtilisation : `!8ball <ta question>`');
    }

    const answer = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('🔮 La Boule Magique')
      .addFields(
        { name: 'Question', value: question, inline: false },
        { name: 'Réponse', value: answer, inline: false },
      )
      .setFooter({ text: `Demandé par ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
