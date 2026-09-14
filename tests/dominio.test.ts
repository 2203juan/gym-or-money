import { describe, it, expect } from 'vitest';
import { calcularMulta, TABLA_MULTAS, formatoCOP } from '../src/lib/multas';
import { parsearMensaje, limpiarEmojis, normalizarNombre } from '../src/lib/parser';

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

describe('tablas de multas', () => {
  it('coinciden literalmente con el documento', () => {
    expect(TABLA_MULTAS[7][1]).toBe(64167);
    expect(TABLA_MULTAS[7][4]).toBe(46667);
    expect(TABLA_MULTAS[5][1]).toBe(61250);
    expect(TABLA_MULTAS[4][2]).toBe(46000);
  });
  it('multa base y faltar un dia', () => {
    for (let meta = 1; meta <= 7; meta++) {
      expect(calcularMulta(0, meta)).toEqual({ ok: true, monto: 70000 });
      expect(calcularMulta(meta, meta)).toEqual({ ok: true, monto: 0 });
      if (meta >= 2) expect(calcularMulta(meta - 1, meta)).toEqual({ ok: true, monto: 35000 });
    }
  });
  it('cumplir de mas no genera credito', () => {
    expect(calcularMulta(4, 3)).toEqual({ ok: true, monto: 0 });
    expect(calcularMulta(9, 1)).toEqual({ ok: true, monto: 0 });
  });
  it('CA4: meta de 8 no genera multa, genera advertencia', () => {
    const r = calcularMulta(2, 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/fuera del rango/i);
  });
  it('formato COP', () => {
    expect(formatoCOP(58000)).toBe('$58.000');
    expect(formatoCOP(0)).toBe('$0');
    expect(formatoCOP(1234567)).toBe('$1.234.567');
  });
});

describe('parser', () => {
  it('lee el numero de semana y las 9 lineas', () => {
    const p = parsearMensaje(SEMANA_32);
    expect(p.esResumen).toBe(true);
    if (!p.esResumen) return;
    expect(p.semana).toBe(32);
    expect(p.lineas).toHaveLength(9);
  });

  it('CA1: montos exactos de la Semana 32', () => {
    const p = parsearMensaje(SEMANA_32);
    if (!p.esResumen) throw new Error('debe ser resumen');
    const montos: Record<string, number> = {};
    for (const l of p.lineas) {
      const c = calcularMulta(l.dias, l.meta);
      if (!c.ok) throw new Error(c.error);
      montos[l.nombreCrudo] = l.esExcusa ? 0 : c.monto;
    }
    expect(montos).toEqual({
      'Naranjo': 0, 'Hoyos': 35000, 'Betan': 70000, 'Yummy': 42000, // tabla meta 6, 4 dias (el doc decia 52.500; se confirmo que manda la tabla)
      'Juanbol': 0, 'Juan Marcos': 35000, 'Lucho': 0, 'Will': 0, 'Jorge': 0,
    });
  });

  it('el check NO es excusa, ni siquiera con selector de variacion', () => {
    const p = parsearMensaje('Semana 1\nJuanbol: 4/3 ✅️\nWill: 3/3 ✔');
    if (!p.esResumen) throw new Error();
    expect(p.lineas[0].esExcusa).toBe(false);
    expect(p.lineas[0].tieneCheck).toBe(true);
    expect(p.lineas[1].esExcusa).toBe(false);
  });

  it('CA3: otro emoji si es excusa', () => {
    const p = parsearMensaje('Semana 33\nBetan: 0/3 \u{1F912}');
    if (!p.esResumen) throw new Error();
    expect(p.lineas[0].esExcusa).toBe(true);
  });

  it('espaciado flexible, tildes y nombres con espacios', () => {
    const p = parsearMensaje('SEMANA #7\nJuan Marcos :  1 / 2\nBetán:2/3');
    if (!p.esResumen) throw new Error();
    expect(p.semana).toBe(7);
    expect(p.lineas[0].nombreCrudo).toBe('Juan Marcos');
    expect(p.lineas[0].dias).toBe(1);
    expect(normalizarNombre(p.lineas[1].nombreCrudo)).toBe('betan');
  });

  it('mensajes que no son el resumen se ignoran', () => {
    expect(parsearMensaje('jajaja que pereza').esResumen).toBe(false);
    expect(parsearMensaje('nos vemos a las 6:30').esResumen).toBe(false);
    expect(parsearMensaje('').esResumen).toBe(false);
  });

  it('limpia selectores de variacion y ZWJ', () => {
    expect(limpiarEmojis('✅️')).toBe('✅');
    expect(limpiarEmojis('a‍b')).toBe('ab');
  });
});
