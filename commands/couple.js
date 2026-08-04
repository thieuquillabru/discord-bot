const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const DESCRIPTIONS = [
  { min: 0, max: 15, emoji: '💔', text: ['C\'est un non catégorique...', 'Les étoiles sont contre vous.', 'Mieux vaut rester amis.'] },
  { min: 16, max: 30, emoji: '🤔', text: ['Pas vraiment fait l\'un pour l\'autre...', 'L\'alchimie n\'est pas là.', 'Peut-être dans une autre vie.'] },
  { min: 31, max: 50, emoji: '😊', text: ['Il y a un petit quelque chose...', 'Pas mal, mais pas fou non plus.', 'Une amitié prometteuse !'] },
  { min: 51, max: 70, emoji: '💛', text: ['Ça pourrait le faire !', 'De la bonne complicité.', 'Un couple potable.'] },
  { min: 71, max: 85, emoji: '💖', text: ['Beau duo !', 'L\'amour est dans l\'air !', 'Un très beau couple !'] },
  { min: 86, max: 95, emoji: '❤️', text: ['Amour fou !', 'Cupidon a bien fait son travail !', 'Des flammes passionnées !'] },
  { min: 96, max: 100, emoji: '💘', text: ['Âmes sœurs !', 'Un amour légendaire !', 'Le couple parfait, fait l\'un pour l\'autre !'] },
];

function getHeartBar(percent) {
  const filled = Math.round(percent / 5);
  return '❤️'.repeat(filled) + '🤍'.repeat(20 - filled);
}

module.exports = {
  data: { name: 'couple' },
  slash: new SlashCommandBuilder()
    .setName('couple')
    .setDescription('Calcule le pourcentage d\'amour entre deux utilisateurs')
    .addUserOption(o => o.setName('user').setDescription('L\'autre utilisateur (optionnel, par défaut toi)')),
  async execute(msg, client) {
    try {
      const target = msg.options.getUser('user') || msg.user;
      const user2 = target.id === msg.user.id ? client.user : target;
      const user1 = msg.user;

      // Deterministic "random" based on both IDs
      const seed = (BigInt(user1.id) + BigInt(user2.id)) % 1000n;
      const percent = Number(seed) % 101;

      const range = DESCRIPTIONS.find(r => percent >= r.min && percent <= r.max);
      const desc = range.text[Math.floor(Math.random() * range.text.length)];

      const embed = new EmbedBuilder()
        .setColor(percent >= 70 ? 0xE74C3C : 0x5865F2)
        .setTitle(`${range.emoji} Test de couple`)
        .setDescription(`**${user1.username}** et **${user2.username}**

${getHeartBar(percent)}
**${percent}%** d'amour !\n\n${desc}`)
        .setFooter({ text: `Demandé par ${user1.username}` })
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur couple:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },
};
