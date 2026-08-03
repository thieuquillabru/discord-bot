const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// Liste de memes statiques (sans API externe)
const memes = [
  {
    title: 'Quand le code compile du premier coup',
    image: 'https://i.imgflip.com/3lmzyx.jpg',
  },
  {
    title: 'Les deadlines approchent',
    image: 'https://i.imgflip.com/2fm6x.jpg',
  },
  {
    title: 'Quand tu trouves le bug à 3h du mat',
    image: 'https://i.imgflip.com/3si4.jpg',
  },
  {
    title: 'Le client change les specs',
    image: 'https://i.imgflip.com/1otk96.jpg',
  },
  {
    title: 'Quand le bot fonctionne enfin',
    image: 'https://i.imgflip.com/2hgfw.jpg',
  },
  {
    title: 'Stack Overflow est ton ami',
    image: 'https://i.imgflip.com/1y1z9j.jpg',
  },
  {
    title: 'It works on my machine',
    image: 'https://i.imgflip.com/2zn3l.jpg',
  },
  {
    title: 'Quand le hotfix casse tout',
    image: 'https://i.imgflip.com/261o3j.jpg',
  },
  {
    title: '90% du code est du copier-coller',
    image: 'https://i.imgflip.com/24y43o.jpg',
  },
  {
    title: 'On n\'utilise que 10% des features du framework',
    image: 'https://i.imgflip.com/3oevdk.jpg',
  },
];

module.exports = {
  data: { name: 'meme' },
  description: 'Affiche un meme aléatoire pour faire rire le serveur',
  cooldown: 5,
  slash: new SlashCommandBuilder().setName('meme').setDescription('Affiche un meme aleatoire'),
  async execute(message) {
    const meme = memes[Math.floor(Math.random() * memes.length)];

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`😂 ${meme.title}`)
      .setImage(meme.image)
      .setFooter({ text: `Envoyé par ${message.author.tag} | Utilise !meme pour en voir d'autres` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
