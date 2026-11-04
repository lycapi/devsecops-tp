const express = require('express');
const { execFile } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();

// Fonction d'échappement HTML pour contrer le XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Limiteur de débit pour les routes sensibles (désactivé pendant les tests automatisés)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes par IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route /hello sécurisée
app.get('/hello', (req, res) => {
  const name = req.query.name || 'inconnu';
  res.send(`<h1>Bonjour ${escapeHtml(name)}</h1>`);
});

// Route /ping sécurisée avec Rate Limiting et protection ReDoS/Injection
app.get('/ping', limiter, (req, res) => {
  const host = req.query.host;

  // Expression régulière stricte et ancrée (^ et $) pour éviter le ReDoS et les injections
  const hostRegex = /^[a-zA-Z0-9.-]+$/;

  if (!host || !hostRegex.test(host)) {
    return res.status(400).send('Hôte invalide');
  }

  // execFile n'invoque pas de shell système, empêchant l'injection de commandes
  execFile('ping', ['-c', '1', host], (err, stdout) => {
    if (err) return res.status(500).send('Erreur');
    res.type('text').send(stdout);
  });
});

// Route /prefs sécurisée contre la pollution de prototype
app.get('/prefs', (req, res) => {
  const defaults = { theme: 'light', lang: 'fr' };
  const allowedKeys = ['theme', 'lang'];
  const userPrefs = {};

  for (const key of allowedKeys) {
    if (req.query && Object.prototype.hasOwnProperty.call(req.query, key)) {
      userPrefs[key] = String(req.query[key]);
    }
  }

  res.json({ ...defaults, ...userPrefs });
});

module.exports = app;