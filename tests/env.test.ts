import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env, envObligatorio } from '../src/lib/env';

const ORIG = { ...process.env };
beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { process.env = { ...ORIG }; vi.restoreAllMocks(); });

describe('lectura de variables de entorno', () => {
  it('quita comillas dobles envolventes (el caso del panel de Vercel)', () => {
    process.env.X_PRUEBA = '"8865123:AAbbCC"';
    expect(env('X_PRUEBA')).toBe('8865123:AAbbCC');
  });
  it('quita comillas simples y espacios', () => {
    process.env.X_PRUEBA = "  'secreto123'  ";
    expect(env('X_PRUEBA')).toBe('secreto123');
  });
  it('no toca comillas interiores', () => {
    process.env.X_PRUEBA = 'pass"con"comillas';
    expect(env('X_PRUEBA')).toBe('pass"con"comillas');
  });
  it('una comilla sola no se considera envolvente', () => {
    process.env.X_PRUEBA = '"solo-al-inicio';
    expect(env('X_PRUEBA')).toBe('"solo-al-inicio');
  });
  it('vacio o solo comillas cuenta como ausente', () => {
    process.env.X_PRUEBA = '""';
    expect(env('X_PRUEBA')).toBeUndefined();
    process.env.X_PRUEBA = '   ';
    expect(env('X_PRUEBA')).toBeUndefined();
  });
  it('ausente es undefined y envObligatorio lanza con el nombre', () => {
    delete process.env.X_PRUEBA;
    expect(env('X_PRUEBA')).toBeUndefined();
    expect(() => envObligatorio('X_PRUEBA')).toThrow(/X_PRUEBA/);
  });
  it('avisa en el log cuando tuvo que limpiar', () => {
    process.env.X_AVISO = '"con-comillas"';
    env('X_AVISO');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('X_AVISO'));
  });
});
