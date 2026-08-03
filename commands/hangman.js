const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

const WORDS = [
  'chat','chien','maison','voiture','arbre','fleur','soleil','lune','etoile','pomme',
  'banane','orange','fromage','pain','eau','feu','terre','vent','plage','montagne',
  'livre','musique','danse','rire','amour','ami','famille','ecole','travail','ville',
  'pays','route','pont','porte','fenetre','jardin','table','chaise','lit','horloge',
  'ordinateur','telephone','clavier','ecran','souris','papier','stylo','cahier','carte','jeu',
];

const STAGE0 = '```\n  +---+\n    |\n    |\n    |\n    |\n    |\n=========';
const STAGE1 = '```\n  +---+\n  |   |\n    |\n    |\n    |\n    |\n=========';
const STAGE2 = '```\n  +---+\n  |   |\n  O   |\n    |\n    |\n    |\n=========';
const STAGE3 = '```\n  +---+\n  |   |\n  O   |\n  |   |\n    |\n    |\n=========';
const STAGE4 = '```\n  +---+\n  |   |\n  O   |\n /|   |\n    |\n    |\n=========';
const STAGE5 = '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n    |\n    |\n=========';
const STAGE6 = '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n    |\n=========';

const HANGMAN_STAGES = [STAGE0, STAGE1, STAGE2, STAGE3, STAGE4, STAGE5, STAGE6];

const activeGames = new Map();

function buildLetterRows(game) {
  const rows = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 9; j++) {
      const idx = i * 9 + j;
      if (idx >= 26) break;
      const letter = letters[idx];
      const used = game.guessed.includes(letter);
      const correct = game.word.includes(letter.toLowerCase());
      let style = ButtonStyle.Secondary;
      if (used && correct) style = ButtonStyle.Success;
      if (used && !correct) style = ButtonStyle.Danger;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('hm_' + (game.messageId || 'x') + '_' + letter)
          .setLabel(letter)
          .setStyle(style)
          .setDisabled(used || game.ended)
      );
    }
    rows.push(row);
  }
  return rows;
}

function getDisplayWord(game) {
  return game.word.split('').map(l => game.guessed.includes(l.toUpperCase()) ? l.toUpperCase() : '\u2588').join(' ');
}

module.exports = {
  data: { name: 'hangman' },
  slash: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Joue au pendu - Devine le mot !'),
  async execute(msg, client) {
    try {
      if (activeGames.has(msg.user.id)) return msg.reply({ content: 'Tu as deja une partie en cours !', ephemeral: true });
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      const game = { word, guessed: [], wrongs: 0, maxWrongs: 6, userId: msg.user.id, channelId: msg.channel.id, messageId: null, ended: false };
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Le Pendu')
        .setDescription('**Mot :** ' + getDisplayWord(game) + '\n\n' + HANGMAN_STAGES[0] + '\n\nErreurs : 0/' + game.maxWrongs)
        .setFooter({ text: 'Partie de ' + msg.user.username });
      const rows = buildLetterRows(game);
      const reply = await msg.reply({ embeds: [embed], components: rows });
      game.messageId = reply.id;
      activeGames.set(msg.user.id, game);
      setTimeout(async () => {
        const g = activeGames.get(msg.user.id);
        if (!g || g.ended) return;
        g.ended = true; activeGames.delete(msg.user.id);
        try {
          const dr = buildLetterRows(Object.assign({}, g, { ended: true }));
          await reply.edit({ embeds: [new EmbedBuilder().setColor(0xF39C12).setTitle('Le Pendu').setDescription('**Mot :** ' + g.word.split('').map(l => l.toUpperCase()).join(' ') + '\n\n' + HANGMAN_STAGES[g.wrongs] + '\n\nTemps ecoule ! Le mot etait **' + g.word.toUpperCase() + '**').setFooter({ text: 'Perdu !' })], components: dr });
        } catch {}
      }, 90000);
    } catch (err) {
      console.error('Erreur hangman:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: 'Une erreur est survenue.', ephemeral: true });
    }
  },
  activeGames, HANGMAN_STAGES, buildLetterRows, getDisplayWord,
};
