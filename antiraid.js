const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getFeatureSettings, isFeatureEnabled } = require('./features');

// ── In-memory tracking ──────────────────────────────────────────
const joinTracker = new Map();    // guildId → [{ userId, timestamp }]
const messageTracker = new Map(); // guildId_userId → [{ timestamp }]
const lockedChannels = new Map();  // guildId → Set<channelId>
let raidMode = new Map();          // guildId → boolean
let whitelistedUsers = new Map(); // guildId → Set<userId>
let whitelistedRoles = new Map(); // guildId → Set<roleId>

function getSettings(guildId) {
  return getFeatureSettings('antiraid');
}

function isExempt(member) {
  const gId = member.guild.id;
  if (whitelistedUsers.get(gId)?.has(member.id)) return true;
  const exemptRoles = whitelistedRoles.get(gId);
  if (exemptRoles && member.roles.cache.some(r => exemptRoles.has(r.id))) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return false;
}

function cleanJoins(guildId, windowMs) {
  const now = Date.now();
  const joins = joinTracker.get(guildId);
  if (!joins) return [];
  const filtered = joins.filter(j => now - j.timestamp < windowMs);
  joinTracker.set(guildId, filtered);
  return filtered;
}

async function logAction(guild, text, color = 0xE74C3C) {
  const s = getSettings(guild.id);
  if (!s.logChannel) return;
  const ch = guild.channels.cache.get(s.logChannel);
  if (!ch || !ch.isTextBased()) return;
  try {
    await ch.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🛡️ Anti-Raid').setDescription(text).setTimestamp()] });
  } catch {}
}

// ── JOIN HANDLER ─────────────────────────────────────────────────
async function handleJoin(member) {
  if (!isFeatureEnabled('antiraid')) return;
  if (isExempt(member)) return;

  const guild = member.guild;
  const s = getSettings(guild.id);
  const now = Date.now();
  const user = member.user;
  const ageMs = now - user.createdTimestamp;
  const ageDays = ageMs / 86400000;

  // 1) Account age check
  if (s.accountAgeDays > 0 && ageDays < s.accountAgeDays) {
    const reason = `Anti-Raid: Compte trop récent (${ageDays.toFixed(1)}j < ${s.accountAgeDays}j requis)`;
    await logAction(guild, `⛔ **${user.tag}** kick — ${reason}`);
    try { await member.send(`❌ Tu as été expulsé de **${guild.name}** : ${reason}`).catch(() => {}); } catch {}
    try { await member.kick(reason); } catch {}
    return;
  }

  // 2) Avatar check
  if (s.requireAvatar && !user.avatar) {
    const reason = 'Anti-Raid: Aucun avatar';
    await logAction(guild, `⛔ **${user.tag}** kick — ${reason}`);
    try { await member.send(`❌ Tu as été expulsé de **${guild.name}** : ${reason}`).catch(() => {}); } catch {}
    try { await member.kick(reason); } catch {}
    return;
  }

  // 3) Raid mode check
  if (raidMode.get(guild.id)) {
    const reason = 'Anti-Raid: Mode raid actif';
    await logAction(guild, `🚨 **RAID MODE** — **${user.tag}** kick automatique`);
    try { await member.kick(reason); } catch {}
    return;
  }

  // 4) Join rate tracking
  if (s.maxJoinsCount > 0 && s.maxJoinsWindow > 0) {
    if (!joinTracker.has(guild.id)) joinTracker.set(guild.id, []);
    const joins = joinTracker.get(guild.id);
    joins.push({ userId: user.id, timestamp: now });
    const windowMs = s.maxJoinsWindow * 1000;
    const recent = cleanJoins(guild.id, windowMs);

    if (recent.length >= s.maxJoinsCount) {
 await logAction(guild, `🚨 **RAID DÉTECTÉ** — ${recent.length} joins en ${s.maxJoinsWindow}s ! Activation protection.`, 0xFF0000);

      // Auto-lock channels if enabled
      if (s.autoLockChannels) {
        await lockAllChannels(guild);
        await logAction(guild, `🔒 Tous les salons ont été verrouillés automatiquement.`, 0xFF8C00);
      }

      // Auto-raid mode
      raidMode.set(guild.id, true);
      await logAction(guild, `🚨 **RAID MODE ACTIVÉ AUTOMATIQUEMENT**`, 0xFF0000);

      // Punish recent joiners
      if (s.joinPunishment && s.joinPunishment !== 'none') {
        for (const join of recent) {
          const m = await guild.members.fetch(join.userId).catch(() => null);
          if (!m || isExempt(m)) continue;
          try {
            if (s.joinPunishment === 'ban') {
              await m.ban({ reason: 'Anti-Raid: Join pendant raid' });
              await logAction(guild, `🔨 **${m.user.tag}** banni (raid)`);
            } else {
              await m.kick('Anti-Raid: Join pendant raid');
              await logAction(guild, `👢 **${m.user.tag}** kick (raid)`);
            }
          } catch {}
        }
      }

      // Auto-unlock after delay
      const unlockDelay = (s.autoUnlockMinutes || 10) * 60000;
      setTimeout(async () => {
        if (s.autoLockChannels) await unlockAllChannels(guild);
        raidMode.delete(guild.id);
        joinTracker.delete(guild.id);
        await logAction(guild, `✅ Raid terminé. Protection désactivée.`, 0x2ECC71);
      }, unlockDelay);
    }
  }
}

