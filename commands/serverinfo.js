const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'serverinfo' },
  description: 'Affiche les informations détaillées sur le serveur',
  cooldown: 10,
  slash: new SlashCommandBuilder().setName('serverinfo').setDescription('Affiche les informations detaillees sur le serveur'),
  async execute(message) {
    const guild = message.guild;

    const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const idle = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
    const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
    const offline = guild.memberCount - online - idle - dnd;

    const channels = {
      text: guild.channels.cache.filter(c => c.type === 0).size,
      voice: guild.channels.cache.filter(c => c.type === 2).size,
      category: guild.channels.cache.filter(c => c.type === 4).size,
      announcement: guild.channels.cache.filter(c => c.type === 5).size,
      stage: guild.channels.cache.filter(c => c.type === 13).size,
    };

    const boosts = guild.premiumSubscriptionCount || 0;
    const boostLevel = guild.premiumTier;

    const embed = new EmbedBuilder()
      .setColor(guild.roles.highest?.color || 0x5865F2)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
      .setThumbnail(guild.iconURL({ size: 512 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Membres', value: `Total : **${guild.memberCount}**\n🟢 ${online} en ligne · 🟡 ${idle} inactif · 🔴 ${dnd} ne pas déranger · ⚫ ${offline} hors ligne`, inline: false },
        { name: 'Canaux', value: `📝 ${channels.text} textuels · 🔊 ${channels.voice} vocaux · 📁 ${channels.category} catégories`, inline: false },
        { name: 'Rôles', value: `${guild.roles.cache.size} rôles`, inline: true },
        { name: 'Boosts', value: `Niveau ${boostLevel} (${boosts} boosts)`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size} emojis`, inline: true },
      );

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    embed
      .setFooter({ text: `Demandé par ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
