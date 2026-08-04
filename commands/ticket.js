const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, SlashCommandBuilder } = require('discord.js');
const config = require('../config');

// Stockage des tickets en mémoire (pourrait être remplacé par une BDD)
const activeTickets = new Map();

module.exports = {
  data: { name: 'ticket' },
  description: 'Gère les tickets de support',
  usage: '<create|close|add|remove>',
  cooldown: 10,
  slash: new SlashCommandBuilder().setName('ticket').setDescription('Gere les tickets de support').addStringOption(o => o.setName('action').setDescription('create | close | add | setup').setRequired(true)).addUserOption(o => o.setName('membre').setDescription('Membre a ajouter (pour add)')),
  async execute(message, args, client) {
    const isSlash = !!message._interaction;
    const interaction = message._interaction;
    const subcommand = isSlash ? interaction.options.getString('action') : args[0]?.toLowerCase();

    switch (subcommand) {
      case 'setup':
        return handleSetup(message);
      case 'create':
      case 'open':
        return handleCreate(message, client);
      case 'close':
        return handleClose(message, client);
      case 'add':
        if (isSlash) {
          const targetMember = interaction.options.getUser('membre');
          if (targetMember) {
            return handleAddWithMember(message, targetMember);
          }
          return message.reply('❌ Mentionne un membre à ajouter au ticket.');
        }
        return handleAdd(message, args);
      default:
        return message.reply({
          content: '❌ Sous-commande invalide. Utilise `!ticket <create|close|add|setup>`',
        });
    }
  },
};

// ── Setup : envoyer le panneau de ticket ─────────────────────────────
async function handleSetup(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('❌ Tu n\'as pas la permission de configurer les tickets.');
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Support — Ouvrir un ticket')
    .setDescription('Besoin d\'aide ? Clique sur le bouton ci-dessous pour ouvrir un ticket de support.\nUn canal privé sera créé pour discuter avec l\'équipe.')
    .setFooter({ text: 'Un membre du staff répondra dès que possible.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Ouvrir un ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary)
  );

  await message.channel.send({ embeds: [embed], components: [row] });
  await message.delete().catch(() => {});
}

// ── Créer un ticket ──────────────────────────────────────────────────
async function handleCreate(message, client) {
  // Vérifier si l'utilisateur a déjà un ticket ouvert
  const existingTicket = activeTickets.get(`${message.guild.id}-${message.author.id}`);
  if (existingTicket) {
    const channel = message.guild.channels.cache.get(existingTicket);
    if (channel) {
      return message.reply(`❌ Tu as déjà un ticket ouvert : ${channel}`);
    }
    activeTickets.delete(`${message.guild.id}-${message.author.id}`);
  }

  const guild = message.guild;
  const category = config.tickets.categoryId
    ? guild.channels.cache.get(config.tickets.categoryId)
    : null;

  const channelName = `ticket-${message.author.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category || undefined,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: message.author.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        // Donner l'accès aux modérateurs
        ...(config.modRoleId ? [{
          id: config.modRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        }] : []),
      ],
    });

    activeTickets.set(`${guild.id}-${message.author.id}`, ticketChannel.id);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('🎫 Ticket créé')
      .setDescription(`Bonjour ${message.author}, merci d\'avoir ouvert un ticket.\nDécris ton problème et un membre du staff te répondra.`)
      .setFooter({ text: 'Utilise !ticket close pour fermer ce ticket.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `${message.author} | <@&${config.modRoleId || ''}>`, embeds: [embed], components: [row] });
    await message.reply(`✅ Ton ticket a été créé : ${ticketChannel}`);
  } catch (error) {
    console.error('Erreur création ticket :', error);
    message.reply('❌ Erreur lors de la création du ticket. Vérifie les permissions du bot.');
  }
}

// ── Fermer un ticket ─────────────────────────────────────────────────
async function handleClose(message, client) {
  const channel = message.channel;

  // Vérifier si on est dans un canal ticket
  const isTicket = [...activeTickets.values()].includes(channel.id);
  if (!isTicket && !channel.name.startsWith('ticket-')) {
    return message.reply('❌ Tu n\'es pas dans un canal ticket.');
  }

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🔒 Fermeture du ticket')
    .setDescription('Ce ticket sera fermé dans 5 secondes...');

  await channel.send({ embeds: [embed] });

  // Supprimer de la map
  for (const [key, val] of activeTickets.entries()) {
    if (val === channel.id) {
      activeTickets.delete(key);
      break;
    }
  }

  setTimeout(async () => {
    try {
      await channel.delete('Ticket fermé');
    } catch (e) {
      console.error('Erreur fermeture ticket :', e);
    }
  }, 5000);
}

// ── Ajouter un membre au ticket ─────────────────────────────────────
async function handleAdd(message, args) {
  const target = message.mentions.members.first();
  if (!target) {
    return message.reply('❌ Mentionne un membre à ajouter au ticket.\nUtilisation : `!ticket add <@membre>`');
  }

  return handleAddWithMember(message, target);
}

async function handleAddWithMember(message, targetMember) {
  const target = typeof targetMember === 'object' && targetMember.guild
    ? targetMember
    : message.guild.members.cache.get(targetMember.id);
  if (!target) {
    return message.reply('❌ Impossible de trouver ce membre.');
  }

  try {
    await message.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
    });
    await message.reply(`✅ ${target} a été ajouté au ticket.`);
  } catch (error) {
    console.error('Erreur ajout ticket :', error);
    message.reply('❌ Impossible d\'ajouter ce membre au ticket.');
  }
}
