const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

function parseRelativeTime(input) {
  const match = input.match(/^(\d+)\s*(s|m|h|d|w|mo)$/i);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const now = Date.now();

  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, mo: 2592000000 };
  if (!multipliers[unit]) return null;

  return now + amount * multipliers[unit];
}

function parseDate(input) {
  let match;

  match = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match.map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match.map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  match = input.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, d, m, y] = match.map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  return null;
}

module.exports = {
  data: { name: 'timestamp' },
  description: 'Convertit une date en format timestamp Discord',
  slash: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Convertit une date en timestamp Discord')
    .addStringOption(o => o.setName('date').setDescription('Date (2024-01-15, 15/01/2024) ou relatif (1h, 2d, 3s)').setRequired(true)),
  async execute(msg) {
    try {
      const input = msg.options.getString('date').trim();

      let timestamp = parseRelativeTime(input);
      if (timestamp === null) timestamp = parseDate(input);

      if (timestamp === null || isNaN(timestamp)) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Format invalide')
          .setDescription('Formats acceptés :\n- **Absolu** : `2024-01-15`, `15/01/2024`, `15-01-2024`\n- **Relatif** : `1s`, `2m`, `3h`, `4d`, `5w`, `6mo`')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      const ts = Math.floor(timestamp / 1000);

      const preview = (style) => '<t:' + ts + ':' + style + '>';
      const code = (style) => '`<t:' + ts + ':' + style + '>`';

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🕐 Timestamp Discord')
        .setDescription('**Timestamp :** `' + ts + '`\n**Date :** ' + preview('F'))
        .addFields(
          { name: 'Temps court (t)', value: preview('t') + '  ' + code('t'), inline: false },
          { name: 'Temps long (T)', value: preview('T') + '  ' + code('T'), inline: false },
          { name: 'Date courte (d)', value: preview('d') + '  ' + code('d'), inline: false },
          { name: 'Date longue (D)', value: preview('D') + '  ' + code('D'), inline: false },
          { name: 'Complet (f)', value: preview('f') + '  ' + code('f'), inline: false },
          { name: 'Complet long (F)', value: preview('F') + '  ' + code('F'), inline: false },
          { name: 'Relatif (R)', value: preview('R') + '  ' + code('R'), inline: false },
        )
        .setFooter({ text: 'Demandé par ' + msg.user.tag })
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur timestamp:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la conversion du timestamp.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
