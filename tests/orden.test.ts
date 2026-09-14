import { describe, it, expect } from 'vitest';
import { barajarConSemilla } from '../src/lib/orden';
import { discoDeMulta } from '../src/lib/discos';

const NOMBRES = ['Naranjo','Hoyos','Betán','Yummy','Juanbol','Juan Marcos','Lucho','Will','Jorge'];

describe('barajado sembrado por semana', () => {
  it('la misma semana siempre da el mismo orden', () => {
    expect(barajarConSemilla(NOMBRES, 32)).toEqual(barajarConSemilla(NOMBRES, 32));
  });
  it('semanas distintas dan ordenes distintos', () => {
    expect(barajarConSemilla(NOMBRES, 32)).not.toEqual(barajarConSemilla(NOMBRES, 33));
  });
  it('no pierde ni duplica a nadie', () => {
    const r = barajarConSemilla(NOMBRES, 32);
    expect(r).toHaveLength(NOMBRES.length);
    expect([...r].sort()).toEqual([...NOMBRES].sort());
  });
  it('no muta la lista original', () => {
    const copia = [...NOMBRES];
    barajarConSemilla(NOMBRES, 7);
    expect(NOMBRES).toEqual(copia);
  });
  it('de verdad baraja: no devuelve el mismo orden de entrada', () => {
    // con 9 elementos, que coincida exacto seria 1 en 362.880
    expect(barajarConSemilla(NOMBRES, 32)).not.toEqual(NOMBRES);
  });
  it('aguanta listas vacias y de un solo elemento', () => {
    expect(barajarConSemilla([], 32)).toEqual([]);
    expect(barajarConSemilla(['Solo'], 0)).toEqual(['Solo']);
  });
});

describe('codigo de discos', () => {
  it('asigna el disco segun el peso de la multa', () => {
    expect(discoDeMulta(70000)).toBe('p25');
    expect(discoDeMulta(63000)).toBe('p20');
    expect(discoDeMulta(50000)).toBe('p20');
    expect(discoDeMulta(46000)).toBe('p15');
    expect(discoDeMulta(40833)).toBe('p15');
    expect(discoDeMulta(35000)).toBe('p10');
  });
  it('sin multa no lleva canto', () => {
    expect(discoDeMulta(0)).toBe('ninguno');
    expect(discoDeMulta(70000, 'exenta')).toBe('ninguno');
    expect(discoDeMulta(70000, 'anulada')).toBe('ninguno');
  });
});
