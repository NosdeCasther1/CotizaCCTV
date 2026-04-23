'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Calculator, 
  Tags, 
  Truck, 
  Settings, 
  Menu, 
  X, 
  LayoutDashboard,
  Package,
  ShieldCheck,
  FileText,
  BarChart3
} from 'lucide-react';

// Centralizamos las rutas para escalabilidad y control de roles a futuro
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Nueva Cotización', href: '/quotes/new', icon: Calculator },
  { name: 'Historial', href: '/quotes', icon: FileText },
  { name: 'Productos', href: '/catalogs/products', icon: Package },
  { name: 'Marcas', href: '/catalogs/brands', icon: ShieldCheck },
  { name: 'Categorías', href: '/catalogs/categories', icon: Tags },
  { name: 'Proveedores', href: '/catalogs/suppliers', icon: Truck },
  { name: 'Mis Ganancias', href: '/reports/profits', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* --- Topbar Mobile --- */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 sticky top-0 z-50">
        <span className="text-xl font-bold">CotizaCCTV</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- Sidebar Desktop & Mobile --- */}
      <aside
        className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-400 border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo Desktop */}
        <div className="hidden md:flex h-16 items-center justify-center border-b border-slate-800">
          <span className="text-2xl font-bold text-white tracking-wider">CotizaCCTV</span>
        </div>

        {/* Links de Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/quotes' 
              ? pathname === '/quotes' // Exact match for list
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)} // Cierra menú en móvil al hacer clic
                className={`flex items-center gap-3 px-3 py-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-slate-800/50 text-white border-l-4 border-primary rounded-r-lg' 
                    : 'hover:bg-slate-800/50 hover:text-white rounded-lg'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : ''} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Placeholder Perfil de Usuario (Autenticación Futura) */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Edson</span>
              <span className="text-xs text-slate-500">Administrador</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
