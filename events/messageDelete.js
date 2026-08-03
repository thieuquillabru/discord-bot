module.exports = {
  name: 'messageDelete',
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (message.system) return;

    // Import dynamique pour éviter les dépendances circulaires
    const snipe = require('../commands/snipe');
    snipe.deletedMessages.set(message.channelId, {
      content: message.content,
      author: message.author,
      deletedAt: new Date(),
      attachments: message.attachments.map(a => ({
        name: a.name,
        url: a.url,
        contentType: a.contentType,
      })),
    });

    // Nettoyer après 60 secondes
    setTimeout(() => {
      snipe.deletedMessages.delete(message.channelId);
    }, 60000);
  },
};
