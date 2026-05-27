'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
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
  UserPlus,
  LifeBuoy,
} from 'lucide-react';

const allItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
  { href: '/crm', icon: UserPlus, label: 'CRM Leads' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/soporte', icon: LifeBuoy, label: 'Soporte' },
  { href: '/socios', icon: UserCog, label: 'Socios' },
  { href: '/ingresos', icon: DollarSign, label: 'Ingresos' },
  { href: '/gastos', icon: Receipt, label: 'Gastos' },
  { href: '/cxc', icon: FileText, label: 'CxC' },
  { href: '/flujo-caja', icon: Wallet, label: 'Flujo' },
  { href: '/proyecciones', icon: TrendingUp, label: 'Proyecciones' },
  { href: '/pyl', icon: BarChart3, label: 'P&L' },
  { href: '/reportes', icon: FileBarChart, label: 'Reportes' },
  { href: '/metas', icon: Target, label: 'Metas' },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-sidebar-bg z-50 lg:hidden animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Innomind" width={28} height={28} className="rounded" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wider">INNOMIND</span>
              <span className="block text-[10px] text-brand-400 tracking-widest -mt-0.5">FINANCE HUB</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-brand-400 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {allItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-brand-700/60 text-white'
                    : 'text-brand-300 hover:bg-white/8 hover:text-white'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-brand-300' : 'text-brand-500'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
