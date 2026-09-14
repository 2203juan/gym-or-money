'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { claveCorrecta, iniciarSesion, cerrarSesion, exigirSesion } from '@/lib/auth';
import {
  registrarSemana, anularSemana, editarMulta, registrarAbono,
  fijarSaldoInicial, listarPersonas, saldos, analizarMensaje,
} from '@/lib/dominio';
import { q, pool, bitacora } from '@/lib/db';
import { enviarMensaje, resumenSemana } from '@/lib/telegram';

export type Estado = { error?: string; ok?: string } | null;

export async function entrar(_prev: Estado, form: FormData): Promise<Estado> {
  const clave = String(form.get('clave') ?? '');
  const nombre = String(form.get('nombre') ?? '').trim();
  if (!nombre) return { error: 'Elige tu nombre.' };
  if (!claveCorrecta(clave)) return { error: 'Clave incorrecta.' };
  await iniciarSesion(nombre);
  redirect('/');
}

export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect('/login');
}

export async function previsualizar(_prev: any, form: FormData) {
  await exigirSesion();
  const texto = String(form.get('texto') ?? '');
  const analisis = await analizarMensaje(texto);
  return { analisis, texto };
}

export async function confirmarSemana(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const texto = String(form.get('texto') ?? '');
  const ignorar = form.get('ignorarDesconocidos') === 'on';

  const r = await registrarSemana(texto, autor, { ignorarDesconocidos: ignorar });
  if (!r.ok) {
    if (r.motivo === 'ya_procesada')
      return { error: `La semana ${r.analisis.semana} ya estaba registrada. No se crearon multas nuevas.` };
    if (r.motivo === 'sin_numero') return { error: 'El mensaje no trae numero de semana.' };
    if (r.motivo === 'no_es_resumen') return { error: 'El mensaje no tiene ninguna linea valida.' };
    return { error: r.detalle ?? 'No se pudo registrar.' };
  }

  // Publicar en el grupo de Telegram el detalle de lo que se acaba de registrar
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (chat && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const s = (await saldos()).map((x) => ({ nombre: x.nombre, saldo: x.saldo }));
      await enviarMensaje(chat, resumenSemana(r.analisis, s));
    } catch (e) { console.error('No se pudo publicar en Telegram', e); }
  }

  revalidatePath('/'); revalidatePath('/semanas');
  redirect(`/semanas?ok=${r.semana}`);
}

export async function anular(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const numero = Number(form.get('numero'));
  const motivo = String(form.get('motivo') ?? '').trim() || 'Sin motivo';
  const ok = await anularSemana(numero, autor, motivo);
  revalidatePath('/'); revalidatePath('/semanas');
  return ok ? { ok: `Semana ${numero} anulada. Ya puedes volver a procesarla.` }
            : { error: `La semana ${numero} no estaba activa.` };
}

export async function editar(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const id = Number(form.get('multaId'));
  const estado = String(form.get('estado')) as 'cobrada' | 'exenta' | 'anulada';
  const diasRaw = form.get('dias');
  const dias = diasRaw === null || diasRaw === '' ? undefined : Number(diasRaw);
  const motivo = String(form.get('motivo') ?? '').trim() || undefined;
  const r = await editarMulta(id, autor, { dias, estado, motivo });
  revalidatePath('/'); revalidatePath('/semanas');
  return r.ok ? { ok: 'Multa actualizada.' } : { error: r.error ?? 'Error' };
}

export async function abonar(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const personaId = Number(form.get('personaId'));
  const monto = Math.round(Number(String(form.get('monto')).replace(/[^\d-]/g, '')));
  const fecha = String(form.get('fecha') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const nota = String(form.get('nota') ?? '').trim() || null;
  if (!personaId || !monto) return { error: 'Falta la persona o el monto.' };
  await registrarAbono(personaId, monto, fecha, nota, autor);
  revalidatePath('/'); revalidatePath('/abonos');
  return { ok: 'Abono registrado.' };
}

export async function saldarTodo(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const personaId = Number(form.get('personaId'));
  const filas = await q<{ saldo: number; nombre: string }>(
    'select saldo, nombre from multas.saldos where id=$1', [personaId]);
  const saldo = filas[0]?.saldo ?? 0;
  if (saldo <= 0) return { error: 'Esa persona no debe nada.' };
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  await registrarAbono(personaId, saldo, hoy, 'Saldo todo', autor);
  revalidatePath('/'); revalidatePath('/abonos');
  return { ok: `${filas[0].nombre} queda en $0.` };
}

export async function guardarSaldosIniciales(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const personas = await listarPersonas();
  let n = 0;
  for (const p of personas) {
    const raw = form.get(`saldo_${p.id}`);
    if (raw === null) continue;
    const monto = Math.round(Number(String(raw).replace(/[^\d-]/g, '')) || 0);
    await fijarSaldoInicial(p.id, monto, autor);
    n++;
  }
  revalidatePath('/'); revalidatePath('/config');
  return { ok: `Saldos iniciales guardados para ${n} personas.` };
}

export async function guardarAlias(_prev: Estado, form: FormData): Promise<Estado> {
  const autor = await exigirSesion();
  const personaId = Number(form.get('personaId'));
  const alias = String(form.get('alias') ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  await pool.query('update multas.personas set alias=$2 where id=$1', [personaId, alias]);
  await pool.query("update multas.pendientes_mapeo set resuelto=true where lower(nombre) = any($1)", [alias]);
  await bitacora(null, 'alias_actualizados', autor, { personaId, alias });
  revalidatePath('/config');
  return { ok: 'Alias actualizados.' };
}
