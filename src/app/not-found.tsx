import Link from 'next/link';
export default function NoEncontrado() {
  return (
    <>
      <div className="titular"><div><h1>No encontrado</h1>
        <p className="titular__v">Esa página no existe</p></div></div>
      <Link href="/" className="boton">Volver al resumen</Link>
    </>
  );
}
