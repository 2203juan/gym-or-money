'use client';
import { useActionState } from 'react';
import { guardarSaldosIniciales, guardarAlias } from '../acciones';

type P = { id: number; nombre: string; alias: string[]; inicial: number };

export default function FormConfig({ personas, pendientes }:
  { personas: P[]; pendientes: { id: number; nombre: string; semana_numero: number }[] }) {
  const [estS, accS, pendS] = useActionState(guardarSaldosIniciales, null);
  const [estA, accA, pendA] = useActionState(guardarAlias, null);

  return (
    <>
      {pendientes.length ? (
        <div className="alert warn">
          <strong>Nombres sin mapear</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {pendientes.map((p) => (
              <li key={p.id}>«{p.nombre}» (semana {p.semana_numero})</li>
            ))}
          </ul>
          Agrégalos abajo como alias de la persona correcta.
        </div>
      ) : null}

      <h2>Saldos iniciales (migración de Splitwise)</h2>
      <p className="sub">
        Lo que cada uno ya debía antes de esta app. Se guarda como un movimiento explícito
        «Saldo inicial migrado de Splitwise», no como un número suelto. Guardar de nuevo reemplaza el anterior.
      </p>
      <form action={accS} className="card">
        {personas.map((p) => (
          <div key={p.id} className="split">
            <div>
              <label htmlFor={`saldo_${p.id}`}>{p.nombre}</label>
              <input id={`saldo_${p.id}`} name={`saldo_${p.id}`} inputMode="numeric"
                defaultValue={p.inicial || ''} placeholder="0" />
            </div>
          </div>
        ))}
        {estS?.error ? <div className="alert bad">{estS.error}</div> : null}
        {estS?.ok ? <div className="alert ok">{estS.ok}</div> : null}
        <button disabled={pendS}>{pendS ? 'Guardando…' : 'Guardar saldos iniciales'}</button>
      </form>

      <h2>Alias por persona</h2>
      <p className="sub">Separados por coma. Sirven para que el parser reconozca las distintas formas en que se escribe cada nombre.</p>
      {personas.map((p) => (
        <form action={accA} key={p.id} className="card">
          <input type="hidden" name="personaId" value={p.id} />
          <label htmlFor={`alias_${p.id}`}>{p.nombre}</label>
          <div className="split">
            <input id={`alias_${p.id}`} name="alias" defaultValue={p.alias.join(', ')} />
            <button className="ghost small" disabled={pendA} style={{ marginTop: 0 }}>Guardar</button>
          </div>
        </form>
      ))}
      {estA?.ok ? <div className="alert ok">{estA.ok}</div> : null}
      {estA?.error ? <div className="alert bad">{estA.error}</div> : null}
    </>
  );
}
