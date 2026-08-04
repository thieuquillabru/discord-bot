const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

const ROWS = 6;
const COLS = 7;

const games = new Map();

function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(' '));
}

function displayBoard(board) {
  const header = '1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣';
  const lines = board.map(row => '⬛' + row.map(cell => cell === 'R' ? '🔴' : cell === 'Y' ? '🟡' : '⚪').join('') + '⬛');
  return '```\n' + header + '\n' + lines.join('\n') + '\n```';
}

function checkWin(board, symbol) {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === symbol && board[r][c+1] === symbol && board[r][c+2] === symbol && board[r][c+3] === symbol) return true;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (board[r][c] === symbol && board[r+1][c] === symbol && board[r+2][c] === symbol && board[r+3][c] === symbol) return true;
    }
  }
  // Diagonal ↘
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === symbol && board[r+1][c+1] === symbol && board[r+2][c+2] === symbol && board[r+3][c+3] === symbol) return true;
    }
  }
  // Diagonal ↗
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === symbol && board[r-1][c+1] === symbol && board[r-2][c+2] === symbol && board[r-3][c+3] === symbol) return true;
    }
  }
  return false;
}

function checkDraw(board) {
  return board[0].every(cell => cell !== ' ');
}

function buildColumnRow(game) {
  const row = new ActionRowBuilder();
  for (let c = 0; c < COLS; c++) {
    const full = game.board[0][c] !== ' ';
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`c4_${game.messageId}_${c}`)
        .setLabel(`${c + 1}`)
        .setStyle(full ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(full || game.ended)
    );
  }
  return row;
}

module.exports = {
  data: { name: 'connect4' },
  slash: new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('Joue au Puissance 4 contre un autre utilisateur')
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

      const board = createBoard();
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔴 Puissance 4')
        .setDescription(`**${msg.user.username}** (🔴) vs **${opponent.username}** (🟡)\n\n${displayBoard(board)}\nC'est au tour de ${msg.user.username}`)
        .setFooter({ text: 'Tu as 120 secondes pour jouer !' });

      const game = {
        board,
        player1: msg.user.id,
        player2: opponent.id,
        current: msg.user.id,
        messageId: null,
        channelId: msg.channel.id,
        ended: false,
      };

      const colRow = buildColumnRow(game);
      const reply = await msg.reply({ embeds: [embed], components: [colRow] });
      game.messageId = reply.id;
      games.set(reply.id, game);

      setTimeout(async () => {
        const g = games.get(reply.id);
        if (!g || g.ended) return;
        g.ended = true;
        games.delete(reply.id);
        try {
          await reply.edit({
            embeds: [embed.setDescription(`**${msg.user.username}** (🔴) vs **${opponent.username}** (🟡)\n\n${displayBoard(g.board)}\n⏰ Temps écoulé — Partie annulée`).setColor(0xF39C12)],
            components: [],
          });
        } catch {}
      }, 120000);
    } catch (err) {
      console.error('Erreur connect4:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },

  games,
  createBoard,
  displayBoard,
  checkWin,
  checkDraw,
  buildColumnRow,
};
