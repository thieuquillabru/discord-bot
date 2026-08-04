const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: { name: 'setup' },
  description: 'Configure les paramètres du bot (canal de bienvenue, catégorie tickets, rôle mod)',
  usage: '<welcome|tickets|modrole> <valeur>',
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 10,
  slash: new SlashCommandBuilder().setName('setup').setDescription('Configure les parametres du bot').addStringOption(o => o.setName('option').setDescription('welcome | tickets | modrole').setRequired(true)).addStringOption(o => o.setName('valeur').setDescription('La valeur a definir')),
  async execute(message, args) {
    const isSlash = !!message._interaction;
    const interaction = message._interaction;
    const sub = isSlash ? interaction.options.getString('option') : args[0]?.toLowerCase();

    if (sub === 'welcome') {
      const channel = isSlash
        ? interaction.options.getChannel('valeur')
        : message.mentions.channels.first();
      if (!channel) {
        return message.reply("❌ Mentionne le canal de bienvenue.\nUtilisation : `!setup welcome <#canal>`");
      }
      updateEnv('WELCOME_CHANNEL_ID', channel.id);
      const config = require('../config');
      config.welcome.channelId = channel.id;
      return message.reply(`✅ Canal de bienvenue configuré : ${channel}`);
    }

    if (sub === 'tickets') {
      const channel = isSlash
        ? interaction.options.getChannel('valeur')
        : message.mentions.channels.first();
      if (!channel) {
        return message.reply("❌ Mentionne la catégorie pour les tickets.\nUtilisation : `!setup tickets <#catégorie>`");
      }
      updateEnv('TICKET_CATEGORY_ID', channel.id);
      const config = require('../config');
      config.tickets.categoryId = channel.id;
      return message.reply(`✅ Catégorie des tickets configurée : ${channel}`);
    }

    if (sub === 'modrole') {
      let role;
      if (isSlash) {
        const mentionable = interaction.options.getMentionable('valeur');
        if (mentionable && mentionable.role) {
          role = mentionable;
        } else if (mentionable && mentionable.user) {
          return message.reply('❌ Tu dois sélectionner un rôle, pas un utilisateur.');
        } else {
          role = null;
        }
      } else {
        role = message.mentions.roles.first();
      }
      if (!role) {
        return message.reply("❌ Mentionne le rôle de modérateur.\nUtilisation : `!setup modrole <@rôle>`");
      }
      updateEnv('MOD_ROLE_ID', role.id);
      const config = require('../config');
      config.modRoleId = role.id;
      return message.reply(`✅ Rôle modérateur configuré : ${role}`);
    }

    // Afficher la config actuelle
    const config = require('../config');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Configuration actuelle')
      .addFields(
        {
          name: '🏠 Canal de bienvenue',
          value: config.welcome.channelId
            ? `<#${config.welcome.channelId}>`
            : '❌ Non configuré',
          inline: false,
        },
        {
          name: '🎫 Catégorie tickets',
          value: config.tickets.categoryId
            ? `<#${config.tickets.categoryId}>`
            : '❌ Non configuré',
          inline: false,
        },
        {
          name: '🛡️ Rôle modérateur',
          value: config.modRoleId
            ? `<@&${config.modRoleId}>`
            : '❌ Non configuré',
          inline: false,
        },
        {
          name: '💬 Préfixe',
          value: config.prefix,
          inline: true,
        },
      );

    await message.reply({ embeds: [embed] });
  },
};

// ── Helper : mettre à jour le fichier .env ───────────────────────────
function updateEnv(key, value) {
  const envPath = path.join(__dirname, '..', '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, content, 'utf-8');
}