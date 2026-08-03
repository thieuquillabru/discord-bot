require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID,
  prefix: '!',
  colors: {
    success: 0x2ECC71,
    error: 0xE74C3C,
    warning: 0xF39C12,
    info: 0x3498DB,
    embed: 0x5865F2,
  },
  welcome: {
    channelId: process.env.WELCOME_CHANNEL_ID || null,
    message: 'Bienvenue {member} sur **{server}** ! 🎉\nNous sommes maintenant **{count}** membres.',
  },
  tickets: {
    categoryId: process.env.TICKET_CATEGORY_ID || null,
    logChannelId: null, // optionnel : canal où loguer la fermeture des tickets
  },
  modRoleId: process.env.MOD_ROLE_ID || null,
};
