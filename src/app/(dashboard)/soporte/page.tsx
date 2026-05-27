'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search, Filter, AlertCircle, Clock, CheckCircle2, XCircle,
  Bug, HelpCircle, Lightbulb, MoreHorizontal, ChevronRight,
  User, Building, Phone, Send, MessageSquare, ArrowLeft,
  Loader2, StickyNote, Eye
} from 'lucide-react';

type TicketStatus = 'abierto' | 'en_progreso' | 'en_espera' | 'resuelto' | 'cerrado';
type TicketPriority = 'baja' | 'media' | 'alta' | 'urgente';
type TicketCategory = 'bug' | 'duda' | 'mejora' | 'otro';

interface SupportTicket {
  id: string;
  ticket_number: number;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  user_email: string;
  user_name: string;
  company_name: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_email: string;
  sender_name: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  abierto: { label: 'Abierto', color: 'text-blue-700', bg: 'bg-blue-100' },
  en_progreso: { label: 'En Progreso', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  en_espera: { label: 'En Espera', color: 'text-orange-700', bg: 'bg-orange-100' },
  resuelto: { label: 'Resuelto', color: 'text-green-700', bg: 'bg-green-100' },
  cerrado: { label: 'Cerrado', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; color: string }> = {
  baja: { label: 'Baja', dot: 'bg-gray-400', color: 'text-gray-500' },
  media: { label: 'Media', dot: 'bg-blue-500', color: 'text-blue-600' },
  alta: { label: 'Alta', dot: 'bg-orange-500', color: 'text-orange-600' },
  urgente: { label: 'Urgente', dot: 'bg-red-500', color: 'text-red-600' },
};

const CATEGORY_ICON: Record<string, any> = {
  bug: Bug,
  duda: HelpCircle,
  mejora: Lightbulb,
  otro: MoreHorizontal,
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Error / Bug',
  duda: 'Pregunta',
  mejora: 'Sugerencia',
  otro: 'Otro',
};

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('support-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, (payload) => {
        if (selectedTicket && payload.new && (payload.new as any).ticket_id === selectedTicket.id) {
          setMessages(prev => [...prev, payload.new as TicketMessage]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTickets((data as SupportTicket[]) || []);
    setLoading(false);
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages((data as TicketMessage[]) || []);
    setLoadingMessages(false);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'resuelto') updates.resolved_at = new Date().toISOString();
    await supabase.from('support_tickets').update(updates).eq('id', ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    if (selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);
    const { data } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_email: 'soporte@innomind.com',
      sender_name: 'Equipo Innomind',
      message: newMessage.trim(),
      is_internal_note: isInternalNote,
    }).select();
    if (data && data[0]) {
      setMessages(prev => [...prev, data[0] as TicketMessage]);
      setNewMessage('');
    }
    // If replying, auto-set status to en_progreso
    if (!isInternalNote && selectedTicket.status === 'abierto') {
      await updateTicketStatus(selectedTicket.id, 'en_progreso');
    }
    setSending(false);
  };

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'todos' && t.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(s) && !t.user_name.toLowerCase().includes(s) && !t.user_email.toLowerCase().includes(s) && !`#${t.ticket_number}`.includes(s)) return false;
    }
    return true;
  });

  const openCount = tickets.filter(t => t.status === 'abierto').length;
  const progressCount = tickets.filter(t => t.status === 'en_progreso').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgente' && !['resuelto', 'cerrado'].includes(t.status)).length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Detail view
  if (selectedTicket) {
    const statusCfg = STATUS_CONFIG[selectedTicket.status];
    const priorityCfg = PRIORITY_CONFIG[selectedTicket.priority];

    return (
      <div className="flex flex-col h-full bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="px-8 py-5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-gray-400">#{selectedTicket.ticket_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
                <div className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} /><span className={`text-[10px] font-bold ${priorityCfg.color}`}>{priorityCfg.label}</span></div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">{CATEGORY_LABELS[selectedTicket.category]}</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate">{selectedTicket.subject}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Reportado por <strong className="text-gray-600">{selectedTicket.user_name}</strong> ({selectedTicket.user_email}) · {formatDate(selectedTicket.created_at)}
              </p>
            </div>
            <select
              value={selectedTicket.status}
              onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value as TicketStatus)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 font-semibold cursor-pointer"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {/* Original report */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{(selectedTicket.user_name || 'U')[0].toUpperCase()}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">{selectedTicket.user_name}</span>
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">Cliente</span>
                <span className="text-xs text-gray-400">{formatDate(selectedTicket.created_at)}</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl rounded-tl-none p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</div>
            </div>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
          ) : (
            messages.map(msg => {
              const isClient = msg.sender_email !== 'soporte@innomind.com';
              return (
                <div key={msg.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${msg.is_internal_note ? 'bg-amber-100 text-amber-700' : isClient ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-700'}`}>
                    {msg.is_internal_note ? <StickyNote size={14} /> : (msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{msg.sender_name}</span>
                      {msg.is_internal_note && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Nota Interna</span>}
                      {!isClient && !msg.is_internal_note && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Soporte</span>}
                      {isClient && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">Cliente</span>}
                      <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                    </div>
                    <div className={`rounded-xl rounded-tl-none p-4 text-sm leading-relaxed whitespace-pre-wrap ${msg.is_internal_note ? 'bg-amber-50 border border-amber-200 border-dashed text-amber-900' : isClient ? 'bg-blue-50 border border-blue-100 text-gray-700' : 'bg-green-50 border border-green-100 text-gray-700'}`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply input */}
        <div className="border-t border-gray-200 bg-white px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setIsInternalNote(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!isInternalNote ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <MessageSquare size={14} /> Responder al Cliente
            </button>
            <button
              onClick={() => setIsInternalNote(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isInternalNote ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <StickyNote size={14} /> Nota Interna
            </button>
          </div>
          <div className="flex gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isInternalNote ? 'Escribe una nota interna (no visible para el cliente)...' : 'Escribe tu respuesta al cliente...'}
              rows={2}
              className={`flex-1 px-4 py-3 border rounded-xl text-sm outline-none resize-none ${isInternalNote ? 'border-amber-200 focus:ring-2 focus:ring-amber-400 bg-amber-50/30' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className={`px-5 rounded-xl font-semibold text-white transition-all self-end py-3 ${newMessage.trim() && !sending ? (isInternalNote ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700') : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Soporte</h1>
            <p className="text-sm text-slate-500 mt-1">Gestiona los reportes y solicitudes de tus usuarios.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 pt-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{tickets.length}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">Total</div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{openCount}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">Abiertos</div>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{progressCount}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">En Progreso</div>
          </div>
          <div className={`bg-white rounded-xl border p-4 ${urgentCount > 0 ? 'border-red-300 animate-pulse' : 'border-gray-200'}`}>
            <div className={`text-2xl font-bold ${urgentCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{urgentCount}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">Urgentes</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 pt-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Buscar por asunto, usuario o # ticket..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white font-medium cursor-pointer">
            <option value="todos">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white font-medium cursor-pointer">
            <option value="todos">Toda prioridad</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Ticket table */}
      <div className="flex-1 px-8 py-4 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="font-semibold text-gray-700">Sin tickets</h3>
            <p className="text-sm text-gray-500 mt-1">No hay tickets que coincidan con tus filtros.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Asunto</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Prioridad</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(ticket => {
                  const sCfg = STATUS_CONFIG[ticket.status];
                  const pCfg = PRIORITY_CONFIG[ticket.priority];
                  const CatIcon = CATEGORY_ICON[ticket.category] || MoreHorizontal;
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => openTicket(ticket)}>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">#{ticket.ticket_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900 truncate max-w-xs">{ticket.subject}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 font-medium">{ticket.user_name}</div>
                        <div className="text-xs text-gray-400">{ticket.user_email}</div>
                      </td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-xs text-gray-500"><CatIcon size={14} />{CATEGORY_LABELS[ticket.category]}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${pCfg.dot}`} /><span className={`text-xs font-bold ${pCfg.color}`}>{pCfg.label}</span></div></td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sCfg.bg} ${sCfg.color}`}>{sCfg.label}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ticket.created_at)}</td>
                      <td className="px-4 py-3 text-center"><Eye size={16} className="text-gray-400 hover:text-indigo-600 transition-colors mx-auto" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
