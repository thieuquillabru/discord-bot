module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log('Bot connecté en tant que ' + client.user.tag);
    console.log(client.commands.size + ' commandes chargées');
    console.log(client.guilds.cache.size + ' serveur(s)');
  },
};
