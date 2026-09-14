'use client';
import { useActionState } from 'react';
import { entrar } from '../acciones';

export default function FormLogin({ personas }: { personas: string[] }) {
  const [estado, action, pend] = useActionState(entrar, null);
  return (
    <form action={action} className="card">
      <label htmlFor="nombre">¿Quién eres?</label>
      <select id="nombre" name="nombre" defaultValue="">
        <option value="" disabled>Elige tu nombre…</option>
        {personas.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <label htmlFor="clave">Clave del grupo</label>
      <input id="clave" name="clave" type="password" autoComplete="current-password" />
      {estado?.error ? <div className="alert bad">{estado.error}</div> : null}
      <button disabled={pend}>{pend ? 'Entrando…' : 'Entrar'}</button>
      <p className="muted" style={{ marginTop: 14 }}>
        Tu nombre queda registrado en la bitácora junto a cada acción que hagas.
      </p>
    </form>
  );
}
