const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  data: { name: 'topmoney' },
  slash: new SlashCommandBuilder()
    .setName('topmoney')
    .setDescription('Affiche le classement des plus riches')
    .addIntegerOption(opt => opt.setName('page').setDescription('Numéro de la page').setMinValue(1)),
  async execute(interaction, client) {
    try {
      const { guildId } = interaction;
      const page = interaction.options.getInteger('page') || 1;
      const perPage = 10;

      const allEntries = db.getTop('economy', guildId, 'money', 1000);
      if (allEntries.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.info)
              .setTitle('🏆 Classement des plus riches')
              .setDescription('Personne n\'a encore d\'argent sur ce serveur !')
              .setTimestamp(),
          ],
        });
      }

      const totalPages = Math.max(1, Math.ceil(allEntries.length / perPage));
      if (page > totalPages) {
        return interaction.reply({
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
        const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
        try {
          const member = await interaction.guild.members.fetch(entry.userId);
          description += `${medal} <@${entry.userId}> — **${entry.value.toLocaleString('fr-FR')}** 🪙\n`;
        } catch {
          description += `**${rank}.** Utilisateur inconnu — **${entry.value.toLocaleString('fr-FR')}** 🪙\n`;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle('🏆 Classement des plus riches')
        .setDescription(description)
        .setFooter({ text: `Page ${page}/${totalPages} • ${allEntries.length} joueur${allEntries.length > 1 ? 's' : ''}` })
        .setTimestamp();

      const row = new ActionRowBuilder();
      if (page > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`topmoney_prev_${page}`)
            .setLabel('◀ Précédent')
            .setStyle(ButtonStyle.Primary),
        );
      }
      if (page < totalPages) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`topmoney_next_${page}`)
            .setLabel('Suivant ▶')
            .setStyle(ButtonStyle.Primary),
        );
      }

      const components = row.components.length > 0 ? [row] : [];
      return interaction.reply({ embeds: [embed], components });
    } catch (err) {
      console.error('Topmoney error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('\u274c Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage du classement.')
            .setTimestamp(),
        ],
      });
    }
  },

  async buildPage(guildId, page, guild) {
    const perPage = 10;
    const allEntries = db.getTop('economy', guildId, 'money', 1000);
    const totalPages = Math.max(1, Math.ceil(allEntries.length / perPage));
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * perPage;
    const pageEntries = allEntries.slice(start, start + perPage);
    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    let description = '';

    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i];
      const rank = start + i + 1;
      const medal = rank <= 3 ? medals[rank - 1] : '**' + rank + '.**';
      try {
        const member = await guild.members.fetch(entry.userId);
        description += medal + ' <@' + entry.userId + '> \u2014 **' + entry.value.toLocaleString('fr-FR') + '** \uD83E\uDE99\n';
      } catch {
        description += '**' + rank + '.** Utilisateur inconnu \u2014 **' + entry.value.toLocaleString('fr-FR') + '** \uD83E\uDE99\n';
      }
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.embed)
      .setTitle('\uD83C\uDFC6 Classement des plus riches')
      .setDescription(description)
      .setFooter({ text: 'Page ' + p + '/' + totalPages + ' \u2022 ' + allEntries.length + ' joueur' + (allEntries.length > 1 ? 's' : '') })
      .setTimestamp();

    const row = new ActionRowBuilder();
    if (p > 1) row.addComponents(new ButtonBuilder().setCustomId('topmoney_prev_' + p).setLabel('\u25C0 Pr\u00e9c\u00e9dent').setStyle(ButtonStyle.Primary));
    if (p < totalPages) row.addComponents(new ButtonBuilder().setCustomId('topmoney_next_' + p).setLabel('Suivant \u25B6').setStyle(ButtonStyle.Primary));

    return { embed, row };
  },
};
