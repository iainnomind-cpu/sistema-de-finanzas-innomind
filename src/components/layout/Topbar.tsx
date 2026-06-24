'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bell, LogOut, Search, User, Menu, X } from 'lucide-react';

interface TopbarProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export default function Topbar({ onMobileMenuToggle, mobileMenuOpen }: TopbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('status', 'nuevo')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setRecentLeads(data);
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Search */}
        <div className={`relative transition-all duration-300 ${showSearch ? 'w-80' : 'w-64'}`}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar proyectos, clientes..."
            onFocus={() => setShowSearch(true)}
            onBlur={() => setShowSearch(false)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-100/80 border border-gray-200/60 text-sm text-gray-700 
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white focus:border-brand-300
              transition-all duration-200 hidden sm:block"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (showUserMenu) setShowUserMenu(false);
            }}
            className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all group"
          >
            <Bell size={19} />
            {recentLeads.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Nuevas Solicitudes</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {recentLeads.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No hay notificaciones nuevas</p>
                  ) : (
                    recentLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setShowNotifications(false);
                          router.push('/crm');
                        }}
                      >
                        <p className="text-sm font-medium text-gray-900">{lead.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.service_of_interest} - {lead.company_name}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button onClick={() => { setShowNotifications(false); router.push('/crm'); }} className="text-xs font-medium text-blue-600 hover:text-blue-700 w-full text-center">
                    Ir al CRM
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">Socio</span>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Mi Cuenta</p>
                  <p className="text-xs text-gray-500">Innomind Finance Hub</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
