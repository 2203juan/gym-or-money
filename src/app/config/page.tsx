import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { listarPersonas } from '@/lib/dominio';
import { q } from '@/lib/db';
import FormConfig from './form';

export const dynamic = 'force-dynamic';

export default async function Config() {
  if (!(await usuarioActual())) redirect('/login');
  const personas = (await listarPersonas()).filter((p) => !p.es_receptor);
  const iniciales = await q<{ persona_id: number; monto: number }>(
    "select persona_id, monto from multas.abonos where tipo='saldo_inicial' and estado='activo'",
  );
  const pendientes = await q<{ id: number; nombre: string; semana_numero: number }>(
    'select id, nombre, semana_numero from multas.pendientes_mapeo where resuelto=false order by id desc',
  );
  const mapa: Record<number, number> = {};
  for (const i of iniciales) mapa[Number(i.persona_id)] = i.monto;

  return (
    <>
      <header className="barra">
        <Link href="/">← Saldos</Link>
        <span>Ajustes</span>
      </header>
      <FormConfig
        personas={personas.map((p) => ({
          id: p.id, nombre: p.nombre, alias: p.alias, inicial: mapa[p.id] ?? 0,
        }))}
        pendientes={pendientes}
      />
    </>
  );
}
