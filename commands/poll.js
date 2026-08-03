const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: { name: 'poll' },
  description: 'Crée un sondage avec des réactions',
  usage: '<question> | <option1> | <option2> | ...',
  permissions: [PermissionFlagsBits.ManageMessages],
  cooldown: 10,
  async execute(message, args) {
    const input = args.join(' ');
    if (!input.includes('|') || input.split('|').length < 3) {
      return message.reply("❌ Format invalide.\nUtilisation : `!poll Question | Option 1 | Option 2 | Option 3`\nExemple : `!poll Quel est le meilleur langage ? | JavaScript | Python | Rust`");
    }

    const parts = input.split('|').map(s => s.trim());
    const question = parts[0];
    const options = parts.slice(1, 11); // max 10 options

    if (options.length < 2) {
      return message.reply('❌ Il faut au moins 2 options.');
    }

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const pollText = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 ${question}`)
      .setDescription(pollText)
      .setFooter({ text: `Sondage créé par ${message.author.tag} · Réagis avec l'emoji correspondant` })
      .setTimestamp();

    try {
      const pollMessage = await message.channel.send({ embeds: [embed] });

      // Ajouter les réactions
      for (let i = 0; i < options.length; i++) {
        await pollMessage.react(emojis[i]);
      }

      // Supprimer le message de commande
      await message.delete().catch(() => {});
    } catch (error) {
      console.error('Erreur poll :', error);
      message.reply('❌ Erreur lors de la création du sondage.');
    }
  },
};
