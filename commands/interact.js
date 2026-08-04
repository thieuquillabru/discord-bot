const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const ACTIONS = {
  hug: {
    emoji: '🤗',
    verb: 'fait un câlin à',
    responses: [
      '{author} serre fort {target} dans ses bras !',
      '{author} fait un câlin chaleureux à {target} !',
      '{author} enveloppe {target} dans un gros câlin !',
    ],
  },
  kiss: {
    emoji: '💋',
    verb: 'embrasse',
    responses: [
      '{author} donne un bisou à {target} !',
      '{author} pose un doux baiser sur la joue de {target} !',
      '{author} fait voler un baiser à {target} ! ❤️',
    ],
  },
  slap: {
    emoji: '👋',
    verb: 'gifle',
    responses: [
      '{author} gifle {target} ! PAF !',
      '{author} donne une claque à {target} ! Ça doit piquer...',
      '{author} administre une gifle à {target} !',
    ],
  },
  highfive: {
    emoji: '✋',
    verb: 'fait un high-five avec',
    responses: [
      '{author} et {target} se font un high-five ! 👏',
      '{author} et {target} tapent dans les mains !',
      '{author} et {target} célèbrent avec un high-five !',
    ],
  },
  pat: {
    emoji: '🤚',
    verb: 'caresse la tête de',
    responses: [
      '{author} fait une petite tapote sur la tête de {target} !',
      '{author} caresse gentiment la tête de {target} !',
      '{author} donne une tape amicale à {target} !',
    ],
  },
  poke: {
    emoji: '👉',
    verb: 'poke',
    responses: [
      '{author} poke {target} ! Hey, réveille-toi !',
      '{author} touche du doigt {target} ! *poke poke*',
      '{author} pique {target} du doigt !',
    ],
  },
  handshake: {
    emoji: '🤝',
    verb: 'serre la main de',
    responses: [
      '{author} serre la main de {target} avec fermeté !',
      '{author} salue {target} avec une poignée de main !',
      '{author} et {target} scellent un accord avec une poignée de main !',
    ],
  },
  wave: {
    emoji: '👋',
    verb: 'salue',
    responses: [
      '{author} fait un petit coucou à {target} !',
      '{author} salue chaleureusement {target} !',
      '{author} fait signe à {target} de loin !',
    ],
  },
};

const ACTION_CHOICES = Object.keys(ACTIONS).map(a => ({ name: ACTIONS[a].emoji + ' ' + a, value: a }));

module.exports = {
  data: { name: 'interact' },
  slash: new SlashCommandBuilder()
    .setName('interact')
    .setDescription('Interagis avec un autre utilisateur')
    .addUserOption(o => o.setName('user').setDescription('Utilisateur cible').setRequired(true))
    .addStringOption(o => o.setName('action').setDescription('Action à effectuer').setRequired(true).addChoices(...ACTION_CHOICES)),
  async execute(msg, client) {
    try {
      const target = msg.options.getUser('user');
      const actionName = msg.options.getString('action');
      const action = ACTIONS[actionName];

      if (!action) {
        return msg.reply({ content: '❌ Action invalide.', ephemeral: true });
      }

      if (target.id === msg.user.id) {
        return msg.reply({ content: '❌ Tu ne peux pas interagir avec toi-même !', ephemeral: true });
      }

      const response = action.responses[Math.floor(Math.random() * action.responses.length)]
        .replace(/{author}/g, msg.user.username)
        .replace(/{target}/g, target.username);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(`${action.emoji} ${response}`)
        .setFooter({ text: `Action de ${msg.user.username}` })
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur interact:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  },
};
