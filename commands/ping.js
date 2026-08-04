const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: { name: 'ping' },
  description: 'Affiche la latence du bot',
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('ping').setDescription('Affiche la latence du bot'),
  async execute(message) {
    const sent = await message.reply('🏓 Pong...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`🏓 **Pong !** \n> Latence : **${latency}ms** \n> API : **${message.client.ws.ping}ms**`);
  },
};
