const config = require('../config');
const { EmbedBuilder } = require('discord.js');
const { isFeatureEnabled } = require('../features');
const antiRaid = require('../antiraid');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    // ── Anti-Raid FIRST (before welcome) ────────────────────
    await antiRaid.handleJoin(member);

    // If member was kicked by anti-raid, don't send welcome
    if (!member.guild.members.cache.has(member.id)) return;

    // ── Welcome message ─────────────────────────────────────
    if (!isFeatureEnabled('welcome')) return;
    const fs = require('../features');
    const ws = fs.getFeatureSettings('welcome');
    const channelId = ws.channel || config.welcome.channelId;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const msgTemplate = ws.message || config.welcome.message || 'Bienvenue {member} sur **{server}** ! \nNous sommes maintenant **{count}** membres.';
    const message = msgTemplate
      .replace(/{member}/g, member.toString())
      .replace(/{server}/g, member.guild.name)
      .replace(/{count}/g, member.guild.memberCount.toString())
      .replace(/{user}/g, member.user.username);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Nouveau membre !')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(message)
      .addFields(
        { name: 'Compte créé le', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'ID', value: member.user.id, inline: true }
      )
      .setFooter({ text: 'Bienvenue parmi nous !' })
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de bienvenue :', error);
    }

    // DM welcome
    if (ws.dmEnabled) {
      try {
        await member.send({ embeds: [embed] });
      } catch (e) { /* DM disabled */ }
    }
  },
};
