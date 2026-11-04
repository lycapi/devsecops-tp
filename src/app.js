const express = require('express');
const { execFile } = require('child_process');

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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route /hello sécurisée
app.get('/hello', (req, res) => {
  const name = req.query.name || 'inconnu';
  res.send(`<h1>Bonjour ${escapeHtml(name)}</h1>`);
});

// Route /ping sécurisée
app.get('/ping', (req, res) => {
  const host = req.query.host;
  const hostRegex = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]))*$/;

  if (!host || !hostRegex.test(host)) {
    return res.status(400).send('Hôte invalide');
  }

  // execFile n'invoque pas de shell système, empêchant l'injection de commandes
  execFile('ping', ['-c', '1', host], (err, stdout) => {
    if (err) return res.status(500).send('Erreur');
    res.type('text').send(stdout);
  });
});

// Route /prefs sécurisée
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
