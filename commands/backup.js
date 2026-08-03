const { EmbedBuilder, SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'data');
const BACKUP_FILE = path.join(BACKUP_DIR, 'backups.json');

function readBackups() {
  if (!fs.existsSync(BACKUP_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeBackups(data) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: { name: 'backup' },
  description: 'Gère les sauvegardes du serveur',
  slash: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Gère les sauvegardes du serveur')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Crée une sauvegarde des infos du serveur'))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Affiche les sauvegardes existantes'))
    .addSubcommand(sub => sub
      .setName('restore')
      .setDescription('Affiche le contenu d\'une sauvegarde (lecture seule)')
      .addStringOption(o => o.setName('id').setDescription('ID de la sauvegarde').setRequired(true))),
  async execute(msg) {
    try {
      if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Permission refusée')
          .setDescription('Tu as besoin de la permission **Administrateur** pour utiliser cette commande.')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      const subcommand = msg.options.getSubcommand();
      const guildId = msg.guild.id;
      const backups = readBackups();

      if (!backups[guildId]) backups[guildId] = [];

      if (subcommand === 'create') {
        await msg.deferReply();

        const roles = msg.guild.roles.cache
          .sort((a, b) => b.position - a.position)
          .map(r => ({ id: r.id, name: r.name, color: r.color, memberCount: r.members.size }))
          .filter(r => r.name !== '@everyone');

        const channels = msg.guild.channels.cache
          .map(c => ({ id: c.id, name: c.name, type: ChannelType[c.type] || 'Inconnu' }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const backupData = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          date: new Date().toISOString(),
          guild: {
            name: msg.guild.name,
            id: guildId,
            memberCount: msg.guild.memberCount,
            icon: msg.guild.iconURL(),
          },
          roles,
          channels,
        };

        backups[guildId].push(backupData);
        writeBackups(backups);

        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('✅ Sauvegarde créée')
          .setDescription('La sauvegarde du serveur a été enregistrée.')
          .addFields(
            { name: 'ID', value: '`' + backupData.id + '`', inline: true },
            { name: 'Membres', value: '' + msg.guild.memberCount, inline: true },
            { name: 'Rôles', value: '' + roles.length, inline: true },
            { name: 'Salons', value: '' + channels.length, inline: true },
          )
          .setFooter({ text: msg.user.username })
          .setTimestamp();

        await msg.editReply({ embeds: [embed] });

      } else if (subcommand === 'list') {
        const guildBackups = backups[guildId] || [];

        if (guildBackups.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('📋 Sauvegardes')
            .setDescription('Aucune sauvegarde trouvée pour ce serveur.')
            .setFooter({ text: msg.user.username });
          return msg.reply({ embeds: [embed] });
        }

        const list = guildBackups.map((b, i) => {
          const date = new Date(b.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          return '**' + (i + 1) + '.** `' + b.id + '` — ' + date + ' — ' + (b.guild ? b.guild.memberCount + ' membres' : '?');
        });

        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('📋 Sauvegardes du serveur')
          .setDescription(list.join('\n'))
          .setFooter({ text: msg.user.username })
          .setTimestamp();

        await msg.reply({ embeds: [embed] });

      } else if (subcommand === 'restore') {
        const id = msg.options.getString('id');
        const guildBackups = backups[guildId] || [];
        const backup = guildBackups.find(b => b.id === id);

        if (!backup) {
          const errEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('❌ Sauvegarde introuvable')
            .setDescription('Aucune sauvegarde avec l\'ID `' + id + '` n\'a été trouvée.')
            .setFooter({ text: msg.user.username });
          return msg.reply({ embeds: [errEmbed], ephemeral: true });
        }

        const date = new Date(backup.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        const rolesList = (backup.roles || []).slice(0, 15).map(r => '- **' + r.name + '** (`' + r.id + '`) — ' + r.memberCount + ' membres').join('\n');
        const channelsList = (backup.channels || []).slice(0, 15).map(c => '- **' + c.name + '** (`' + c.id + '`) — ' + c.type).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('🔍 Aperçu de la sauvegarde `' + backup.id + '`')
          .setDescription('⚠️ **Mode lecture seule** — La restauration automatique est désactivée pour des raisons de sécurité.')
          .addFields(
            { name: 'Serveur', value: (backup.guild ? backup.guild.name : 'Inconnu') + ' (' + (backup.guild ? backup.guild.memberCount : '?') + ' membres)', inline: false },
            { name: 'Date', value: date, inline: true },
          )
          .setFooter({ text: msg.user.username })
          .setTimestamp();

        if (rolesList) {
          embed.addFields({ name: 'Rôles (' + Math.min((backup.roles || []).length, 15) + '/' + (backup.roles || []).length + ')', value: rolesList, inline: false });
        }
        if (channelsList) {
          embed.addFields({ name: 'Salons (' + Math.min((backup.channels || []).length, 15) + '/' + (backup.channels || []).length + ')', value: channelsList, inline: false });
        }

        await msg.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Erreur backup:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la gestion de la sauvegarde.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) {
        await msg.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await msg.editReply({ embeds: [errorEmbed] });
      }
    }
  },
};
