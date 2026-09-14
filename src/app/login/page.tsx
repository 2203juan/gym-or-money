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
      <div className="titular">
        <div>
          <h1>Ejercicio<br />o Money</h1>
          <p className="titular__v">Multas semanales del grupo</p>
        </div>
      </div>
      <FormLogin personas={personas.map((p) => p.nombre)} />
    </>
  );
}
