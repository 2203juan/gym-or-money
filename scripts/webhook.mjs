/**
 * Registra (o revisa) el webhook de Telegram leyendo los valores del .env local.
 * Uso:
 *   node scripts/webhook.mjs          -> muestra el estado actual
 *   node scripts/webhook.mjs set      -> registra el webhook
 *   node scripts/webhook.mjs delete   -> lo quita
 *
 * No hay que copiar el token a ningun lado: lo lee del .env.
 */
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');

function leerEnv() {
  for (const nombre of ['.env.local', '.env']) {
    const p = path.join(raiz, nombre);
    if (!fs.existsSync(p)) continue;
    const env = {};
    for (const linea of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = linea.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const clave = t.slice(0, i).trim();
      if (!/^[A-Z][A-Z0-9_]*$/.test(clave)) continue; // ignora lineas que no son variables
      let valor = t.slice(i + 1).trim();
      // quita comillas envolventes, que Vercel SI toma como parte del valor
      if ((valor.startsWith('"') && valor.endsWith('"')) ||
          (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      }
      env[clave] = valor;
    }
    return { env, archivo: nombre };
  }
  throw new Error('No encontre .env ni .env.local en ' + raiz);
}

const { env, archivo } = leerEnv();
const token = env.TELEGRAM_BOT_TOKEN;
const secreto = env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = (env.APP_URL || '').replace(/\/+$/, '');

const faltan = [];
if (!token) faltan.push('TELEGRAM_BOT_TOKEN');
if (!secreto) faltan.push('TELEGRAM_WEBHOOK_SECRET');
if (!appUrl) faltan.push('APP_URL');
if (faltan.length) {
  console.error(`Faltan variables en ${archivo}: ${faltan.join(', ')}`);
  process.exit(1);
}

const api = (m, body) =>
  fetch(`https://api.telegram.org/bot${token}/${m}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json());

const destino = `${appUrl}/api/telegram`;
const accion = (process.argv[2] || 'info').toLowerCase();

console.log(`Leyendo ${archivo}`);

const yo = await api('getMe');
if (!yo.ok) {
  console.error('\nEl token no sirve:', yo.description);
  console.error('Revisa que TELEGRAM_BOT_TOKEN no tenga comillas ni espacios de sobra.');
  process.exit(1);
}
console.log(`Bot: @${yo.result.username} (${yo.result.first_name})`);

if (accion === 'set') {
  const r = await api('setWebhook', {
    url: destino,
    secret_token: secreto,
    drop_pending_updates: true,
    allowed_updates: ['message', 'channel_post', 'edited_message'],
  });
  console.log(r.ok ? `\nWebhook registrado en ${destino}` : `\nFallo: ${r.description}`);
  if (!r.ok) process.exit(1);
} else if (accion === 'delete') {
  const r = await api('deleteWebhook', { drop_pending_updates: true });
  console.log(r.ok ? '\nWebhook eliminado.' : `\nFallo: ${r.description}`);
}

const info = (await api('getWebhookInfo')).result ?? {};
console.log('\n--- Estado del webhook ---');
console.log('url                  :', info.url || '(ninguno)');
console.log('pendientes en cola   :', info.pending_update_count ?? 0);
console.log('ultimo error         :', info.last_error_message || 'ninguno');
if (info.last_error_date) {
  console.log('fecha del error      :', new Date(info.last_error_date * 1000).toLocaleString('es-CO'));
}
console.log('secret_token puesto  :', info.has_custom_certificate === undefined ? 'n/d' : (secreto ? 'si' : 'no'));

console.log('\n--- Diagnostico ---');
if (!info.url) {
  console.log('X  No hay webhook. Corre:  node scripts/webhook.mjs set');
} else if (info.url !== destino) {
  console.log(`X  El webhook apunta a otra URL.\n   actual  : ${info.url}\n   deberia : ${destino}\n   Corre:  node scripts/webhook.mjs set`);
} else if (info.last_error_message) {
  console.log('X  Telegram intenta entregar pero tu app lo rechaza:', info.last_error_message);
  console.log('   Si dice 401, el TELEGRAM_WEBHOOK_SECRET del .env y el de Vercel no coinciden.');
} else {
  console.log('OK El webhook apunta a tu app y no hay errores.');
  console.log('   Falta que el bot vea los mensajes del grupo: en BotFather /setprivacy -> Disable.');
}