// ── MESSAGE HANDLER ──────────────────────────────────────────────
async function handleMessage(message) {
  if (!isFeatureEnabled('antiraid')) return false;
  if (message.author.bot || !message.guild) return false;
  if (isExempt(message.member)) return false;

  const guild = message.guild;
  const s = getSettings(guild.id);
  const key = `${guild.id}_${message.author.id}`;
  const now = Date.now();

  // 1) Anti-mention spam
  if (s.antiMention && s.maxMentions > 0) {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount >= s.maxMentions) {
      await logAction(guild, `📢 **${message.author.tag}** mention spam (${mentionCount} mentions dans un message)`);
      try { await message.delete(); } catch {}
      await punishMember(message.member, s.mentionPunishment || 'mute', 'Anti-Raid: Mention spam');
      return true;
    }
  }

  // 2) Anti-message spam
  if (s.antiSpam && s.spamMaxMessages > 0 && s.spamWindow > 0) {
    if (!messageTracker.has(key)) messageTracker.set(key, []);
    const msgs = messageTracker.get(key);
    msgs.push({ timestamp: now });
    const windowMs = s.spamWindow * 1000;
    // Clean old entries
    const recent = msgs.filter(m => now - m.timestamp < windowMs);
    messageTracker.set(key, recent);

    if (recent.length >= s.spamMaxMessages) {
      await logAction(guild, `💬 **${message.author.tag}** spam détecté (${recent.length} msgs en ${s.spamWindow}s)`);
      // Delete recent messages
      try {
        const channelMessages = await message.channel.messages.fetch({ limit: recent.length + 2 });
        const toDelete = channelMessages.filter(m => m.author.id === message.author.id && now - m.createdTimestamp < windowMs);
        if (toDelete.size > 0) await message.channel.bulkDelete(toDelete, true);
      } catch {}
      await punishMember(message.member, s.spamPunishment || 'mute', 'Anti-Raid: Spam');
      messageTracker.delete(key);
      return true;
    }
  }

  // 3) Anti-webhook (during raid mode)
  if (raidMode.get(guild.id) && message.webhookId && s.antiWebhook) {
    try { await message.delete(); } catch {}
    await logAction(guild, `🔗 Message webhook supprimé (raid mode actif)`);
    return true;
  }

  // 4) Anti-invite links
  if (s.antiInvite) {
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/\S+/gi;
    if (inviteRegex.test(message.content)) {
      await logAction(guild, `🔗 **${message.author.tag}** lien d'invitation détecté`);
      try { await message.delete(); } catch {}
      try { await message.author.send(`❌ Les liens d'invitation sont interdits sur **${guild.name}**.`).catch(() => {}); } catch {}
      return true;
    }
  }

  // 5) Anti-zalgo / mass emoji
  if (s.antiZalgo) {
    const zalgoRegex = /[\u0300-\u036f]{3,}/g;
    if (zalgoRegex.test(message.content)) {
      try { await message.delete(); } catch {}
      return true;
    }
  }

  if (s.antiMassEmoji && s.maxEmojiPerMsg > 0) {
    const emojiRegex = /<a?:\w+:\d+>|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = message.content.match(emojiRegex) || [];
    if (emojis.length > s.maxEmojiPerMsg) {
      try { await message.delete(); } catch {}
      return true;
    }
  }

  return false;
}

