import { formatoCOP } from './multas';
import type { Analisis } from './dominio';

const API = 'https://api.telegram.org/bot';

export function tokenBot(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('Falta TELEGRAM_BOT_TOKEN');
  return t;
}

/**
 * Envia un mensaje al chat. NUNCA lanza: si Telegram falla no queremos perder
 * ni revertir un registro que ya quedo guardado en la base.
 */
export async function enviarMensaje(chatId: string | number, texto: string): Promise<boolean> {
  let token: string;
  try { token = tokenBot(); } catch (e) { console.error(e); return false; }
  try {
  const res = await fetch(`${API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    console.error('Telegram sendMessage fallo', res.status, cuerpo);
    return false;
  }
  return true;
  } catch (e) {
    console.error('Telegram sendMessage lanzo', e);
    return false;
  }
}

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Mensaje que el bot publica en el grupo con el detalle de las multas registradas. */
export function resumenSemana(analisis: Analisis, saldosDespues?: { nombre: string; saldo: number }[]): string {
  const l: string[] = [];
  l.push(`<b>Multas — Semana ${analisis.semana}</b>`);
  l.push('');

  const cobradas = analisis.items.filter((i) => !i.error && i.estado === 'cobrada' && i.monto > 0);
  const cumplieron = analisis.items.filter((i) => !i.error && i.estado === 'cobrada' && i.monto === 0);
  const exentas = analisis.items.filter((i) => !i.error && i.estado === 'exenta');

  if (cobradas.length) {
    l.push('💸 <b>Pagan</b>');
    for (const i of cobradas) {
      l.push(`• ${escapar(i.nombre)} ${i.dias}/${i.meta} — <b>${formatoCOP(i.monto)}</b>`);
    }
  } else {
    l.push('🎉 Nadie paga esta semana.');
  }

  if (exentas.length) {
    l.push('');
    l.push('🩹 <b>Exentos por excusa</b>');
    for (const i of exentas) l.push(`• ${escapar(i.nombre)} ${i.dias}/${i.meta} ${i.emoji}`);
  }

  if (cumplieron.length) {
    l.push('');
    l.push(`✅ <b>Cumplieron:</b> ${cumplieron.map((i) => escapar(i.nombre)).join(', ')}`);
  }

  l.push('');
  l.push(`<b>Total de la semana: ${formatoCOP(analisis.totalCobrado)}</b>`);

  if (analisis.desconocidos.length) {
    l.push('');
    l.push(`⚠️ <b>Nombres sin reconocer</b> (no se registraron): ${analisis.desconocidos.map(escapar).join(', ')}`);
  }
  if (analisis.advertencias.length) {
    l.push('');
    l.push('⚠️ ' + analisis.advertencias.map(escapar).join('\n⚠️ '));
  }

  if (saldosDespues?.length) {
    l.push('');
    l.push('<b>Saldos acumulados</b>');
    for (const s of saldosDespues) {
      if (s.saldo === 0) continue;
      l.push(`• ${escapar(s.nombre)}: ${formatoCOP(s.saldo)}${s.saldo < 0 ? ' (a favor)' : ''}`);
    }
  }

  const url = process.env.APP_URL;
  if (url) { l.push(''); l.push(`<a href="${url}">Ver saldos y detalle</a>`); }

  return l.join('\n');
}
