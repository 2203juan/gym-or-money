'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Saldos' },
  { href: '/procesar', label: 'Procesar' },
  { href: '/semanas', label: 'Semanas' },
  { href: '/abonos', label: 'Abonos' },
  { href: '/bitacora', label: 'Bitácora' },
];

export default function Nav() {
  const path = usePathname();
  if (path === '/login') return null;
  return (
    <nav className="nav" aria-label="Secciones">
      {ITEMS.map((i) => {
        const activo = i.href === '/' ? path === '/' : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={'nav__i' + (activo ? ' nav__i--on' : '')}
            aria-current={activo ? 'page' : undefined}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
