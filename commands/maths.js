const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// Liste blanche stricte des tokens autorisés
const ALLOWED_TOKENS = new Set([
  'Math.sin', 'Math.cos', 'Math.tan', 'Math.sqrt', 'Math.log',
  'Math.PI', 'Math.E', 'Math.abs', 'Math.round', 'Math.floor', 'Math.ceil',
  'Math.pow', 'Math.min', 'Math.max', 'Math.random',
]);

function sanitizeExpression(expr) {
  // Remplacer les virgules par des points pour les décimales
  expr = expr.replace(/,/g, '.');

  // Vérifier qu'il n'y a que des caractères autorisés
  // Autorisé : chiffres, espaces, +, -, *, /, %, (, ), ., lettres (pour Math.*), **
  if (!/^[0-9+\-*/%.()\s.,a-zA-Z]+$/.test(expr)) {
    return null;
  }

  // Extraire tous les identifiants (mots) de l'expression
  const identifiers = expr.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];

  for (const id of identifiers) {
    if (!ALLOWED_TOKENS.has(id)) {
      return null;
    }
  }

  return expr;
}

module.exports = {
  data: { name: 'maths' },
  description: 'Évalue une expression mathématique',
  slash: new SlashCommandBuilder()
    .setName('maths')
    .setDescription('Évalue une expression mathématique en toute sécurité')
    .addStringOption(o => o.setName('expression').setDescription('Expression mathématique (ex: 2+2, Math.sqrt(16))').setRequired(true).setMaxLength(300)),
  async execute(msg) {
    try {
      const rawExpr = msg.options.getString('expression');
      const sanitized = sanitizeExpression(rawExpr);

      if (sanitized === null) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Expression invalide')
          .setDescription('L\'expression contient des caractères ou fonctions non autorisés.\nFonctions autorisées : `Math.sin`, `Math.cos`, `Math.tan`, `Math.sqrt`, `Math.log`, `Math.abs`, `Math.round`, `Math.floor`, `Math.ceil`, `Math.pow`, `Math.min`, `Math.max`, `Math.PI`, `Math.E`.\nOpérateurs : `+`, `-`, `*`, `/`, `%`, `**`, `()`')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      let result;
      try {
        // Utiliser Function constructor de manière sécurisée
        const fn = new Function(`"use strict"; return (${sanitized});`);
        result = fn();
      } catch (evalErr) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Erreur de calcul')
          .setDescription(`Impossible d\'évaluer cette expression.\n\`\`\`${evalErr.message}\`\`\``)
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      if (typeof result !== 'number' || !isFinite(result)) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Résultat invalide')
          .setDescription('Le résultat n\'est pas un nombre fini.')
          .setFooter({ text: msg.user.username });
        return msg.reply({ embeds: [errEmbed], ephemeral: true });
      }

      // Arrondir à 10 décimales max pour l'affichage
      const displayResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🧮 Calculatrice')
        .addFields(
          { name: '📝 Expression', value: `\`\`\`${rawExpr}\`\`\``, inline: false },
          { name: '✅ Résultat', value: `\`\`\`${displayResult}\`\`\``, inline: false },
        )
        .setFooter({ text: `Demandé par ${msg.user.tag}` })
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur maths:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors du calcul.')
        .setFooter({ text: msg.user.username });
      if (!msg.replied && !msg.deferred) await msg.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
