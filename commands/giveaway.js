const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');
const fs = require('fs');
const path = require('path');

const activeGiveaways = new Map();

function getGiveawayData() {
  return db.getData('giveaways');
}

function saveGiveawayData(data) {
  db.saveData('giveaways', data);
}

module.exports = {
  data: { name: 'giveaway' },
  slash: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gère les giveaways du serveur')
    .addSubcommand(sc => sc
      .setName('create')
      .setDescription('Crée un nouveau giveaway')
      .addChannelOption(o => o.setName('channel').setDescription('Canal du giveaway').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Durée en minutes').setRequired(true).setMinValue(1).setMaxValue(43200))
      .addStringOption(o => o.setName('prize').setDescription('Description du prix').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Nombre de gagnants (défaut: 1)').setRequired(false).setMinValue(1).setMaxValue(20)))
    .addSubcommand(sc => sc
      .setName('end')
      .setDescription('Termine un giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message du giveaway').setRequired(true)))
    .addSubcommand(sc => sc
      .setName('reroll')
      .setDescription('Relance le tirage d\'un giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message du giveaway').setRequired(true))),
  async execute(msg, client) {
    try {
      const sub = msg.options.getSubcommand();

      if (sub === 'create') {
        await msg.deferReply();
        const channel = msg.options.getChannel('channel');
        const duration = msg.options.getInteger('duration');
        const prize = msg.options.getString('prize');
        const winnerCount = msg.options.getInteger('winners') || 1;

        const endTime = Date.now() + duration * 60 * 1000;

        const embed = new EmbedBuilder()
          .setColor(0xF39C12)
          .setTitle('🎉 Giveaway !')
          .setDescription(`**${prize}**

Cliquez sur le bouton ci-dessous pour participer !

⏱️ Se termine dans : **${duration} minute${duration > 1 ? 's' : ''}**
🏆 ${winnerCount} gagnant${winnerCount > 1 ? 's' : ''}`)
          .setFooter({ text: `Créé par ${msg.user.username} · Se termine à` })
          .setTimestamp(endTime);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`gw_join_placeholder`)
            .setLabel(' Participer')
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Success)
        );

        const gwMessage = await channel.send({ embeds: [embed], components: [row] });
        // Update the customId to include message ID
        const joinRow = ActionRowBuilder.from(row).setComponents(
          new ButtonBuilder()
            .setCustomId(`gw_join_${gwMessage.id}`)
            .setLabel(' Participer')
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Success)
        );
        await gwMessage.edit({ components: [joinRow] });

        const giveaway = {
          messageId: gwMessage.id,
          channelId: channel.id,
          guildId: msg.guild.id,
          prize,
          winnerCount,
          endTime,
          hostId: msg.user.id,
          participants: [],
          ended: false,
        };

        // Save to file
        const data = getGiveawayData();
        data[gwMessage.id] = giveaway;
        saveGiveawayData(data);

        activeGiveaways.set(gwMessage.id, giveaway);

        // Set timeout
        const timer = setTimeout(async () => {
          await endGiveaway(gwMessage.id, client);
        }, duration * 60 * 1000);
        activeGiveaways.get(gwMessage.id).timer = timer;

        await msg.editReply({ content: `✅ Giveaway créé dans ${channel} !`, embeds: [] });
        return;
      }

      if (sub === 'end') {
        const messageId = msg.options.getString('message_id');
        await endGiveaway(messageId, client, msg);
        return;
      }

      if (sub === 'reroll') {
        const messageId = msg.options.getString('message_id');
        await rerollGiveaway(messageId, client, msg);
        return;
      }
    } catch (err) {
      console.error('Erreur giveaway:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
      else await msg.followUp({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },

  activeGiveaways,
  getGiveawayData,
  saveGiveawayData,
};

async function endGiveaway(messageId, client, msg) {
  const giveaway = activeGiveaways.get(messageId);
  if (!giveaway) {
    if (msg) return msg.reply({ content: '❌ Giveaway introuvable.', ephemeral: true });
    return;
  }

  if (giveaway.ended) {
    if (msg) return msg.reply({ content: '❌ Ce giveaway est déjà terminé.', ephemeral: true });
    return;
  }

  clearTimeout(giveaway.timer);
  giveaway.ended = true;

  // Remove unique participants
  const participants = [...new Set(giveaway.participants)];

  const channel = client.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  let gwMsg;
  try {
    gwMsg = await channel.messages.fetch(messageId);
  } catch { return; }

  const endEmbed = new EmbedBuilder()
    .setColor(giveaway.winnerCount > 0 && participants.length > 0 ? 0x2ECC71 : 0xE74C3C)
    .setTitle('🎉 Giveaway terminé !')
    .setDescription(`**${giveaway.prize}**`);

  if (participants.length === 0) {
    endEmbed.addFields({ name: 'Résultat', value: 'Aucun participant... Personne n\'a gagné ! 😢' });
    await gwMsg.edit({ embeds: [endEmbed], components: [] });
  } else {
    // Pick winners
    const winners = [];
    const pool = [...participants];
    const count = Math.min(giveaway.winnerCount, pool.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(idx, 1)[0]);
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    endEmbed.addFields(
      { name: 'Gagnant(s)', value: winnerMentions },
      { name: 'Participants', value: `${participants.length} participant${participants.length > 1 ? 's' : ''}` }
    );

    await gwMsg.edit({ embeds: [endEmbed], components: [] });
    await channel.send(`🎊 **Félicitations** ${winnerMentions} ! Vous avez gagné **${giveaway.prize}** !`);
  }

  // Save
  const data = db.getData('giveaways');
  if (data[messageId]) {
    data[messageId].ended = true;
    db.saveData('giveaways', data);
  }
  activeGiveaways.delete(messageId);
}

async function rerollGiveaway(messageId, client, msg) {
  const data = getGiveawayData();
  const giveaway = data[messageId];
  if (!giveaway) {
    return msg.reply({ content: '❌ Giveaway introuvable.', ephemeral: true });
  }

  const participants = [...new Set(giveaway.participants)];
  if (participants.length === 0) {
    return msg.reply({ content: '❌ Aucun participant pour ce giveaway.', ephemeral: true });
  }

  const channel = client.channels.cache.get(giveaway.channelId);
  if (!channel) {
    return msg.reply({ content: '❌ Canal introuvable.', ephemeral: true });
  }

  const winners = [];
  const pool = [...participants];
  const count = Math.min(giveaway.winnerCount, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }

  const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
  await channel.send(`🎰 **Nouveaux gagnants** pour **${giveaway.prize}** : ${winnerMentions}`);
  await msg.reply({ content: '✅ Nouveau tirage effectué !', ephemeral: true });
}
