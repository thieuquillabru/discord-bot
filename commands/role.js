const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'role' },
  description: 'Gère les rôles en masse (admin uniquement)',
  permissions: [PermissionFlagsBits.ManageRoles],
  slash: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Gère les rôles en masse')
    .addSubcommand(sub => sub
      .setName('all')
      .setDescription('Ajoute/retire un rôle à TOUS les membres')
      .addRoleOption(o => o.setName('role').setDescription('Le rôle à ajouter ou retirer').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action à effectuer').setRequired(true).addChoices(
        { name: 'Ajouter', value: 'add' },
        { name: 'Retirer', value: 'remove' },
      )))
    .addSubcommand(sub => sub
      .setName('for')
      .setDescription('Ajoute/retire un rôle aux membres ayant un autre rôle')
      .addRoleOption(o => o.setName('role').setDescription('Le rôle à ajouter ou retirer').setRequired(true))
      .addRoleOption(o => o.setName('role_cible').setDescription('Le rôle filtre (membres qui l\'ont)').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action à effectuer').setRequired(true).addChoices(
        { name: 'Ajouter', value: 'add' },
        { name: 'Retirer', value: 'remove' },
      ))),
  async execute(msg) {
    try {
      if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Permission refusée')
          .setDescription('Tu as besoin de la permission **Gérer les rôles** pour utiliser cette commande.')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      await msg.deferReply();

      const subcommand = msg.options.getSubcommand();
      const role = msg.options.getRole('role');
      const action = msg.options.getString('action');

      // Vérifier que le rôle du bot est au-dessus du rôle cible
      const botMember = await msg.guild.members.fetchMe();
      if (role.position >= botMember.roles.highest.position) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Hiérarchie insuffisante')
          .setDescription('Le rôle du bot doit être supérieur au rôle `' + role.name + '`.')
          .setFooter({ text: msg.user.username });
        return msg.editReply({ embeds: [errEmbed] });
      }

      let members;

      if (subcommand === 'all') {
        members = await msg.guild.members.fetch();
      } else {
        const targetRole = msg.options.getRole('role_cible');
        members = msg.guild.members.cache.filter(m => m.roles.cache.has(targetRole.id));
        // Fetch any uncached members with that role
        const allMembers = await msg.guild.members.fetch();
        members = allMembers.filter(m => m.roles.cache.has(targetRole.id));
      }

      // Filtrer les bots et le bot lui-même
      const targets = members.filter(m => !m.user.bot);
      let success = 0;
      let failed = 0;

      for (const [, member] of targets) {
        try {
          if (action === 'add') {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              success++;
            }
          } else {
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              success++;
            }
          }
        } catch {
          failed++;
        }
      }

      const actionText = action === 'add' ? 'ajouté' : 'retiré';
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Rôle ' + actionText)
        .setDescription('Le rôle ' + role + ' a été **' + actionText + '** avec succès.')
        .addFields(
          { name: '✅ Réussites', value: '' + success, inline: true },
          { name: '❌ Échecs', value: '' + failed, inline: true },
        )
        .setFooter({ text: msg.user.username })
        .setTimestamp();

      await msg.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur role:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la modification des rôles.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) {
        await msg.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await msg.editReply({ embeds: [errorEmbed] });
      }
    }
  },
};