// ── PUNISHMENT ───────────────────────────────────────────────────
async function punishMember(member, type, reason) {
  try {
    if (type === 'ban') {
      await member.ban({ reason });
    } else if (type === 'kick') {
      await member.kick(reason);
    } else if (type === 'mute') {
      // Try timeout (Discord native mute)
      if (member.communicationDisabledUntilTimestamp > Date.now()) return;
      await member.timeout(300000, reason); // 5 min
    }
  } catch (e) {
    console.error('AntiRaid punish error:', e.message);
  }
}

// ── LOCK / UNLOCK ALL CHANNELS ──────────────────────────────────
async function lockAllChannels(guild) {
  const everyone = guild.roles.everyone;
  const channels = guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor?.(everyone)?.has(PermissionFlagsBits.SendMessages));
  const locked = new Set();
  for (const [, ch] of channels) {
    try {
      await ch.permissionOverwrites.edit(everyone, { SendMessages: false });
      locked.add(ch.id);
    } catch {}
  }
  lockedChannels.set(guild.id, locked);
}

async function unlockAllChannels(guild) {
  const everyone = guild.roles.everyone;
  const locked = lockedChannels.get(guild.id);
  if (!locked) return;
  for (const chId of locked) {
    const ch = guild.channels.cache.get(chId);
    if (!ch) continue;
    try {
      await ch.permissionOverwrites.edit(everyone, { SendMessages: null });
    } catch {}
  }
  lockedChannels.delete(guild.id);
}

// ── RAID MODE CONTROL ────────────────────────────────────────────
function setRaidMode(guildId, enabled) {
  if (enabled) raidMode.set(guildId, true);
  else raidMode.delete(guildId);
  return enabled;
}

function isRaidMode(guildId) {
  return raidMode.has(guildId);
}

// ── WHITELIST MANAGEMENT ─────────────────────────────────────────
function addToWhitelist(guildId, type, id) {
  if (type === 'user') {
    if (!whitelistedUsers.has(guildId)) whitelistedUsers.set(guildId, new Set());
    whitelistedUsers.get(guildId).add(id);
  } else {
    if (!whitelistedRoles.has(guildId)) whitelistedRoles.set(guildId, new Set());
    whitelistedRoles.get(guildId).add(id);
  }
}

function removeFromWhitelist(guildId, type, id) {
  if (type === 'user') whitelistedUsers.get(guildId)?.delete(id);
  else whitelistedRoles.get(guildId)?.delete(id);
}

function getWhitelist(guildId) {
  return {
    users: [...(whitelistedUsers.get(guildId) || [])],
    roles: [...(whitelistedRoles.get(guildId) || [])],
  };
}

// ── GET STATS ─────────────────────────────────────────────────────
function getStats(guildId) {
  const s = getSettings(guildId);
 const joins = cleanJoins(guildId, (s.maxJoinsWindow || 10) * 1000);
  return {
    raidMode: isRaidMode(guildId),
    recentJoins: joins.length,
    recentJoinsList: joins.slice(-10),
    lockedChannels: lockedChannels.get(guildId)?.size || 0,
    whitelist: getWhitelist(guildId),
  };
}

module.exports = {
  handleJoin, handleMessage, setRaidMode, isRaidMode,
  addToWhitelist, removeFromWhitelist, getWhitelist, getStats,
  lockAllChannels, unlockAllChannels,
};
