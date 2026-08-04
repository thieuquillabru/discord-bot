const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const SURVEY_TIMEOUT = 60000; // 60 secondes

module.exports = {
  data: { name: 'survey' },
  description: 'Crée un sondage avec réactions numérotées',
  slash: new SlashCommandBuilder()
    .setName('survey')
    .setDescription('Crée un sondage avec des options numérotées')
    .addStringOption(o => o.setName('question').setDescription('La question du sondage').setRequired(true).setMaxLength(256))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('option3').setDescription('Option 3').setMaxLength(100))
    .addStringOption(o => o.setName('option4').setDescription('Option 4').setMaxLength(100))
    .addStringOption(o => o.setName('option5').setDescription('Option 5').setMaxLength(100))
    .addStringOption(o => o.setName('option6').setDescription('Option 6').setMaxLength(100))
    .addStringOption(o => o.setName('option7').setDescription('Option 7').setMaxLength(100))
    .addStringOption(o => o.setName('option8').setDescription('Option 8').setMaxLength(100))
    .addStringOption(o => o.setName('option9').setDescription('Option 9').setMaxLength(100))
    .addStringOption(o => o.setName('option10').setDescription('Option 10').setMaxLength(100)),
  async execute(msg) {
    try {
      await msg.deferReply();

      const question = msg.options.getString('question');
      const options = [];

      for (let i = 1; i <= 10; i++) {
        const val = msg.options.getString('option' + i);
        if (val) options.push(val);
      }

      if (options.length < 2) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Pas assez d\'options')
          .setDescription('Tu dois fournir au moins 2 options.')
          .setFooter({ text: msg.user.username });
        return msg.editReply({ embeds: [errEmbed] });
      }

      // Vérifier les doublons
      const lowerOptions = options.map(o => o.toLowerCase());
      if (new Set(lowerOptions).size !== options.length) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Doublon détecté')
          .setDescription('Chaque option doit être unique.')
          .setFooter({ text: msg.user.username });
        return msg.editReply({ embeds: [errEmbed] });
      }

      const optionLines = options.map((o, i) => NUMBER_EMOJIS[i] + ' ' + o).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📊 ' + question)
        .setDescription(optionLines + '\n\n⏱️ **Fin du sondage dans 60 secondes**')
        .setAuthor({ name: msg.user.tag, iconURL: msg.user.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Réagis avec un chiffre pour voter' })
        .setTimestamp();

      const surveyMessage = await msg.channel.send({ embeds: [embed] });

      // Ajouter les réactions
      for (let i = 0; i < options.length; i++) {
        await surveyMessage.react(NUMBER_EMOJIS[i]);
      }

      const confirm = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Sondage créé')
        .setDescription('Le sondage a été publié et durera **60 secondes**.')
        .setFooter({ text: msg.user.username });
      await msg.editReply({ embeds: [confirm] });

      // Attendre la fin du sondage
      setTimeout(async () => {
        try {
          const fetched = await msg.channel.messages.fetch(surveyMessage.id);
          if (!fetched) return;

          // Compter les votes
          const votes = {};
          for (let i = 0; i < options.length; i++) {
            const reaction = fetched.reactions.cache.get(NUMBER_EMOJIS[i]);
            // -1 pour exclure la réaction du bot
            votes[i] = reaction ? reaction.count - 1 : 0;
          }

          // Trier par votes décroissants
          const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
          const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

          const resultsLines = sorted.map(([idx, count]) => {
            const bar = '█'.repeat(Math.max(1, Math.round(count / (totalVotes || 1) * 10)));
            const percentage = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0;
            return NUMBER_EMOJIS[parseInt(idx)] + ' **' + options[parseInt(idx)] + '** — ' + count + ' vote(s) (' + percentage + '%)\n' + bar;
          });

          const winnerIdx = parseInt(sorted[0][0]);
          const winnerEmoji = NUMBER_EMOJIS[winnerIdx];

          const resultsEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📊 ' + question)
            .setDescription(resultsLines.join('\n\n'))
            .addFields(
              { name: 'Votes totaux', value: '' + totalVotes, inline: true },
              { name: 'Gagnant', value: winnerEmoji + ' ' + options[winnerIdx], inline: true },
            )
            .setAuthor({ name: msg.user.tag, iconURL: msg.user.displayAvatarURL({ dynamic: true }) })
            .setFooter({ text: 'Sondage terminé' })
            .setTimestamp();

          await fetched.edit({ embeds: [resultsEmbed] });
        } catch (e) {
          console.error('Erreur lors de la clôture du sondage:', e);
        }
      }, SURVEY_TIMEOUT);
    } catch (err) {
      console.error('Erreur survey:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la création du sondage.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) {
        await msg.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await msg.editReply({ embeds: [errorEmbed] });
      }
    }
  },
};
