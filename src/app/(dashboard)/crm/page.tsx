'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Phone, Building, User, Mail, Calendar, Clock, ArrowRight, MoreHorizontal } from 'lucide-react';

type LeadStatus = 'nuevo' | 'contactado' | 'agendado' | 'cotizado' | 'en_negociacion' | 'ganado' | 'perdido';

interface Lead {
  id: string;
  full_name: string;
  company_name: string;
  phone: string;
  industry: string;
  service_of_interest: string;
  status: LeadStatus;
  created_at: string;
  email?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  plan?: string;
}

const SUBSCRIPTION_BADGE: Record<string, { label: string; color: string }> = {
  trialing:     { label: '🟡 En Prueba',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  trial_ending: { label: '🟠 Prueba Termina', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  active:       { label: '🟢 Activo',        color: 'bg-green-100 text-green-700 border-green-200' },
  past_due:     { label: '🔴 Pago Fallido',  color: 'bg-red-100 text-red-700 border-red-200' },
  canceled:     { label: '⚫ Cancelado',      color: 'bg-slate-100 text-slate-500 border-slate-200' },
  none:         { label: '⬜ Sin Pago',       color: 'bg-slate-50 text-slate-400 border-slate-100' },
};

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'nuevo', label: 'Nuevo', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'contactado', label: 'Contactado', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'agendado', label: 'Agendado', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'cotizado', label: 'Cotizado', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'en_negociacion', label: 'En Negociación', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'ganado', label: 'Ganado', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-100 text-red-700 border-red-200' }
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pruebas' | 'cotizaciones'>('pruebas');
  const supabase = createClient();

  useEffect(() => {
    fetchLeads();
    
    // Poll every 10 seconds as a fallback to ensure data is always fresh
    const interval = setInterval(() => {
      fetchLeads(false); // pass false to avoid loading spinner on background refresh
    }, 10000);

    // Subscribe to changes (if Realtime is enabled in Supabase)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, (payload) => {
        fetchLeads(false);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
        console.log("Table crm_leads doesn't exist yet.");
        setLeads([]);
      } else if (data) {
        setLeads(data as Lead[]);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (id: string, newStatus: LeadStatus) => {
    // Optimistic update
    setLeads(current => current.map(lead => 
      lead.id === id ? { ...lead, status: newStatus } : lead
    ));

    const { error } = await supabase
      .from('crm_leads')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      fetchLeads(); // Revert on error
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      updateLeadStatus(leadId, status);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const displayLeads = leads.filter(lead => {
    if (activeTab === 'pruebas') {
      return lead.service_of_interest === 'Trak (Proyectos)' || lead.service_of_interest === 'Corē (ERP/CRM)';
    } else {
      return lead.service_of_interest !== 'Trak (Proyectos)' && lead.service_of_interest !== 'Corē (ERP/CRM)';
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="px-8 py-6 bg-white border-b border-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Solicitudes y Cotizaciones</h1>
            <p className="text-sm text-slate-500 mt-1">Gestiona las solicitudes de demos, cotizaciones y pruebas entrantes desde la página web (Innomind).</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
              {displayLeads.length} Registros en esta vista
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('pruebas')}
            className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'pruebas'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Pruebas Gratuitas (Corē / Trak)
          </button>
          <button
            onClick={() => setActiveTab('cotizaciones')}
            className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'cotizaciones'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Cotizaciones y Demos
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max items-start">
          {COLUMNS.map(column => (
            <div 
              key={column.id}
              className="w-80 flex flex-col h-full max-h-[calc(100vh-12rem)] bg-slate-100 rounded-xl border border-slate-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-slate-100/80 rounded-t-xl sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-700">{column.label}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-500 text-xs font-bold shadow-sm">
                    {displayLeads.filter(l => l.status === column.id).length}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {displayLeads.filter(l => l.status === column.id).map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab hover:shadow-md hover:border-indigo-300 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${column.color}`}>
                          {column.label}
                        </div>
                        {lead.subscription_status && lead.subscription_status !== 'none' && (() => {
                          const badge = SUBSCRIPTION_BADGE[lead.subscription_status];
                          return badge ? (
                            <div className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}>
                              {badge.label}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      {lead.full_name}
                    </h4>
                    
                    <div className="space-y-1.5 mb-4">
                      <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded-full mb-1">
                        {lead.service_of_interest}
                      </div>
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <Building size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{lead.company_name} <span className="text-xs text-slate-400">({lead.industry})</span></span>
                      </div>
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={12} />
                        {formatDate(lead.created_at)}
                      </div>
                      
                      {/* Action buttons for mobile / quick move */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <select 
                          className="text-xs border-slate-200 rounded text-slate-600 py-1 pl-2 pr-6 cursor-pointer hover:bg-slate-50"
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        >
                          {COLUMNS.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                
                {displayLeads.filter(l => l.status === column.id).length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-400">
                    Arrastra aquí
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
