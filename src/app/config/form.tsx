'use client';
import { useActionState } from 'react';
import { guardarSaldosIniciales, guardarAlias } from '../acciones';

type P = { id: number; nombre: string; alias: string[]; inicial: number };

export default function FormConfig({ personas, pendientes }:
  { personas: P[]; pendientes: { id: number; nombre: string; semana_numero: number }[] }) {
  const [estS, guardarSaldos, pendS] = useActionState(guardarSaldosIniciales, null);
  const [estA, guardarAliasAcc, pendA] = useActionState(guardarAlias, null);

  return (
    <>
      {pendientes.length ? (
        <div className="aviso aviso--ojo">
          <strong>Nombres sin mapear</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {pendientes.map((p) => <li key={p.id}>«{p.nombre}» · semana {p.semana_numero}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="grupo">
        <div className="grupo__h"><h2>Saldos iniciales</h2></div>
        <p className="tenue" style={{ margin: 0, padding: '0 4px' }}>
          Lo que cada uno ya debía antes de esta app. Queda como movimiento explícito
          «Saldo inicial migrado de Splitwise». Guardar de nuevo reemplaza el anterior.
        </p>
        <form action={guardarSaldos} className="forma">
          <div className="tarjeta tarjeta--lista">
            {personas.map((p) => (
              <div className="fila" key={p.id}>
                <label className="fila__n fila__nm" htmlFor={`saldo_${p.id}`}>{p.nombre}</label>
                <input
                  id={`saldo_${p.id}`} name={`saldo_${p.id}`} inputMode="numeric"
                  defaultValue={p.inicial || ''} placeholder="0"
                  style={{ width: 130, textAlign: 'right', padding: '8px 10px',
                           background: 'var(--card-2)', borderRadius: 9, fontSize: 16 }}
                />
              </div>
            ))}
          </div>
          {estS?.error ? <div className="aviso aviso--malo">{estS.error}</div> : null}
          {estS?.ok ? <div className="aviso aviso--ok">{estS.ok}</div> : null}
          <button className="boton" disabled={pendS}>
            {pendS ? 'Guardando…' : 'Guardar saldos iniciales'}
          </button>
        </form>
      </div>

      <div className="grupo">
        <div className="grupo__h"><h2>Alias</h2></div>
        <p className="tenue" style={{ margin: 0, padding: '0 4px' }}>
          Separados por coma. Sirven para que el parser reconozca las distintas formas en que se
          escribe cada nombre en el grupo.
        </p>
        {personas.map((p) => (
          <form action={guardarAliasAcc} key={p.id} className="campo">
            <input type="hidden" name="personaId" value={p.id} />
            <label className="campo__l" htmlFor={`alias_${p.id}`}>{p.nombre}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input id={`alias_${p.id}`} name="alias" defaultValue={p.alias.join(', ')} />
              <button className="boton boton--sec boton--chico" disabled={pendA}>Guardar</button>
            </div>
          </form>
        ))}
        {estA?.ok ? <div className="aviso aviso--ok">{estA.ok}</div> : null}
        {estA?.error ? <div className="aviso aviso--malo">{estA.error}</div> : null}
      </div>
    </>
  );
}
