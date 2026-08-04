const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const antiRaid = require('../antiraid');
const { isFeatureEnabled, getFeatureSettings } = require('../features');

module.exports = {
  data: {
    name: 'antiraid',
    description: 'Gérer la protection anti-raid du serveur',
  },
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  slash: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Gérer la protection anti-raid du serveur')
    .addSubcommand(s => s.setName('status').setDescription('Voir le statut de la protection anti-raid'))
    .addSubcommand(s => s
      .setName('raidmode')
      .setDescription('Activer/désactiver le mode raid d\'urgence')
      .addBooleanOption(o => o.setName('activer').setDescription('true = activer, false = désactiver').setRequired(true))
    )
    .addSubcommand(s => s
      .setName('whitelist')
      .setDescription('Gérer la liste blanche anti-raid')
      .addStringOption(o => o.setName('action').setDescription('add ou remove').setRequired(true).addChoices({ name: 'add_user', value: 'add_user' }, { name: 'remove_user', value: 'remove_user' }, { name: 'add_role', value: 'add_role' }, { name: 'remove_role', value: 'remove_role' }, { name: 'list', value: 'list' }))
      .addUserOption(o => o.setName('membre').setDescription('Utilisateur (pour add/remove user)'))
      .addRoleOption(o => o.setName('role').setDescription('Rôle (pour add/remove role)'))
    )
    .addSubcommand(s => s
      .setName('unlock')
      .setDescription('Déverrouiller manuellement tous les salons')
    ),

  async execute(msg, args, client) {
    if (msg._interaction) {
      await this.executeInteraction(msg, args, client);
      return;
    }
    // Legacy prefix fallback
    const sub = args[0];
    if (sub === 'status') return this.showStatus(msg);
    if (sub === 'raidmode') return this.toggleRaidMode(msg, args[1] === 'on');
    if (sub === 'whitelist') return this.handleWhitelist(msg, args);
    if (sub === 'unlock') return this.manualUnlock(msg);
    return msg.reply('Utilise: `!antiraid status|raidmode|whitelist|unlock`');
  },

  async executeInteraction(msg, args, client) {
    const sub = msg.options.getSubcommand();
    if (sub === 'status') return this.showStatus(msg);
    if (sub === 'raidmode') return this.toggleRaidMode(msg, msg.options.getBoolean('activer'));
    if (sub === 'whitelist') return this.handleWhitelistInteraction(msg);
    if (sub === 'unlock') return this.manualUnlock(msg);
  },

  async showStatus(msg) {
    const guild = msg.guild;
    const s = getFeatureSettings('antiraid');
    const stats = antiRaid.getStats(guild.id);
    const enabled = isFeatureEnabled('antiraid');

    const embed = new EmbedBuilder()
      .setColor(enabled ? (stats.raidMode ? 0xFF0000 : 0x2ECC71) : 0x808080)
      .setTitle('🛡️ Anti-Raid — Statut')
      .setThumbnail(guild.iconURL({ size: 64 }) || null)
      .addFields(
        { name: 'Système', value: enabled ? '✅ **ACTIF**' : '❌ **INACTIF**', inline: true },
        { name: 'Mode Raid', value: stats.raidMode ? '🚨 **ACTIF**' : '⬜ Désactivé', inline: true },
        { name: 'Salons verrouillés', value: `${stats.lockedChannels}`, inline: true },
        { name: 'Âge minimum compte', value: `${s.accountAgeDays || 0} jours`, inline: true },
        { name: 'Vérifier avatar', value: s.requireAvatar ? '✅ Oui' : '❌ Non', inline: true },
        { name: 'Seuil joins', value: `${s.maxJoinsCount || 0} joins / ${s.maxJoinsWindow || 0}s`, inline: true },
        { name: 'Punition joins', value: s.joinPunishment || 'none', inline: true },
        { name: 'Anti-spam', value: s.antiSpam ? `✅ ${s.spamMaxMessages} msgs / ${s.spamWindow}s` : '❌ Non', inline: true },
        { name: 'Anti-mentions', value: s.antiMention ? `✅ max ${s.maxMentions}` : '❌ Non', inline: true },
        { name: 'Anti-invitations', value: s.antiInvite ? '✅ Oui' : '❌ Non', inline: true },
        { name: 'Anti-webhook', value: s.antiWebhook ? '✅ Oui' : '❌ Non', inline: true },
        { name: 'Anti-zalgo', value: s.antiZalgo ? '✅ Oui' : '❌ Non', inline: true },
        { name: 'Anti-mass emoji', value: s.antiMassEmoji ? `✅ max ${s.maxEmojiPerMsg}` : '❌ Non', inline: true },
        { name: 'Auto-lock salons', value: s.autoLockChannels ? '✅ Oui' : '❌ Non', inline: true },
        { name: 'Auto-déverrouiller', value: `${s.autoUnlockMinutes || 10} min`, inline: true },
      );

    const reply = { embeds: [embed], ephemeral: true };
    if (msg.replied || msg.deferred) await msg.followUp(reply);
    else if (msg.deferReply) await msg.reply(reply);
    else await msg.reply(reply);
  },

  async toggleRaidMode(msg, enable) {
    const guild = msg.guild;
    antiRaid.setRaidMode(guild.id, enable);

    if (enable) {
      const s = getFeatureSettings('antiraid');
      if (s.autoLockChannels) await antiRaid.lockAllChannels(guild);
    } else {
      await antiRaid.unlockAllChannels(guild);
    }

    const embed = new EmbedBuilder()
      .setColor(enable ? 0xFF0000 : 0x2ECC71)
      .setTitle(enable ? '🚨 MODE RAID ACTIVÉ' : '✅ MODE RAID DÉSACTIVÉ')
      .setDescription(enable
        ? 'Tous les nouveaux membres seront **expulsés automatiquement**. Les salons sont verrouillés.'
        : 'Protection normale rétablie. Les salons sont déverrouillés.')
      .setTimestamp();

    const reply = { embeds: [embed] };
    if (msg.replied || msg.deferred) await msg.followUp(reply);
    else if (msg.deferReply) await msg.reply(reply);
    else await msg.reply(reply);
  },

  async handleWhitelistInteraction(msg) {
    const action = msg.options.getString('action');
    const member = msg.options.getUser('membre');
    const role = msg.options.getRole('role');
    await this._whitelist(msg, action, member?.id, role?.id);
  },

  async handleWhitelist(msg, args) {
    const action = args[1];
    const target = msg.mentions.users.first() || msg.mentions.roles.first();
    const id = target?.id || args[2];
    const type = target instanceof require('discord.js').Role ? 'role' : 'user';
    const actionMap = { add: `add_${type}`, remove: `remove_${type}`, list: 'list' };
    await this._whitelist(msg, actionMap[action] || 'list', type === 'user' ? id : null, type === 'role' ? id : null);
  },

  async _whitelist(msg, action, userId, roleId) {
    const guild = msg.guild;
    if (action === 'list') {
      const wl = antiRaid.getWhitelist(guild.id);
      const users = wl.users.map(id => `<@${id}>`).join(', ') || 'Aucun';
      const roles = wl.roles.map(id => `<@&${id}>`).join(', ') || 'Aucun';
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📋 Liste blanche Anti-Raid')
        .addFields(
          { name: 'Utilisateurs exemptés', value: users, inline: false },
          { name: 'Rôles exemptés', value: roles, inline: false },
        );
      const reply = { embeds: [embed], ephemeral: true };
      if (msg.replied || msg.deferred) await msg.followUp(reply);
      else if (msg.deferReply) await msg.reply(reply);
      else await msg.reply(reply);
      return;
    }

    if (action === 'add_user' && userId) {
      antiRaid.addToWhitelist(guild.id, 'user', userId);
      const reply = { content: `✅ <@${userId}> ajouté à la liste blanche.`, ephemeral: true };
      if (msg.replied || msg.deferred) await msg.followUp(reply);
      else if (msg.deferReply) await msg.reply(reply);
      else await msg.reply(reply);
    } else if (action === 'remove_user' && userId) {
      antiRaid.removeFromWhitelist(guild.id, 'user', userId);
      const reply = { content: `✅ <@${userId}> retiré de la liste blanche.`, ephemeral: true };
      if (msg.replied || msg.deferred) await msg.followUp(reply);
      else if (msg.deferReply) await msg.reply(reply);
      else await msg.reply(reply);
    } else if (action === 'add_role' && roleId) {
      antiRaid.addToWhitelist(guild.id, 'role', roleId);
      const reply = { content: `✅ <@&${roleId}> ajouté à la liste blanche.`, ephemeral: true };
      if (msg.replied || msg.deferred) await msg.followUp(reply);
      else if (msg.deferReply) await msg.reply(reply);
      else await msg.reply(reply);
    } else if (action === 'remove_role' && roleId) {
      antiRaid.removeFromWhitelist(guild.id, 'role', roleId);
      const reply = { content: `✅ <@&${roleId}> retiré de la liste blanche.`, ephemeral: true };
      if (msg.replied || msg.deferred) await msg.followUp(reply);
      else if (msg.deferReply) await msg.reply(reply);
      else await msg.reply(reply);
    }
  },

  async manualUnlock(msg) {
    await antiRaid.unlockAllChannels(msg.guild);
    antiRaid.setRaidMode(msg.guild.id, false);
    const reply = { content: '✅ Tous les salons déverrouillés et mode raid désactivé.' };
    if (msg.replied || msg.deferred) await msg.followUp(reply);
    else if (msg.deferReply) await msg.reply(reply);
    else await msg.reply(reply);
  },
};
