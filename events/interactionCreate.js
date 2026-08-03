const {
  ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const config = require('../config');
const { isFeatureEnabled, getFeatureForCommand, FEATURE_DEFINITIONS } = require('../features');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // ── Slash Commands ─────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const featureKey = getFeatureForCommand(interaction.commandName);
      if (featureKey && !isFeatureEnabled(featureKey)) {
        return interaction.reply({ content: `❌ **${FEATURE_DEFINITIONS[featureKey].label}** est désactivé.`, ephemeral: true });
      }

      // Universal wrapper: supports both old (message-style) and new (interaction-style) commands
      const msg = {
        _interaction: interaction,
        author: interaction.user,
        user: interaction.user,
        member: interaction.member,
        guild: interaction.guild,
        channel: interaction.channel,
        client: interaction.client,
        createdTimestamp: interaction.createdTimestamp,
        replied: interaction.replied,
        deferred: interaction.deferred,
        options: interaction.options,
        mentions: {
          users: { first: () => interaction.options.getUser('membre') || interaction.options.getUser('user') },
          members: { first: () => { const u = interaction.options.getUser('membre') || interaction.options.getUser('user'); return u ? interaction.guild?.members.cache.get(u.id) : null; } },
          channels: { first: () => interaction.options.getChannel('valeur') || interaction.options.getChannel('salon') },
          roles: { first: () => { const m = interaction.options.getMentionable('valeur') || interaction.options.getRole('role'); return m?.role || m || null; } },
        },
        reply: async (o) => { if (typeof o === 'string') o = { content: o }; if (interaction.replied || interaction.deferred) return interaction.followUp({ ...o, ephemeral: o.ephemeral || false }); return interaction.reply({ ...o, ephemeral: o.ephemeral || false }); },
        deferReply: (o) => interaction.deferReply(o),
        editReply: (o) => interaction.editReply(o),
        followUp: (o) => interaction.followUp(o),
        edit: (o) => interaction.editReply(o),
        delete: async () => {},
      };

      try {
        await command.execute(msg, [], client);
      } catch (err) {
        console.error(`Cmd ${interaction.commandName}:`, err);
        const r = { content: '❌ Une erreur est survenue.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(r);
        else await interaction.reply(r);
      }
      return;
    }

    if (!interaction.isButton()) return;
    const { customId, user, guild } = interaction;

    // Feature checks
    if (customId === 'create_ticket' && !isFeatureEnabled('tickets')) return interaction.reply({ content: '❌ Tickets désactivés.', ephemeral: true });
    if (customId.startsWith('rps_') && !isFeatureEnabled('fun')) return interaction.reply({ content: '❌ Fun désactivé.', ephemeral: true });
    if (customId.startsWith('ttt_') && !isFeatureEnabled('games')) return interaction.reply({ content: '❌ Jeux désactivés.', ephemeral: true });
    if (customId.startsWith('hm_') && !isFeatureEnabled('games')) return interaction.reply({ content: '❌ Jeux désactivés.', ephemeral: true });
    if (customId.startsWith('ms_') && !isFeatureEnabled('games')) return interaction.reply({ content: '❌ Jeux désactivés.', ephemeral: true });
    if (customId.startsWith('c4_') && !isFeatureEnabled('games')) return interaction.reply({ content: '❌ Jeux désactivés.', ephemeral: true });
    if (customId.startsWith('gw_join_') && !isFeatureEnabled('social')) return interaction.reply({ content: '❌ Social désactivé.', ephemeral: true });

    // ── Ticket Buttons ──────────────────────────────────────────────
    if (customId === 'create_ticket') {
      try {
        const existing = guild.channels.cache.find(ch => ch.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        if (existing) return interaction.reply({ content: `❌ Tu as déjà un ticket : ${existing}`, ephemeral: true });
        const category = config.tickets.categoryId ? guild.channels.cache.get(config.tickets.categoryId) : null;
        await interaction.deferReply({ ephemeral: true });
        const ch = await guild.channels.create({
          name: `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          type: ChannelType.GuildText, parent: category || undefined,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...(config.modRoleId ? [{ id: config.modRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }] : []),
          ],
        });
        const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle('🎫 Ticket créé').setDescription(`Bonjour ${user}, décris ton problème.`).setFooter({ text: 'Ce canal sera supprimé à la fermeture.' });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Fermer').setStyle(ButtonStyle.Danger));
        await ch.send({ content: `${user} ${config.modRoleId ? `<@&${config.modRoleId}>` : ''}`, embeds: [embed], components: [row] });
        await interaction.editReply(`✅ Ticket créé : ${ch}`);
      } catch (e) { console.error('Ticket create:', e); await interaction.editReply('❌ Erreur création ticket.'); }
      return;
    }
    if (customId === 'close_ticket') {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('🔒 Fermeture').setDescription('Fermeture dans 5s...')] });
      setTimeout(() => interaction.channel.delete('Ticket fermé').catch(() => {}), 5000);
      return;
    }

    // ── Drop Money ──────────────────────────────────────────────────
    if (customId.startsWith('dropclaim_')) {
      try {
        const dm = require('../commands/dropmoney');
        const id = customId.replace('dropclaim_', '');
        const drop = dm.activeDrops.get(id);
        if (!drop || drop.claimed) return interaction.reply({ content: '❌ Drop introuvable ou déjà réclamé.', ephemeral: true });
        if (user.id === drop.authorId) return interaction.reply({ content: '❌ Tu ne peux pas réclamer ton propre drop !', ephemeral: true });
        drop.claimed = true;
        const db = require('../database');
        db.addMoney(guild.id, user.id, drop.amount);
        dm.activeDrops.delete(id);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('dropclaim_done').setLabel('✅ Réclamé').setStyle(ButtonStyle.Success).setDisabled(true));
        await interaction.update({ content: `💰 **${user.username}** a réclamé **${drop.amount}** pièces !`, components: [row] });
      } catch (e) { console.error('Drop claim:', e); }
      return;
    }

    // ── Drop XP ─────────────────────────────────────────────────────
    if (customId.startsWith('dropxp_')) {
      try {
        const dx = require('../commands/dropxp');
        const id = customId.replace('dropxp_', '');
        const drop = dx.activeDrops?.get(id);
        if (!drop || drop.claimed) return interaction.reply({ content: '❌ Drop introuvable.', ephemeral: true });
        if (user.id === drop.authorId) return interaction.reply({ content: '❌ Tu ne peux pas réclamer ton propre drop !', ephemeral: true });
        drop.claimed = true;
        const db = require('../database');
        db.addXP(guild.id, user.id, drop.amount);
        dx.activeDrops?.delete(id);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('dropxp_done').setLabel('✅ Réclamé').setStyle(ButtonStyle.Success).setDisabled(true));
        await interaction.update({ content: `⭐ **${user.username}** a gagné **${drop.amount} XP** !`, components: [row] });
      } catch (e) { console.error('Drop XP:', e); }
      return;
    }

    // ── Shop Pagination ─────────────────────────────────────────────
    if (customId.startsWith('shop_prev_') || customId.startsWith('shop_next_')) {
      try {
        const shop = require('../commands/shop');
        const page = customId.startsWith('shop_prev_') ? parseInt(customId.split('_')[2]) - 1 : parseInt(customId.split('_')[2]) + 1;
        const { embed, row } = shop.buildPage(guild.id, page);
        await interaction.update({ embeds: [embed], components: [row] });
      } catch (e) { console.error('Shop page:', e); }
      return;
    }

    // ── Inventory Pagination ─────────────────────────────────────────
    if (customId.startsWith('inv_prev_') || customId.startsWith('inv_next_')) {
      try {
        const inv = require('../commands/inventory');
        const parts = customId.split('_');
        const userId = parts[2];
        const page = parts[0] === 'inv_prev' ? parseInt(parts[3]) - 1 : parseInt(parts[3]) + 1;
        const { embed, row } = inv.buildPage(guild.id, userId, page);
        await interaction.update({ embeds: [embed], components: [row] });
      } catch (e) { console.error('Inv page:', e); }
      return;
    }

    // ── TopMoney Pagination ──────────────────────────────────────────
    if (customId.startsWith('top_prev_') || customId.startsWith('top_next_')) {
      try {
        const tm = require('../commands/topmoney');
        const page = customId.startsWith('top_prev_') ? parseInt(customId.split('_')[2]) - 1 : parseInt(customId.split('_')[2]) + 1;
        const { embed, row } = tm.buildPage(guild.id, page);
        await interaction.update({ embeds: [embed], components: [row] });
      } catch (e) { console.error('TopMoney page:', e); }
      return;
    }

    // ── Rewards Claim ────────────────────────────────────────────────
    if (customId.startsWith('reward_')) {
      try {
        const rw = require('../commands/rewards');
        rw.handleClaim(interaction, customId);
      } catch (e) { console.error('Reward claim:', e); }
      return;
    }

    // ── Game Buttons (delegated to command modules) ──────────────────
    if (customId.startsWith('ttt_') || customId.startsWith('hm_') || customId.startsWith('ms_') || customId.startsWith('c4_')) {
      try {
        const modMap = { ttt_: 'tictactoe', hm_: 'hangman', ms_: 'minesweeper', c4_: 'connect4' };
        const prefix = Object.keys(modMap).find(p => customId.startsWith(p));
        const cmd = require('../commands/' + modMap[prefix]);
        if (cmd.handleButton) await cmd.handleButton(interaction, client);
      } catch (e) { console.error('Game button:', e); }
      return;
    }

    // ── Giveaway Join ────────────────────────────────────────────────
    if (customId.startsWith('gw_join_')) {
      try {
        const gw = require('../commands/giveaway');
        if (gw.handleJoin) gw.handleJoin(interaction);
      } catch (e) { console.error('GW join:', e); }
      return;
    }

    // ── RPS ──────────────────────────────────────────────────────────
    if (customId.startsWith('rps_')) {
      try {
        const rps = require('../commands/rps');
        const { CHOICES, activeGames } = rps;
        const game = activeGames.get(user.id);
        if (!game) return interaction.reply({ content: '❌ Pas de partie en cours.', ephemeral: true });
        const choiceMap = { rps_rock: 0, rps_paper: 1, rps_scissors: 2 };
        const idx = choiceMap[customId];
        if (idx === undefined) return;
        const pc = CHOICES[idx], bc = CHOICES[Math.floor(Math.random() * CHOICES.length)];
        let result, color;
        if (pc.name === bc.name) { result = 'Égalité ! 🤝'; color = 0xF39C12; }
        else if (pc.beats === bc.name) { result = 'Tu as gagné ! 🎉'; color = 0x2ECC71; }
        else { result = 'Tu as perdu ! 😢'; color = 0xE74C3C; }
        const embed = new EmbedBuilder().setColor(color).setTitle('🎮 Pierre-Papier-Ciseaux')
          .addFields({ name: user.username, value: `${pc.emoji} ${pc.name}`, inline: true }, { name: 'Bot', value: `${bc.emoji} ${bc.name}`, inline: true }, { name: 'Résultat', value: result });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Pierre').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Papier').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Ciseaux').setStyle(ButtonStyle.Danger).setDisabled(true),
        );
        activeGames.delete(user.id);
        await interaction.update({ embeds: [embed], components: [row] });
      } catch (e) { console.error('RPS button:', e); }
      return;
    }
  },
};
