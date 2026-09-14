'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, PlusCircle, CalendarDays, Wallet, ScrollText } from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Resumen', Icono: Flame },
  { href: '/procesar', label: 'Procesar', Icono: PlusCircle },
  { href: '/semanas', label: 'Semanas', Icono: CalendarDays },
  { href: '/abonos', label: 'Abonos', Icono: Wallet },
  { href: '/bitacora', label: 'Bitácora', Icono: ScrollText },
];

export default function Barra() {
  const path = usePathname();
  if (path === '/login') return null;
  return (
    <nav className="barra" aria-label="Secciones">
      {ITEMS.map(({ href, label, Icono }) => {
        const activo = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link
            key={href} href={href}
            className={'barra__i' + (activo ? ' barra__i--on' : '')}
            aria-current={activo ? 'page' : undefined}
          >
            <Icono size={24} strokeWidth={activo ? 2.4 : 2} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
