import Link from 'next/link';
export default function NoEncontrado() {
  return (
    <>
      <header className="barra"><Link href="/">← Saldos</Link><span>No encontrado</span></header>
      <section className="total">
        <p className="total__etiqueta">Error</p>
        <p className="total__cifra total__cifra--medio">404</p>
        <p className="total__pie"><span>Esa página no existe.</span></p>
      </section>
    </>
  );
}
