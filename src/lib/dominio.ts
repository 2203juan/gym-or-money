import type { PoolClient } from 'pg';
import { pool, q, tx, bitacora } from './db';
import { parsearMensaje, normalizarNombre, type LineaParseada } from './parser';
import { calcularMulta } from './multas';

export type Persona = { id: number; nombre: string; alias: string[]; es_receptor: boolean; activo: boolean };

export type ItemPrevio = {
  nombreCrudo: string;
  personaId: number | null;
  nombre: string;
  dias: number;
  meta: number;
  monto: number;
  estado: 'cobrada' | 'exenta';
  emoji: string;
  /** Si viene, esta linea NO se puede registrar */
  error?: string;
};

export type Analisis = {
  esResumen: boolean;
  semana: number | null;
  items: ItemPrevio[];
  /** Nombres que no hicieron match con ningun alias */
  desconocidos: string[];
  /** Problemas que impiden registrar alguna linea (meta fuera de rango, etc.) */
  advertencias: string[];
  /** true si esa semana ya esta registrada y viva */
  yaProcesada: boolean;
  totalCobrado: number;
};

export async function listarPersonas(): Promise<Persona[]> {
  return q<Persona>(
    'select id, nombre, alias, es_receptor, activo from multas.personas order by nombre',
  );
}

function buscarPersona(personas: Persona[], normalizado: string): Persona | null {
  for (const p of personas) {
    if (normalizarNombre(p.nombre) === normalizado) return p;
    for (const a of p.alias) if (normalizarNombre(a) === normalizado) return p;
  }
  return null;
}

function evaluarLinea(l: LineaParseada, persona: Persona | null): ItemPrevio {
  const base: ItemPrevio = {
    nombreCrudo: l.nombreCrudo,
    personaId: persona?.id ?? null,
    nombre: persona?.nombre ?? l.nombreCrudo,
    dias: l.dias,
    meta: l.meta,
    monto: 0,
    estado: 'cobrada',
    emoji: l.emojis,
  };

  if (!persona) {
    return { ...base, error: `Nombre no reconocido: "${l.nombreCrudo}". Agregalo como alias antes de registrar.` };
  }

  const calc = calcularMulta(l.dias, l.meta);
  if (!calc.ok) return { ...base, error: calc.error };

  // Cualquier emoji que no sea check = excusa aceptada por el grupo => no se cobra,
  // pero queda registrada como exenta.
  if (l.esExcusa) return { ...base, monto: 0, estado: 'exenta' };

  return { ...base, monto: calc.monto, estado: 'cobrada' };
}

export async function analizarMensaje(texto: string): Promise<Analisis> {
  const parsed = parsearMensaje(texto);
  if (!parsed.esResumen) {
    return { esResumen: false, semana: null, items: [], desconocidos: [], advertencias: [], yaProcesada: false, totalCobrado: 0 };
  }

  const personas = (await listarPersonas()).filter((p) => !p.es_receptor);
  const items = parsed.lineas.map((l) => evaluarLinea(l, buscarPersona(personas, l.nombreNormalizado)));

  const desconocidos = items.filter((i) => i.personaId === null).map((i) => i.nombreCrudo);

  // Dos lineas del mensaje que apuntan a la MISMA persona (nombre repetido, o dos
  // alias distintos de la misma persona). No adivinamos cual vale: se reporta y se bloquea.
  const porPersona = new Map<number, ItemPrevio[]>();
  for (const i of items) {
    if (i.personaId === null) continue;
    const previos = porPersona.get(i.personaId) ?? [];
    previos.push(i);
    porPersona.set(i.personaId, previos);
  }
  for (const repetidos of porPersona.values()) {
    if (repetidos.length < 2) continue;
    const comoSeEscribio = repetidos.map((r) => `\u00ab${r.nombreCrudo}\u00bb`).join(' y ');
    for (const r of repetidos) {
      r.error = `${comoSeEscribio} son la misma persona (${r.nombre}). ` +
        `Deja una sola linea, o corrige los alias en Ajustes.`;
    }
  }

  const advertencias = items
    .filter((i) => i.error && i.personaId !== null)
    .map((i) => `${i.nombre}: ${i.error}`)
    .filter((m, k, todos) => todos.indexOf(m) === k);

  let yaProcesada = false;
  if (parsed.semana !== null) {
    const r = await q<{ id: number }>(
      "select id from multas.semanas where numero = $1 and estado = 'procesada'",
      [parsed.semana],
    );
    yaProcesada = r.length > 0;
  }

  const totalCobrado = items.reduce((s, i) => s + (i.error ? 0 : i.monto), 0);

  return { esResumen: true, semana: parsed.semana, items, desconocidos, advertencias, yaProcesada, totalCobrado };
}

