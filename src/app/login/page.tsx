import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { listarPersonas } from '@/lib/dominio';
import FormLogin from './form';

export const dynamic = 'force-dynamic';

export default async function Login() {
  if (await usuarioActual()) redirect('/');
  const personas = (await listarPersonas()).filter((p) => !p.es_receptor && p.activo);
  return (
    <>
      <h1>Ejercicio o Money</h1>
      <p className="sub">Entra con la clave del grupo.</p>
      <FormLogin personas={personas.map((p) => p.nombre)} />
    </>
  );
}
