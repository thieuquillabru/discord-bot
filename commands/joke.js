const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const JOKES = [
  "Pourquoi les plongeurs plongent-ils toujours en arriere et jamais en avant ?\nParce que sinon ils tomberaient dans le bateau.",
  "Quelle est la difference entre un pigeon et un plombier ?\nLe pigeon peut faire coin-coin, mais le plombier peut faire plomb-plomb.",
  "Pourquoi les moutons aiment-ils le chewing-gum ?\nParce que c'est bon pour la laine.",
  "Que dit un citron quand il fait un braquage ?\nPas un zeste !",
  "Quelle est la difference entre un avion et un frigo ?\nLe frigo ne vole pas, l'avion ne refroidit pas.",
  "Pourquoi les maths sont-elles tristes ?\nParce qu'elles ont plein de problemes.",
  "Que fait une fraise sur un cheval ?\nTagada !",
  "Quelle est la ville la plus dangereuse du monde ?\nElectri-cite.",
  "Comment appelle-t-on un chat tombe dans un pot de peinture ?\nUn chat peint.",
  "Que dit une noix de coco quand on la tickle ?\nCoco !",
  "Pourquoi les escargots ne sont-ils jamais tristes ?\nParce qu'ils sont dans leur coquille.",
  "Pourquoi les oiseaux ne prennent-ils jamais de medicaments ?\nParce qu'ils ont une bonne sante-caille.",
  "Que dit un tonneau quand il roule ?\nJe suis a tonneau !",
  "Pourquoi le fichier est-il alle chez le medecin ?\nParce qu'il avait un virus.",
  "Comment appelle-t-on un chien magique ?\nUn labracadabrador.",
  "Pourquoi les fantomes aiment-ils les ascenseurs ?\nParce que ca les monte au ciel.",
  "Quel est le comble pour un electricien ?\nDe ne pas etre au courant.",
  "Comment appelle-t-on un boomerang qui ne revient pas ?\nUn baton.",
  "Pourquoi le chat va-t-il toujours sur le clavier ?\nPour surveiller la souris.",
  "Que fait un canif quand il a froid ?\nIl se met dans sa gaine.",
  "Pourquoi les secrets ne font-ils jamais de bruit ?\nParce qu'ils sont bien gardes.",
  "Quel est le sport prefere des insectes ?\nLe criquet.",
  "Que fait une pomme de terre en colere ?\nElle explose !",
  "Que dit un moustique a un autre ?\nTu me piques, je te piques.",
  "Pourquoi les bananes sont-elles jeunes ?\nParce qu'elles sont nees avec la queue tressee.",
  "Pourquoi les poissons n'aiment pas l'ordinateur ?\nParce qu'ils ont peur du net.",
  "Que dit deux araignees quand elles se croisent ?\nSalut larachnee !",
  "Pourquoi le petit garcon jette-t-il l'horloge par la fenetre ?\nPour voir le temps passer.",
  "Quel est le comble pour un dentiste ?\nDe perdre la raison.",
];

module.exports = {
  data: { name: 'joke' },
  slash: new SlashCommandBuilder().setName('joke').setDescription('Affiche une blague aleatoire'),
  async execute(msg) {
    try {
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Blague aleatoire').setDescription(joke).setFooter({ text: 'Demande par ' + msg.user.username }).setTimestamp();
      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur joke:', err);
      if (!msg.replied && !msg.deferred) await msg.reply({ content: 'Erreur.', ephemeral: true });
    }
  },
};
