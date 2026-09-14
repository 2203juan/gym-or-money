'use client';
import { useActionState } from 'react';
import { entrar } from '../acciones';

export default function FormLogin({ personas }: { personas: string[] }) {
  const [estado, action, pend] = useActionState(entrar, null);
  return (
    <form action={action} className="forma">
      <div className="campo">
        <label className="campo__l" htmlFor="nombre">¿Quién eres?</label>
        <select id="nombre" name="nombre" defaultValue="">
          <option value="" disabled>Elige tu nombre</option>
          {personas.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="campo">
        <label className="campo__l" htmlFor="clave">Clave del grupo</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" />
      </div>
      {estado?.error ? <div className="aviso aviso--malo">{estado.error}</div> : null}
      <button className="boton" disabled={pend}>{pend ? 'Entrando' : 'Entrar'}</button>
      <p className="tenue">Tu nombre queda en la bitácora junto a cada acción que hagas.</p>
    </form>
  );
}
