const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'dice' },
  description: 'Lance un ou plusieurs dés (d6 par défaut)',
  usage: '[nombre de dés] [faces]',
  cooldown: 3,
  async execute(message, args) {
    const count = Math.min(Math.max(parseInt(args[0]) || 1, 1), 20);
    const faces = Math.min(Math.max(parseInt(args[1]) || 6, 2), 100);

    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * faces) + 1);
    }
    const total = rolls.reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`🎲 Lancer de ${count}d${faces}`)
      .addFields(
        { name: 'Résultats', value: rolls.join(' + ') + ` = **${total}**`, inline: false },
        { name: 'Moyenne', value: (total / count).toFixed(1), inline: true },
        { name: 'Min / Max', value: `${Math.min(...rolls)} / ${Math.max(...rolls)}`, inline: true },
      )
      .setFooter({ text: `Lancé par ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
