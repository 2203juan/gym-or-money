import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ETIQUETAS: Record<string, string> = {
  semana_procesada: 'Procesó una semana',
  semana_anulada: 'Anuló una semana',
  multa_editada: 'Corrigió una multa',
  abono_registrado: 'Registró un abono',
  saldo_inicial_fijado: 'Fijó un saldo inicial',
  saldo_inicial_migrado: 'Migró los saldos de Splitwise',
  alias_actualizados: 'Actualizó alias',
  telegram_recibido: 'Mensaje recibido por Telegram',
};

function resumir(accion: string, d: any): string {
  if (!d || typeof d !== 'object') return '';
  switch (accion) {
    case 'semana_procesada': return `Semana ${d.semana} · ${d.multas} multas`;
    case 'semana_anulada':   return `Semana ${d.semana} · ${d.motivo ?? 'sin motivo'}`;
    case 'abono_registrado': return `${d.persona} · ${d.monto}`;
    case 'multa_editada':    return `${d.persona} · ${d.antes?.dias}/${d.despues?.dias ?? ''}`;
    case 'telegram_recibido':return `Semana ${d.semana ?? '?'}`;
    case 'saldo_inicial_fijado': return `${d.persona} · ${d.monto}`;
    case 'saldo_inicial_migrado': return `${d.personas} personas · ${d.origen}`;
    case 'alias_actualizados': return (d.alias ?? []).join(', ');
    default: return '';
  }
}

export default async function Bitacora() {
  if (!(await usuarioActual())) redirect('/login');
  const filas = await q<any>(
    `select id, accion, autor, detalle,
            to_char(creado_en at time zone 'America/Bogota', 'DD Mon · HH24:MI') as cuando
     from multas.bitacora order by creado_en desc limit 200`,
  );

  return (
    <>
      <header className="barra">
        <Link href="/">← Saldos</Link>
        <span>Bitácora</span>
      </header>

      <section className="total">
        <p className="total__etiqueta">Registro</p>
        <p className="total__cifra total__cifra--medio">{filas.length}</p>
        <p className="total__pie"><span>Nadie es administrador. Esto es lo que nos mantiene honestos.</span></p>
      </section>

      {filas.map((f: any) => (
        <div className="movimiento" key={f.id}>
          <span>
            <span className="movimiento__t">{ETIQUETAS[f.accion] ?? f.accion}</span>
            <span className="movimiento__d">{f.autor}{resumir(f.accion, f.detalle) ? ` · ${resumir(f.accion, f.detalle)}` : ''}</span>
          </span>
          <span className="tenue" style={{ whiteSpace: 'nowrap' }}>{f.cuando}</span>
        </div>
      ))}
      {filas.length === 0 ? <p className="vacio">Sin movimientos todavía.</p> : null}
    </>
  );
}
