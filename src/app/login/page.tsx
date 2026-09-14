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
      <header className="barra"><span>Ejercicio o Money</span><span>Entrar</span></header>
      <section className="total">
        <p className="total__etiqueta">Multas semanales</p>
        <p className="total__cifra total__cifra--medio">Ejercicio<br />o Money</p>
      </section>
      <FormLogin personas={personas.map((p) => p.nombre)} />
    </>
  );
}
