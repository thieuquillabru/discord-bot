module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
    console.log(`📋 ${client.commands.size} commandes chargées`);
    console.log(`🌐 ${client.guilds.cache.size} serveur(s)`);

    // Statut du bot
    client.user.setActivity('!help pour commencer', { type: 'PLAYING' });
    console.log('Redeploy v2 - token updated');
  },
};
