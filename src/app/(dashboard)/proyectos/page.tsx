'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ProjectForm from '@/components/projects/ProjectForm';
import type { Project } from '@/lib/types/database';
import { formatMXN, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils/format';
import {
  FolderKanban, Plus, Filter, LayoutGrid, List,
  Pencil, Trash2, Calendar, DollarSign, User, CheckCircle2
} from 'lucide-react';

const STATUS_ORDER = ['propuesta', 'activo', 'en_entrega', 'completado', 'cancelado'];
const STATUS_COLORS_BORDER = {
  propuesta: 'border-amber-300',
  activo: 'border-emerald-300',
  en_entrega: 'border-blue-300',
  completado: 'border-green-300',
  cancelado: 'border-red-300',
};
const STATUS_COLORS_BG = {
  propuesta: 'bg-amber-50/50',
  activo: 'bg-emerald-50/50',
  en_entrega: 'bg-blue-50/50',
  completado: 'bg-green-50/50',
  cancelado: 'bg-red-50/50',
};

export default function ProyectosPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*, client:clients(id, name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast('Error cargando proyectos', 'error');
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleDelete(id: string) {
    // Also delete associated CxC
    await supabase.from('receivables').delete().eq('project_id', id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast(`Error: ${error.message}`, 'error');
    } else {
      toast('Proyecto eliminado', 'success');
      fetchProjects();
    }
    setDeleteId(null);
  }

  async function handleMarkPaid(project: Project, type: 'advance' | 'balance') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const amount = type === 'advance' ? project.advance_amount : project.balance_amount;
    const updateField = type === 'advance' ? { advance_paid: true } : { balance_paid: true };

    // Update project
    await supabase.from('projects').update(updateField).eq('id', project.id);

    // Create income entry
    await supabase.from('income').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      amount,
      concept: `${type === 'advance' ? 'Anticipo' : 'Saldo'} - ${project.name}`,
      category: type === 'advance' ? 'anticipo_proyecto' : 'saldo_proyecto',
      client_id: project.client_id,
      project_id: project.id,
      payment_method: 'transferencia',
      status: 'en_cuenta',
    });

    // Close matching CxC
    const { data: cxcList } = await supabase
      .from('receivables')
      .select('*')
      .eq('project_id', project.id)
      .eq('amount', amount)
      .eq('status', 'pendiente')
      .limit(1);

    if (cxcList && cxcList.length > 0) {
      await supabase.from('receivables').update({ status: 'cobrada' }).eq('id', cxcList[0].id);
    }

    toast(`${type === 'advance' ? 'Anticipo' : 'Saldo'} marcado como cobrado. Ingreso y CxC actualizados.`, 'success');
    fetchProjects();
  }

  function openEdit(p: Project) { setEditProject(p); setShowForm(true); }
  function openCreate() { setEditProject(null); setShowForm(true); }

  const filtered = filterStatus === 'todos' ? projects : projects.filter(p => p.status === filterStatus);

  // Group by status for Kanban
  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filtered.filter(p => p.status === status);
    return acc;
  }, {} as Record<string, Project[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} · {formatMXN(projects.reduce((s, p) => s + p.total_amount, 0))} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={`p-2 rounded-md transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('table')} className={`p-2 rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <List size={16} />
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="todos">Todos los estados</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
          </select>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 transition-all shadow-sm">
            <Plus size={16} /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(n => <div key={n} className="h-64 skeleton rounded-2xl" />)}
        </div>
      ) : view === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUS_ORDER.map((status) => (
            <div key={status}
              className={`rounded-2xl border-t-4 ${STATUS_COLORS_BORDER[status as keyof typeof STATUS_COLORS_BORDER]} ${STATUS_COLORS_BG[status as keyof typeof STATUS_COLORS_BG]} p-3 min-h-[300px]`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{getStatusLabel(status)}</h3>
                <span className="text-xs font-bold text-gray-400 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  {grouped[status]?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[status]?.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-brand-900 leading-tight">{p.name}</p>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                        <button onClick={() => openEdit(p)} className="p-1 rounded text-gray-400 hover:text-brand-600"><Pencil size={12} /></button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1 rounded text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{(p as any).client?.name || 'Sin cliente'}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-brand-700">{formatMXN(p.total_amount)}</span>
                      <span className="text-gray-400">{getStatusLabel(p.assigned_partner)}</span>
                    </div>
                    {/* Payment status indicators */}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!p.advance_paid) handleMarkPaid(p, 'advance'); }}
                        className={`flex-1 text-[10px] py-1 rounded-lg text-center font-medium transition-all
                          ${p.advance_paid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer'}`}
                        disabled={p.advance_paid}
                      >
                        {p.advance_paid ? '✓ Anticipo' : '○ Anticipo'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!p.balance_paid) handleMarkPaid(p, 'balance'); }}
                        className={`flex-1 text-[10px] py-1 rounded-lg text-center font-medium transition-all
                          ${p.balance_paid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer'}`}
                        disabled={p.balance_paid}
                      >
                        {p.balance_paid ? '✓ Saldo' : '○ Saldo'}
                      </button>
                    </div>
                  </div>
                ))}
                {(!grouped[status] || grouped[status].length === 0) && (
                  <div className="text-center py-8 opacity-50">
                    <FolderKanban size={24} className="text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Vacío</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Proyecto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Monto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Pagos</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <FolderKanban size={40} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">Sin proyectos</p>
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-brand-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.start_date ? formatDate(p.start_date) : ''} · {p.estimated_months}m</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{(p as any).client?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-lg bg-brand-50 text-brand-700 font-medium">{getStatusLabel(p.type)}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-brand-900">{formatMXN(p.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${p.advance_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                          {p.advance_paid ? '✓ Ant' : '○ Ant'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${p.balance_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                          {p.balance_paid ? '✓ Sal' : '○ Sal'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(p.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <ProjectForm open={showForm} onClose={() => { setShowForm(false); setEditProject(null); }} onSaved={fetchProjects} editProject={editProject} />

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-fade-in">
            <h3 className="text-lg font-semibold text-brand-900 mb-2">¿Eliminar proyecto?</h3>
            <p className="text-sm text-gray-500 mb-6">Se eliminarán también las CxC vinculadas a este proyecto.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 shadow-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
