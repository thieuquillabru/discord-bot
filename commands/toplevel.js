const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'toplevel' },
  slash: new SlashCommandBuilder()
    .setName('toplevel')
    .setDescription('Affiche le classement des niveaux')
    .addIntegerOption(opt => opt.setName('page').setDescription('Numéro de la page').setMinValue(1)),
  async execute(msg, client) {
    try {
      const { guildId } = msg;
      const page = msg.options.getInteger('page') || 1;
      const perPage = 10;

      const allEntries = db.getTop('economy', guildId, 'xp', 1000);
      if (allEntries.length === 0) {
        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.info)
              .setTitle('🏅 Classement des niveaux')
              .setDescription('Personne n\'a encore d\'XP sur ce serveur !')
              .setTimestamp(),
          ],
        });
      }

      const totalPages = Math.max(1, Math.ceil(allEntries.length / perPage));
      if (page > totalPages) {
        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('❌ Page introuvable')
              .setDescription(`Le classement n\'a que **${totalPages}** page${totalPages > 1 ? 's' : ''}.`)
              .setTimestamp(),
          ],
        });
      }

      const start = (page - 1) * perPage;
      const pageEntries = allEntries.slice(start, start + perPage);

      const medals = ['🥇', '🥈', '🥉'];
      let description = '';

      for (let i = 0; i < pageEntries.length; i++) {
        const entry = pageEntries[i];
        const rank = start + i + 1;
        const level = db.getLevel(entry.value);
        const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
        try {
          const member = await msg.guild.members.fetch(entry.userId);
          description += `${medal} <@${entry.userId}> — **Niveau ${level}** (${entry.value.toLocaleString('fr-FR')} XP)\n`;
        } catch {
          description += `**${rank}.** Utilisateur inconnu — **Niveau ${level}** (${entry.value.toLocaleString('fr-FR')} XP)\n`;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle('🏅 Classement des niveaux')
        .setDescription(description)
        .setFooter({ text: `Page ${page}/${totalPages} • ${allEntries.length} joueur${allEntries.length > 1 ? 's' : ''}` })
        .setTimestamp();

      const row = new ActionRowBuilder();
      if (page > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`toplevel_prev_${page}`)
            .setLabel('◀ Précédent')
            .setStyle(ButtonStyle.Primary),
        );
      }
      if (page < totalPages) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`toplevel_next_${page}`)
            .setLabel('Suivant ▶')
            .setStyle(ButtonStyle.Primary),
        );
      }

      const components = row.components.length > 0 ? [row] : [];
      return msg.reply({ embeds: [embed], components });
    } catch (err) {
      console.error('Toplevel error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage du classement.')
            .setTimestamp(),
        ],
      });
    }
  },
};
