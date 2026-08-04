const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../config');
const db = require('../database');

const LEVEL_REWARDS = [
  { level: 5, coins: 500 },
  { level: 10, coins: 1000 },
  { level: 15, coins: 2000 },
  { level: 20, coins: 5000 },
  { level: 25, coins: 10000 },
  { level: 30, coins: 25000 },
];

function getClaimedRewards(guildId, userId) {
  const data = db.getUser('rewards', guildId, userId);
  return data.claimed || [];
}

function setClaimedRewards(guildId, userId, claimed) {
  const data = db.getUser('rewards', guildId, userId);
  data.claimed = claimed;
  db.setUser('rewards', guildId, userId, data);
}

module.exports = {
  data: { name: 'rewards' },
  slash: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('Affiche les récompenses de niveau et permet de les réclamer'),
  async execute(msg, client) {
    try {
      const { guildId, user } = msg;
      const { level } = db.getXP(guildId, user.id);
      const claimed = getClaimedRewards(guildId, user.id);

      let description = '';
      const claimable = [];

      for (const reward of LEVEL_REWARDS) {
        const isClaimed = claimed.includes(reward.level);
        const isUnlocked = level >= reward.level;

        let status;
        if (isClaimed) {
          status = '✅ Réclamé';
        } else if (isUnlocked) {
          status = '🟢 **Disponible**';
          claimable.push(reward);
        } else {
          status = '🔒 Verrouillé';
        }

        description += `**Niveau ${reward.level}** — 🪙 ${reward.coins.toLocaleString('fr-FR')} coins — ${status}\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle('🎁 Récompenses de niveau')
        .setDescription(description)
        .setFooter({ text: `Ton niveau actuel : ${level}` })
        .setTimestamp();

      const components = [];

      if (claimable.length > 0) {
        const row = new ActionRowBuilder();
        for (const reward of claimable) {
          if (row.components.length >= 5) break;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`reward_claim_${reward.level}`)
              .setLabel(`Niv. ${reward.level} (+${reward.coins.toLocaleString('fr-FR')} 🪙)`)
              .setStyle(ButtonStyle.Success),
          );
        }
        if (row.components.length > 0) components.push(row);
      }

      const reply = await msg.reply({ embeds: [embed], components, fetchReply: true });

      if (claimable.length > 0) {
        const collector = reply.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60_000,
          filter: (i) => i.user.id === user.id,
        });

        collector.on('collect', async (btnInteraction) => {
          const rewardLevel = parseInt(btnInteraction.customId.split('_')[2]);
          const reward = LEVEL_REWARDS.find(r => r.level === rewardLevel);
          if (!reward) return;

          const currentClaimed = getClaimedRewards(guildId, user.id);
          if (currentClaimed.includes(rewardLevel)) {
            return btnInteraction.reply({ content: '❌ Tu as déjà réclamé cette récompense !', ephemeral: true });
          }

          currentClaimed.push(rewardLevel);
          setClaimedRewards(guildId, user.id, currentClaimed);
          db.addMoney(guildId, user.id, reward.coins);

          await btnInteraction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎁 Récompense réclamée !')
                .setDescription(`Tu as reçu **${reward.coins.toLocaleString('fr-FR')}** coins pour le **niveau ${rewardLevel}** ! 🎉`)
                .setTimestamp(),
            ],
            ephemeral: true,
          });

          // Disable the clicked button
          const updatedRow = ActionRowBuilder.from(btnInteraction.message.components[0]);
          const btn = updatedRow.components.find(c => c.data.custom_id === `reward_claim_${rewardLevel}`);
          if (btn) {
            btn.setLabel(`Niv. ${rewardLevel} (✅)`).setDisabled(true).setStyle(ButtonStyle.Secondary);
          }
          try {
            await btnInteraction.message.edit({ components: [updatedRow] });
          } catch {
            // ignore
          }
        });

        collector.on('end', () => {
          try {
            const disabledRow = ActionRowBuilder.from(reply.components[0]);
            for (const comp of disabledRow.components) {
              comp.setDisabled(true);
            }
            reply.edit({ components: [disabledRow] });
          } catch {
            // Message may have been deleted
          }
        });
      }
    } catch (err) {
      console.error('Rewards error:', err);
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'affichage des récompenses.')
            .setTimestamp(),
        ],
      });
    }
  },
};
