const request = require('supertest');
const app = require('../src/app');

describe('Tests de sécurité et de régression', () => {
  test('XSS sur /hello doit être échappé', async () => {
    const res = await request(app).get('/hello?name=<script>alert(1)</script>');
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  test('Injection de commande sur /ping doit renvoyer un statut 400', async () => {
    const res = await request(app).get('/ping?host=' + encodeURIComponent('127.0.0.1;cat /etc/passwd'));
    expect(res.status).toBe(400);
  });

  test('Prototype pollution sur /prefs ne doit pas modifier Object.prototype', async () => {
    await request(app).get('/prefs?__proto__[polluted]=true&theme=dark');
    expect(({}).polluted).toBeUndefined();
  });
});
