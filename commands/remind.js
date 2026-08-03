const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// Stockage des rappels
const reminders = new Map();

module.exports = {
  data: { name: 'remind' },
  description: 'Définit un rappel privé',
  usage: '<durée> <message>',
  cooldown: 10,
  slash: new SlashCommandBuilder().setName('remind').setDescription('Definit un rappel prive').addStringOption(o => o.setName('duree').setDescription('Duree (ex: 10m, 1h, 1d)').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Le message du rappel').setRequired(true)),
  async execute(message, args) {
    if (args.length < 2) {
      return message.reply('❌ Format invalide.\nUtilisation : `!remind <durée> <message>`\nExemple : `!remind 10m Vérifier les logs`');
    }

    const ms = require('ms');
    const durationStr = args[0];
    const reminderText = args.slice(1).join(' ');

    const duration = ms(durationStr);
    if (!duration || duration < 5000) {
      return message.reply('❌ Durée invalide. Utilise un format comme `30s`, `5m`, `1h`, `1d`.');
    }
    if (duration > 7 * 24 * 60 * 60 * 1000) {
      return message.reply('❌ La durée ne peut pas dépasser 7 jours.');
    }

    const durationText = ms(duration, { long: true });

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('⏰ Rappel programmé')
      .addFields(
        { name: 'Dans', value: durationText, inline: true },
        { name: 'Message', value: reminderText, inline: false },
      )
      .setFooter({ text: `Tu recevras un MP quand le temps sera écoulé.` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Programmer le rappel
    setTimeout(async () => {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('⏰ Rappel !')
          .setDescription(reminderText)
          .addFields(
            { name: 'Programmé sur', value: `${message.guild.name} dans #${message.channel.name}`, inline: false },
          )
          .setTimestamp();

        await message.author.send({ embeds: [dmEmbed] });
      } catch (e) {
        // DM fermés, on envoie dans le canal d'origine
        try {
          await message.channel.send(`${message.author}, ⏰ **Rappel :** ${reminderText}`);
        } catch (err) {
          // Canal supprimé ou inaccessible
        }
      }
    }, duration);
  },
};
