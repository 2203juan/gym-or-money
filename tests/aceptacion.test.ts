/**
 * Criterios de aceptacion 1-7 del documento, contra una base Postgres real.
 * Requiere DATABASE_URL apuntando a una base con db/schema.sql + db/seed.sql aplicados.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getPool, q } from '../src/lib/db';
import {
  registrarSemana, anularSemana, registrarAbono, saldos,
  analizarMensaje, listarPersonas, fijarSaldoInicial,
} from '../src/lib/dominio';

const SEMANA_32 = `Semana # 32

Naranjo: 4/4 ✅
Hoyos: 2/3
Betan: 0/3
Yummy: 4/6
Juanbol: 4/3 ✅️
Juan Marcos: 1/2
Lucho: 3/3 ✅
Will: 3/3 ✅
Jorge: 3/3 ✅`;

async function limpiar() {
  await q('truncate multas.multas, multas.semanas, multas.abonos, multas.bitacora, multas.pendientes_mapeo, multas.telegram_updates restart identity cascade');
}
async function saldoDe(nombre: string) {
  const r = await q<any>('select saldo from multas.saldos where nombre=$1', [nombre]);
  return r[0]?.saldo ?? null;
}

beforeEach(limpiar);
afterAll(async () => { await getPool().end(); });

describe('criterios de aceptacion', () => {
  it('CA1: la semana 32 produce los montos exactos', async () => {
    const r = await registrarSemana(SEMANA_32, 'Juan');
    expect(r.ok).toBe(true);

    const filas = await q<any>(
      `select p.nombre, m.monto, m.estado from multas.multas m
       join multas.personas p on p.id=m.persona_id order by p.nombre`);
    const map = Object.fromEntries(filas.map((f) => [f.nombre, f.monto]));

    expect(map['Hoyos']).toBe(35000);
    expect(map['Betán']).toBe(70000);
    expect(map['Yummy']).toBe(42000); // tabla meta 6 / 4 dias
    expect(map['Juan Marcos']).toBe(35000);
    for (const n of ['Naranjo', 'Juanbol', 'Lucho', 'Will', 'Jorge']) expect(map[n]).toBe(0);
    expect(filas).toHaveLength(9);
  });

  it('CA2: reenviar el mismo mensaje no duplica y avisa', async () => {
    await registrarSemana(SEMANA_32, 'Juan');
    const segundo = await registrarSemana(SEMANA_32, 'Lucho');
    expect(segundo.ok).toBe(false);
    if (!segundo.ok) expect(segundo.motivo).toBe('ya_procesada');

    const n = await q<any>('select count(*)::int as n from multas.multas');
    expect(n[0].n).toBe(9);
    const s = await q<any>('select count(*)::int as n from multas.semanas');
    expect(s[0].n).toBe(1);
  });

  it('CA2b: dos mensajes simultaneos crean una sola semana', async () => {
    const res = await Promise.allSettled([
      registrarSemana(SEMANA_32, 'A'), registrarSemana(SEMANA_32, 'B'),
      registrarSemana(SEMANA_32, 'C'),
    ]);
    const exitosos = res.filter((r) => r.status === 'fulfilled' && (r.value as any).ok);
    expect(exitosos).toHaveLength(1);
    const n = await q<any>('select count(*)::int as n from multas.multas');
    expect(n[0].n).toBe(9);
  });

  it('CA3: un emoji distinto al check genera multa $0 marcada como exenta', async () => {
    await registrarSemana('Semana 33\n\nBetan: 0/3 \u{1F912}\nHoyos: 3/3 ✅', 'Juan');
    const r = await q<any>(
      `select p.nombre, m.monto, m.estado, m.motivo from multas.multas m
       join multas.personas p on p.id=m.persona_id where p.nombre='Betán'`);
    expect(r[0].monto).toBe(0);
    expect(r[0].estado).toBe('exenta');
    expect(r[0].motivo).toMatch(/excusa/i);
    expect(await saldoDe('Betán')).toBe(0);
  });

  it('CA4: una meta de 8 no genera multa sino una advertencia clara', async () => {
    const a = await analizarMensaje('Semana 34\n\nHoyos: 2/8\nWill: 3/3 ✅');
    const hoyos = a.items.find((i) => i.nombre === 'Hoyos')!;
    expect(hoyos.error).toMatch(/fuera del rango/i);
    expect(hoyos.monto).toBe(0);

    const r = await registrarSemana('Semana 34\n\nHoyos: 2/8\nWill: 3/3 ✅', 'Juan');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toBe('errores');
      expect(r.detalle).toMatch(/fuera del rango/i);
    }
    expect((await q<any>('select count(*)::int as n from multas.multas'))[0].n).toBe(0);
  });

  it('CA5: un nombre no reconocido se reporta, no se descarta en silencio', async () => {
    const texto = 'Semana 35\n\nPepito Perez: 1/3\nHoyos: 3/3 ✅';
    const a = await analizarMensaje(texto);
    expect(a.desconocidos).toEqual(['Pepito Perez']);

    // Sin la marca explicita, no se registra nada
    const bloqueado = await registrarSemana(texto, 'Juan');
    expect(bloqueado.ok).toBe(false);

    // Con la marca, se registra el resto y queda el pendiente anotado
    const r = await registrarSemana(texto, 'Juan', { ignorarDesconocidos: true });
    expect(r.ok).toBe(true);
    const pend = await q<any>('select nombre from multas.pendientes_mapeo where resuelto=false');
    expect(pend.map((p) => p.nombre)).toEqual(['Pepito Perez']);
    expect((await q<any>('select count(*)::int as n from multas.multas'))[0].n).toBe(1);
  });

  it('CA6: anular la semana 32 devuelve todos los saldos a como estaban', async () => {
    const antes = Object.fromEntries((await saldos()).map((s) => [s.nombre, s.saldo]));
    await registrarSemana(SEMANA_32, 'Juan');
    expect(await saldoDe('Betán')).toBe(70000);

    const ok = await anularSemana(32, 'Lucho', 'marcador equivocado');
    expect(ok).toBe(true);

    const despues = Object.fromEntries((await saldos()).map((s) => [s.nombre, s.saldo]));
    expect(despues).toEqual(antes);

    // No se borra: queda el rastro
    const s = await q<any>("select estado, anulada_por, motivo_anulacion from multas.semanas where numero=32");
    expect(s[0].estado).toBe('anulada');
    expect(s[0].anulada_por).toBe('Lucho');
    expect((await q<any>('select count(*)::int as n from multas.multas'))[0].n).toBe(9);

    // Y se puede volver a procesar
    const otra = await registrarSemana(SEMANA_32, 'Juan');
    expect(otra.ok).toBe(true);
  });

  it('CA7: un abono de 35.000 a Hoyos lo deja en $0', async () => {
    await registrarSemana(SEMANA_32, 'Juan');
    expect(await saldoDe('Hoyos')).toBe(35000);
    const p = (await listarPersonas()).find((x) => x.nombre === 'Hoyos')!;
    await registrarAbono(p.id, 35000, '2026-09-14', 'Nequi', 'Juan');
    expect(await saldoDe('Hoyos')).toBe(0);
  });
});

describe('extras', () => {
  it('el saldo inicial migrado aparece como movimiento explicito', async () => {
    const p = (await listarPersonas()).find((x) => x.nombre === 'Will')!;
    await fijarSaldoInicial(p.id, 210000, 'Juan');
    expect(await saldoDe('Will')).toBe(210000);
    const mov = await q<any>("select nota, tipo from multas.abonos where persona_id=$1", [p.id]);
    expect(mov[0].tipo).toBe('saldo_inicial');
    expect(mov[0].nota).toMatch(/Splitwise/);

    // Re-fijarlo reemplaza, no acumula
    await fijarSaldoInicial(p.id, 100000, 'Juan');
    expect(await saldoDe('Will')).toBe(100000);
  });

  it('el saldo siempre se reconstruye desde los movimientos', async () => {
    const p = (await listarPersonas()).find((x) => x.nombre === 'Betán')!;
    await fijarSaldoInicial(p.id, 100000, 'Juan');
    await registrarSemana(SEMANA_32, 'Juan');          // +70000
    await registrarAbono(p.id, 50000, '2026-09-14', null, 'Juan'); // -50000
    expect(await saldoDe('Betán')).toBe(120000);
  });

  it('todo queda en la bitacora con autor', async () => {
    await registrarSemana(SEMANA_32, 'Naranjo');
    await anularSemana(32, 'Will', 'error');
    const b = await q<any>('select accion, autor from multas.bitacora order by id');
    expect(b.map((x) => [x.accion, x.autor])).toEqual([
      ['semana_procesada', 'Naranjo'], ['semana_anulada', 'Will'],
    ]);
  });

  it('mensajes que no son el resumen se ignoran en silencio', async () => {
    const r = await registrarSemana('quien va a la 6am manana?', 'Juan');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('no_es_resumen');
    expect((await q<any>('select count(*)::int as n from multas.bitacora'))[0].n).toBe(0);
  });
});