export type ResultadoRegistro =
  | { ok: true; semanaId: number; semana: number; analisis: Analisis }
  | { ok: false; motivo: 'no_es_resumen' | 'sin_numero' | 'ya_procesada' | 'errores'; analisis: Analisis; detalle?: string };

/**
 * Registra una semana completa de forma atomica e idempotente.
 * El indice unico parcial (numero) where estado='procesada' garantiza que dos
 * mensajes simultaneos no puedan crear la misma semana dos veces.
 */
export async function registrarSemana(
  texto: string,
  autor: string,
  opciones: { fechaCierre?: string; ignorarDesconocidos?: boolean } = {},
): Promise<ResultadoRegistro> {
  const analisis = await analizarMensaje(texto);

  if (!analisis.esResumen) return { ok: false, motivo: 'no_es_resumen', analisis };
  if (analisis.semana === null) return { ok: false, motivo: 'sin_numero', analisis };
  if (analisis.yaProcesada) return { ok: false, motivo: 'ya_procesada', analisis };

  const conError = analisis.items.filter((i) => i.error);
  const bloquean = opciones.ignorarDesconocidos
    ? conError.filter((i) => i.personaId !== null) // metas invalidas siempre bloquean
    : conError;
  if (bloquean.length > 0) {
    return {
      ok: false,
      motivo: 'errores',
      analisis,
      detalle: [...new Set(bloquean.map((i) => i.error))].join(' | '),
    };
  }

  const fecha = opciones.fechaCierre ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  try {
    const semanaId = await tx(async (c: PoolClient) => {
      const ins = await c.query<{ id: number }>(
        `insert into multas.semanas (numero, fecha_cierre, texto_original, procesada_por)
         values ($1,$2,$3,$4) returning id`,
        [analisis.semana, fecha, texto, autor],
      );
      const id = ins.rows[0].id;

      for (const i of analisis.items) {
        if (i.personaId === null) continue; // desconocido, se reporta aparte
        await c.query(
          `insert into multas.multas (semana_id, persona_id, dias_cumplidos, meta, monto, estado, emoji, motivo)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [id, i.personaId, i.dias, i.meta, i.monto, i.estado, i.emoji || null,
           i.estado === 'exenta' ? `Exento por excusa (${i.emoji})` : null],
        );
      }

      for (const n of analisis.desconocidos) {
        await c.query(
          'insert into multas.pendientes_mapeo (nombre, semana_numero) values ($1,$2)',
          [n, analisis.semana],
        );
      }

      await bitacora(c, 'semana_procesada', autor, {
        semana: analisis.semana,
        multas: analisis.items.length,
        total: analisis.totalCobrado,
        desconocidos: analisis.desconocidos,
      });
      return id;
    });

    return { ok: true, semanaId, semana: analisis.semana, analisis };
  } catch (e: any) {
    // Solo el indice de la semana significa "ya estaba registrada" (carrera: otro
    // proceso la inserto entre el analisis y el insert). Cualquier otra violacion de
    // unicidad es un problema distinto y se reporta como tal, no se disfraza.
    if (e?.code === '23505' && e?.constraint === 'semanas_numero_viva') {
      return { ok: false, motivo: 'ya_procesada', analisis };
    }
    if (e?.code === '23505' && e?.constraint === 'multas_semana_persona') {
      return {
        ok: false, motivo: 'errores', analisis,
        detalle: 'El mensaje trae dos lineas para la misma persona. Deja una sola y vuelve a intentar.',
      };
    }
    throw e;
  }
}

export async function anularSemana(numero: number, autor: string, motivo: string): Promise<boolean> {
  return tx(async (c) => {
    const r = await c.query<{ id: number }>(
      "select id from multas.semanas where numero=$1 and estado='procesada' for update",
      [numero],
    );
    if (r.rowCount === 0) return false;
    const id = r.rows[0].id;
    await c.query("update multas.multas set estado='anulada' where semana_id=$1", [id]);
    await c.query(
      "update multas.semanas set estado='anulada', anulada_por=$2, anulada_en=now(), motivo_anulacion=$3 where id=$1",
      [id, autor, motivo],
    );
    await bitacora(c, 'semana_anulada', autor, { semana: numero, motivo });
    return true;
  });
}

export async function editarMulta(
  multaId: number,
  autor: string,
  cambios: { dias?: number; estado?: 'cobrada' | 'exenta' | 'anulada'; motivo?: string },
): Promise<{ ok: boolean; error?: string }> {
  return tx(async (c) => {
    const r = await c.query<any>(
      `select m.*, p.nombre from multas.multas m join multas.personas p on p.id=m.persona_id
       where m.id=$1 for update`, [multaId]);
    if (r.rowCount === 0) return { ok: false, error: 'Multa no encontrada' };
    const actual = r.rows[0];

    const dias = cambios.dias ?? actual.dias_cumplidos;
    const estado = cambios.estado ?? actual.estado;

    let monto = 0;
    if (estado === 'cobrada') {
      const calc = calcularMulta(dias, actual.meta);
      if (!calc.ok) return { ok: false, error: calc.error };
      monto = calc.monto;
    }

    await c.query(
      'update multas.multas set dias_cumplidos=$2, estado=$3, monto=$4, motivo=$5 where id=$1',
      [multaId, dias, estado, monto, cambios.motivo ?? actual.motivo],
    );
    await bitacora(c, 'multa_editada', autor, {
      multaId, persona: actual.nombre,
      antes: { dias: actual.dias_cumplidos, estado: actual.estado, monto: actual.monto },
      despues: { dias, estado, monto }, motivo: cambios.motivo ?? null,
    });
    return { ok: true };
  });
}

export async function registrarAbono(
  personaId: number, monto: number, fecha: string, nota: string | null, autor: string,
): Promise<void> {
  await tx(async (c) => {
    await c.query(
      'insert into multas.abonos (persona_id, monto, fecha, nota, tipo, registrado_por) values ($1,$2,$3,$4,$5,$6)',
      [personaId, Math.round(monto), fecha, nota, 'abono', autor],
    );
    const p = await c.query<{ nombre: string }>('select nombre from multas.personas where id=$1', [personaId]);
    await bitacora(c, 'abono_registrado', autor, { persona: p.rows[0]?.nombre, monto, fecha, nota });
  });
}

export async function fijarSaldoInicial(personaId: number, monto: number, autor: string): Promise<void> {
  await tx(async (c) => {
    await c.query(
      "update multas.abonos set estado='anulado' where persona_id=$1 and tipo='saldo_inicial' and estado='activo'",
      [personaId],
    );
    if (Math.round(monto) !== 0) {
      await c.query(
        `insert into multas.abonos (persona_id, monto, fecha, nota, tipo, registrado_por)
         values ($1,$2,(now() at time zone 'America/Bogota')::date,$3,'saldo_inicial',$4)`,
        [personaId, Math.round(monto), 'Saldo inicial migrado de Splitwise', autor],
      );
    }
    const p = await c.query<{ nombre: string }>('select nombre from multas.personas where id=$1', [personaId]);
    await bitacora(c, 'saldo_inicial_fijado', autor, { persona: p.rows[0]?.nombre, monto });
  });
}

export type Saldo = {
  id: number; nombre: string; activo: boolean; es_receptor: boolean;
  saldo_inicial: number; total_multas: number; total_abonos: number; saldo: number;
};

export async function saldos(): Promise<Saldo[]> {
  return q<Saldo>(
    'select * from multas.saldos where es_receptor = false order by saldo desc, nombre',
  );
}
