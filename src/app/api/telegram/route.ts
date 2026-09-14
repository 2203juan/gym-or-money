import { NextResponse } from 'next/server';
import { pool, bitacora } from '@/lib/db';
import { registrarSemana, saldos, analizarMensaje } from '@/lib/dominio';
import { enviarMensaje, resumenSemana } from '@/lib/telegram';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Telegram reintenta el mismo update si no recibe 200, asi que:
 *  - guardamos los update_id ya vistos y los ignoramos si se repiten
 *  - ignoramos los mensajes enviados por el propio bot (evita loops)
 *  - SIEMPRE devolvemos 200, incluso ante errores, para que no reintente en bucle
 */
export async function POST(req: Request) {
  // Verificacion del secreto del webhook
  const secreto = env('TELEGRAM_WEBHOOK_SECRET');
  if (secreto && req.headers.get('x-telegram-bot-api-secret-token') !== secreto) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: any;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const updateId = Number(update?.update_id);
  if (!Number.isFinite(updateId)) return NextResponse.json({ ok: true });

  // Dedupe atomico: si ya existe, no hacemos nada
  const ins = await pool.query(
    'insert into multas.telegram_updates (update_id) values ($1) on conflict do nothing returning update_id',
    [updateId],
  );
  if (ins.rowCount === 0) return NextResponse.json({ ok: true, duplicado: true });

  const msg = update.message ?? update.channel_post ?? update.edited_message;
  if (!msg) return NextResponse.json({ ok: true });

  // Ignorar lo que envia el propio bot
  if (msg.from?.is_bot) return NextResponse.json({ ok: true, bot: true });

  const chatId = msg.chat?.id;
  const texto: string = msg.text ?? msg.caption ?? '';
  const autor = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ')
    || msg.from?.username || 'Telegram';

  try {
    // Comandos rapidos
    const cmd = texto.trim().toLowerCase();
    if (cmd === '/saldos' || cmd === '/saldos@bot' || cmd === '/bote') {
      const s = await saldos();
      const total = s.reduce((a, b) => a + Math.max(b.saldo, 0), 0);
      const { formatoCOP } = await import('@/lib/multas');
      const lineas = ['<b>Saldos</b>', ...s.map((x) => `• ${x.nombre}: ${formatoCOP(x.saldo)}`),
        '', `<b>Bote: ${formatoCOP(total)}</b>`];
      const app = env('APP_URL');
      if (app) lineas.push(`<a href="${app}">Ver detalle</a>`);
      await enviarMensaje(chatId, lineas.join('\n'));
      return NextResponse.json({ ok: true });
    }

    const analisisPrevio = await analizarMensaje(texto);
    // Mensajes que no son el resumen se ignoran en silencio (el grupo manda muchos)
    if (!analisisPrevio.esResumen) return NextResponse.json({ ok: true, ignorado: true });

    // El mensaje entrante siempre se guarda en la bitacora, aunque no se procese
    await bitacora(null, 'telegram_recibido', autor, {
      updateId, chatId, semana: analisisPrevio.semana, texto: texto.slice(0, 2000),
    });

    if (analisisPrevio.semana === null) {
      await enviarMensaje(chatId,
        '⚠️ Ese mensaje parece el resumen pero no trae número de semana. Agrégalo (ej. «Semana # 33») y reenvíalo.');
      return NextResponse.json({ ok: true });
    }

    const r = await registrarSemana(texto, autor, { ignorarDesconocidos: true });

    if (!r.ok) {
      if (r.motivo === 'ya_procesada') {
        await enviarMensaje(chatId,
          `ℹ️ La semana <b>${r.analisis.semana}</b> ya estaba registrada. No creé multas nuevas.`);
      } else {
        await enviarMensaje(chatId,
          `⚠️ No pude registrar la semana ${r.analisis.semana}:\n${r.detalle ?? r.motivo}`);
      }
      return NextResponse.json({ ok: true });
    }

    // Publicar el detalle de las multas que se acaban de registrar, con saldos al dia.
    // Si Telegram falla, la semana YA quedo registrada: no se revierte nada.
    const s = (await saldos()).map((x) => ({ nombre: x.nombre, saldo: x.saldo }));
    const publicado = await enviarMensaje(chatId, resumenSemana(r.analisis, s));

    return NextResponse.json({ ok: true, semana: r.semana, publicado });
  } catch (e) {
    console.error('Error procesando update de Telegram', e);
    // 200 igual: no queremos que Telegram reintente en bucle
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, servicio: 'webhook de multas' });
}
