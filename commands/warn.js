const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Fichier de stockage des warns (simple JSON)
const WARNS_FILE = path.join(__dirname, '..', 'data', 'warns.json');

function ensureWarnsFile() {
  const dir = path.dirname(WARNS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, '{}', 'utf-8');
}

function getWarns(guildId, userId) {
  ensureWarnsFile();
  const data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
  return data[`${guildId}-${userId}`] || [];
}

function addWarn(guildId, userId, reason, moderator) {
  ensureWarnsFile();
  const data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
  const key = `${guildId}-${userId}`;
  if (!data[key]) data[key] = [];
  data[key].push({ reason, moderator, date: new Date().toISOString() });
  fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data[key];
}

module.exports = {
  data: { name: 'warn' },
  description: 'Avertit un membre du serveur',
  usage: '<@membre> [raison]',
  permissions: [PermissionFlagsBits.ModerateMembers],
  requireModRole: false,
  cooldown: 5,
  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('❌ Tu dois mentionner un membre à avertir.\nUtilisation : `!warn <@membre> [raison]`');
    }

    const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';
    const warns = addWarn(message.guild.id, target.user.id, reason, message.author.tag);

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle('⚠️ Membre averti')
      .addFields(
        { name: 'Membre', value: `${target.user.tag} (${target.user.id})`, inline: true },
        { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
        { name: 'Raison', value: reason, inline: false },
        { name: 'Total warns', value: `${warns.length}`, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Notifier le membre en DM
    try {
      await target.send(`⚠️ Tu as reçu un avertissement sur **${message.guild.name}**.\n**Raison :** ${reason}`);
    } catch (e) {
      // DM fermés, on ignore
    }
  },
};
