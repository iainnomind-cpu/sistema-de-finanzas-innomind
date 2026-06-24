'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  DollarSign,
  Receipt,
  FileText,
  Wallet,
  TrendingUp,
  BarChart3,
  FileBarChart,
  Target,
  UserCog,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Landmark,
  UserPlus,
  LifeBuoy,
} from 'lucide-react';
import { useState } from 'react';

const menuGroups = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
      { href: '/crm', icon: UserPlus, label: 'Solicitudes' },
      { href: '/clientes', icon: Users, label: 'Clientes' },
      { href: '/soporte', icon: LifeBuoy, label: 'Soporte' },
      { href: '/socios', icon: UserCog, label: 'Socios y Nómina' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/ingresos', icon: DollarSign, label: 'Ingresos' },
      { href: '/distribucion', icon: PieChart, label: 'Distribución' },
      { href: '/iva', icon: Landmark, label: 'Gestión de IVA' },
      { href: '/gastos', icon: Receipt, label: 'Gastos' },
      { href: '/cxc', icon: FileText, label: 'Cuentas por Cobrar' },
      { href: '/flujo-caja', icon: Wallet, label: 'Flujo de Caja' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { href: '/proyecciones', icon: TrendingUp, label: 'Proyecciones' },
      { href: '/pyl', icon: BarChart3, label: 'P&L y Balance' },
      { href: '/reportes', icon: FileBarChart, label: 'Reportes' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/metas', icon: Target, label: 'Metas y Alertas' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        bg-sidebar-bg text-sidebar-text`}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          <Image src="/logo.png" alt="Innomind" width={28} height={28} className="rounded" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <span className="text-sm font-bold text-white tracking-wider">INNOMIND</span>
            <span className="block text-[10px] text-brand-400 tracking-widest -mt-0.5">FINANCE HUB</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200 group relative
                      ${isActive
                        ? 'bg-brand-700/60 text-white sidebar-link-active'
                        : 'text-brand-300 hover:bg-white/8 hover:text-white'
                      }`}
                  >
                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-brand-300' : 'text-brand-500 group-hover:text-brand-300'
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-soft" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm
            text-brand-400 hover:text-white hover:bg-white/8 transition-all"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
