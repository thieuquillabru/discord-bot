const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

const SIZE = 5;
const DEFAULT_MINES = 5;
const NUMBER_EMOJI = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

const activeGames = new Map();

function generateMinesweeper(mineCount) {
  const grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
  const mines = new Set();
  while (mines.size < mineCount) {
    mines.add(Math.floor(Math.random() * SIZE * SIZE));
  }
  for (const m of mines) {
    grid[Math.floor(m / SIZE)][m % SIZE] = -1;
  }
  // Calculate numbers
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === -1) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] === -1) count++;
        }
      }
      grid[r][c] = count;
    }
  }
  return { grid, mines };
}

function buildRows(game) {
  const rows = [];
  for (let r = 0; r < SIZE; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < SIZE; c++) {
      const idx = r * SIZE + c;
      const cell = game.revealed[idx];
      let label, style, disabled;
      if (cell === 'mine') {
        label = '💣';
        style = ButtonStyle.Danger;
        disabled = true;
      } else if (cell === 'safe') {
        const num = game.grid[Math.floor(idx / SIZE)][idx % SIZE];
        label = num > 0 ? NUMBER_EMOJI[num] : '⬜';
        style = ButtonStyle.Success;
        disabled = true;
      } else {
        label = '🟦';
        style = ButtonStyle.Primary;
        disabled = game.ended;
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ms_${game.messageId}_${r}_${c}`)
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
  data: { name: 'minesweeper' },
  slash: new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('Joue au démineur 5x5')
    .addIntegerOption(o => o.setName('mines').setDescription('Nombre de mines (1-20, défaut: 5)').setMinValue(1).setMaxValue(20)),
  async execute(msg, client) {
    try {
      if (activeGames.has(msg.user.id)) {
        return msg.reply({ content: '⏳ Tu as déjà une partie de démineur en cours !', ephemeral: true });
      }

      const mineCount = Math.min(20, Math.max(1, msg.options.getInteger('mines') || DEFAULT_MINES));
      const { grid, mines } = generateMinesweeper(mineCount);

      const game = {
        grid,
        mines,
        revealed: Array(SIZE * SIZE).fill('hidden'),
        userId: msg.user.id,
        channelId: msg.channel.id,
        messageId: null,
        ended: false,
        safeCells: SIZE * SIZE - mineCount,
        revealedCount: 0,
      };

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('💣 Démineur 5×5')
        .setDescription(`Trouve toutes les cases sans mines !\n💣 Mines : **${mineCount}** | 🔲 Restantes : **${game.safeCells}**`)
        .setFooter({ text: `Partie de ${msg.user.username} · 60 secondes` });

      const rows = buildRows(game);
      const reply = await msg.reply({ embeds: [embed], components: rows });
      game.messageId = reply.id;
      activeGames.set(msg.user.id, game);

      setTimeout(async () => {
        const g = activeGames.get(msg.user.id);
        if (!g || g.ended) return;
        g.ended = true;
        activeGames.delete(msg.user.id);
        try {
          // Reveal all mines
          for (const m of g.mines) g.revealed[m] = 'mine';
          const disabledRows = buildRows({ ...g, ended: true });
          await reply.edit({
            embeds: [embed.setDescription(`⏰ Temps écoulé ! Partie perdue.\n💣 Mines : **${mineCount}**`).setColor(0xF39C12)],
            components: disabledRows,
          });
        } catch {}
      }, 60000);
    } catch (err) {
      console.error('Erreur minesweeper:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },

  activeGames,
  generateMinesweeper,
  buildRows,
  SIZE,
};
