const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');

const games = new Map();

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWin(board, symbol) {
  return WIN_COMBOS.some(combo => combo.every(i => board[i] === symbol));
}

function checkDraw(board) {
  return board.every(cell => cell !== ' ');
}

function buildRows(game) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const val = game.board[idx];
      let label, style, disabled;
      if (val === '❌') {
        label = '❌';
        style = ButtonStyle.Primary;
        disabled = true;
      } else if (val === '⭕') {
        label = '⭕';
        style = ButtonStyle.Success;
        disabled = true;
      } else {
        label = ' ';
        style = ButtonStyle.Secondary;
        disabled = game.ended;
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_${game.messageId}_${idx}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );
    }
    rows.push(row);
  }
  return rows;
}

module.exports = {
  data: { name: 'tictactoe' },
  slash: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Joue au morpion contre un autre utilisateur')
    .addUserOption(o => o.setName('user').setDescription('Adversaire').setRequired(true)),
  async execute(msg, client) {
    try {
      const opponent = msg.options.getUser('user');
      if (opponent.id === msg.user.id) {
        return msg.reply({ content: '❌ Tu ne peux pas jouer contre toi-même !', ephemeral: true });
      }
      if (opponent.bot) {
        return msg.reply({ content: '❌ Tu ne peux pas jouer contre un bot !', ephemeral: true });
      }

      const existing = [...games.values()].find(
        g => (g.player1 === msg.user.id || g.player2 === msg.user.id) && !g.ended
      );
      if (existing) {
        return msg.reply({ content: '❌ Tu as déjà une partie en cours !', ephemeral: true });
      }

      const board = Array(9).fill(' ');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎮 Morpion')
        .setDescription(`**${msg.user.username}** (❌) vs **${opponent.username}** (⭕)\n\nC'est au tour de ${msg.user.username}`)
        .setFooter({ text: 'Tu as 60 secondes pour jouer !' });

      const rows = buildRows({ board, messageId: '0', ended: false });
      const reply = await msg.reply({ embeds: [embed], components: rows });

      const gameId = reply.id;
      games.set(gameId, {
        board,
        player1: msg.user.id,
        player2: opponent.id,
        current: msg.user.id,
        messageId: reply.id,
        channelId: msg.channel.id,
        ended: false,
      });

      // Timeout
      setTimeout(async () => {
        const game = games.get(gameId);
        if (!game || game.ended) return;
        game.ended = true;
        games.delete(gameId);
        try {
          const disabledRows = buildRows({ ...game, ended: true });
          await reply.edit({
            embeds: [embed.setDescription(`**${msg.user.username}** (❌) vs **${opponent.username}** (⭕)\n\n⏰ Temps écoulé — Partie annulée`).setColor(0xF39C12)],
            components: disabledRows,
          });
        } catch {}
      }, 60000);
    } catch (err) {
      console.error('Erreur tictactoe:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },

  games,
  checkWin,
  checkDraw,
  buildRows,
};
