const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');
const { isFeatureEnabled, getFeatureForCommand, FEATURE_DEFINITIONS } = require('../features');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // ── Slash Command Handler ───────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Vérifier si la feature est activée
      const featureKey = getFeatureForCommand(interaction.commandName);
      if (featureKey && !isFeatureEnabled(featureKey)) {
        const def = FEATURE_DEFINITIONS[featureKey];
        return interaction.reply({
          content: `❌ La fonctionnalité **${def.label}** est actuellement **désactivée**.`,
          ephemeral: true,
        });
      }

      const args = [];
      // Convert interaction to message-like object
      const fakeMessage = {
        _interaction: interaction,
        author: interaction.user,
        member: interaction.member,
        guild: interaction.guild,
        channel: interaction.channel,
        client: interaction.client,
        createdTimestamp: interaction.createdTimestamp,
        mentions: {
          users: {
            first: () => interaction.options.getUser('membre'),
          },
          members: {
            first: () => {
              const user = interaction.options.getUser('membre');
              return user ? interaction.guild.members.cache.get(user.id) || null : null;
            },
          },
          channels: {
            first: () => interaction.options.getChannel('valeur'),
          },
          roles: {
            first: () => {
              const mentionable = interaction.options.getMentionable('valeur');
              return mentionable && mentionable.role ? mentionable.role : null;
            },
          },
        },
        reply: async (options) => {
          if (typeof options === 'string') options = { content: options };
          if (interaction.replied || interaction.deferred) return interaction.followUp({ ...options, ephemeral: options.ephemeral || false });
          return interaction.reply({ ...options, ephemeral: options.ephemeral || false });
        },
        edit: async (options) => {
          if (typeof options === 'string') options = { content: options };
          return interaction.editReply(options);
        },
        delete: async () => {},
      };
      try {
        await command.execute(fakeMessage, args, client);
      } catch (err) {
        console.error('Slash cmd error:', err);
        const reply = { content: 'Une erreur est survenue.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
        else await interaction.reply(reply);
      }
      return;
    }

    if (!interaction.isButton()) return;

    const { customId, user, guild } = interaction;

    // Vérifier features pour les boutons
    if (customId === 'create_ticket' && !isFeatureEnabled('tickets')) {
      return interaction.reply({ content: '❌ Le système de tickets est **désactivé**.', ephemeral: true });
    }
    if (customId.startsWith('rps_') && !isFeatureEnabled('fun')) {
      return interaction.reply({ content: '❌ Les commandes fun sont **désactivées**.', ephemeral: true });
    }

    // ── Bouton : Créer un ticket ────────────────────────────────────
    if (customId === 'create_ticket') {
      const existingChannel = guild.channels.cache.find(
        ch => ch.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      );

      if (existingChannel) {
        return interaction.reply({
          content: `❌ Tu as déjà un ticket ouvert : ${existingChannel}`,
          ephemeral: true,
        });
      }

      const category = config.tickets.categoryId
        ? guild.channels.cache.get(config.tickets.categoryId)
        : null;

      const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      try {
        await interaction.deferReply({ ephemeral: true });

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category || undefined,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
              id: user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            ...(config.modRoleId ? [{
              id: config.modRoleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
            }] : []),
          ],
        });

        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🎫 Ticket créé')
          .setDescription(`Bonjour ${user}, merci d'avoir ouvert un ticket.\nDécris ton problème et un membre du staff te répondra.`)
          .setFooter({ text: 'Ce canal sera supprimé à la fermeture du ticket.' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Fermer le ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: `${user} ${config.modRoleId ? `<@&${config.modRoleId}>` : ''}`,
          embeds: [embed],
          components: [row],
        });

        await interaction.editReply(`✅ Ton ticket a été créé : ${ticketChannel}`);
      } catch (error) {
        console.error('Erreur création ticket (button) :', error);
        await interaction.editReply('❌ Erreur lors de la création du ticket.');
      }
      return;
    }

    // ── Bouton : Fermer un ticket ───────────────────────────────────
    if (customId === 'close_ticket') {
      const channel = interaction.channel;

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🔒 Fermeture du ticket')
        .setDescription('Ce ticket sera fermé dans 5 secondes...');

      await interaction.reply({ embeds: [embed] });

      setTimeout(async () => {
        try {
          await channel.delete('Ticket fermé via bouton');
        } catch (e) {
          console.error('Erreur fermeture ticket (button) :', e);
        }
      }, 5000);
      return;
    }

    // ── Boutons : Pierre-Papier-Ciseaux ────────────────────────────
    if (customId.startsWith('rps_')) {
      const rpsCmd = require('../commands/rps');
      const { CHOICES, activeGames } = rpsCmd;

      // Vérifier que c'est bien le joueur
      const game = activeGames.get(user.id);
      if (!game) {
        return interaction.reply({ content: '❌ Tu n\'as pas de partie en cours.', ephemeral: true });
      }

      // Mapper le customId vers le choix
      const choiceMap = { rps_rock: 0, rps_paper: 1, rps_scissors: 2 };
      const playerChoiceIndex = choiceMap[customId];
      if (playerChoiceIndex === undefined) return;

      const playerChoice = CHOICES[playerChoiceIndex];
      const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

      let result;
      let resultColor;
      if (playerChoice.name === botChoice.name) {
        result = 'Égalité ! 🤝';
        resultColor = 0xF39C12;
      } else if (playerChoice.beats === botChoice.name) {
        result = 'Tu as gagné ! 🎉';
        resultColor = 0x2ECC71;
      } else {
        result = 'Tu as perdu ! 😢';
        resultColor = 0xE74C3C;
      }

      const embed = new EmbedBuilder()
        .setColor(resultColor)
        .setTitle('🎮 Pierre-Papier-Ciseaux — Résultat')
        .addFields(
          { name: `${user.username}`, value: `${playerChoice.emoji} ${playerChoice.name}`, inline: true },
          { name: 'Bot', value: `${botChoice.emoji} ${botChoice.name}`, inline: true },
          { name: 'Résultat', value: result, inline: false },
        );

      // Désactiver les boutons
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Pierre').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Papier').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Ciseaux').setStyle(ButtonStyle.Danger).setDisabled(true),
      );

      // Supprimer la partie active
      activeGames.delete(user.id);

      await interaction.update({ embeds: [embed], components: [disabledRow] });
      return;
    }
  },
};
