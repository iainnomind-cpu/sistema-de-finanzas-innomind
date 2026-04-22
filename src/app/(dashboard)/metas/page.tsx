'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { formatMXN } from '@/lib/utils/format';
import { Target, Bell, AlertTriangle, CheckCircle2, Shield, TrendingUp, FolderKanban, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';

const goalTypes = [
  { value: 'sueldo_objetivo', label: 'Sueldo Objetivo', icon: DollarSign, color: 'bg-emerald-100 text-emerald-700', unit: 'MXN' },
  { value: 'fondo_minimo', label: 'Fondo Mínimo de Reserva', icon: Shield, color: 'bg-brand-100 text-brand-700', unit: 'MXN' },
  { value: 'pct_recurrentes', label: '% Ingresos Recurrentes', icon: TrendingUp, color: 'bg-amber-100 text-amber-700', unit: '%' },
  { value: 'proyectos_minimos', label: 'Proyectos Activos Mínimos', icon: FolderKanban, color: 'bg-blue-100 text-blue-700', unit: '' },
];

export default function MetasPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [formType, setFormType] = useState('sueldo_objetivo');
  const [formTarget, setFormTarget] = useState('');

  // Live metrics
  const [metrics, setMetrics] = useState({
    avgSalary: 0, currentCash: 0, pctRecurring: 0, activeProjects: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);

    // Goals from DB
    const { data: goalsData } = await supabase.from('goals').select('*').eq('is_active', true).order('created_at');
    setGoals(goalsData || []);

    // Calculate live metrics
    const { data: inc } = await supabase.from('income').select('amount, category, status');
    const { data: exp } = await supabase.from('expenses').select('amount');
    const { data: projects } = await supabase.from('projects').select('status');
    const { data: salariesData } = await supabase.from('salaries').select('amount').eq('type', 'sueldo');

    const totalInc = (inc || []).reduce((s, i) => s + i.amount, 0);
    const totalExp = (exp || []).reduce((s, e) => s + e.amount, 0);
    const cash = (inc || []).filter(i => i.status === 'en_cuenta').reduce((s, i) => s + i.amount, 0) - totalExp;
    const recurring = (inc || []).filter(i => i.category === 'mensualidad_recurrente').reduce((s, i) => s + i.amount, 0);
    const pctRec = totalInc > 0 ? (recurring / totalInc * 100) : 0;
    const active = (projects || []).filter(p => p.status === 'activo').length;
    const avgSal = (salariesData || []).length > 0 ? (salariesData || []).reduce((s, sl) => s + sl.amount, 0) / (salariesData || []).length : 0;

    setMetrics({ avgSalary: avgSal, currentCash: cash, pctRecurring: pctRec, activeProjects: active });

    // Build dynamic alerts
    const dynamicAlerts: any[] = [];
    (goalsData || []).forEach((g: any) => {
      const current = getCurrentValue(g.type, { avgSalary: avgSal, currentCash: cash, pctRecurring: pctRec, activeProjects: active });
      if (current < g.target_value) {
        const gt = goalTypes.find(gt => gt.value === g.type);
        dynamicAlerts.push({
          type: 'warning',
          message: `Meta "${gt?.label}" no alcanzada. Actual: ${gt?.unit === 'MXN' ? formatMXN(current) : gt?.unit === '%' ? `${current.toFixed(1)}%` : current} / Objetivo: ${gt?.unit === 'MXN' ? formatMXN(g.target_value) : gt?.unit === '%' ? `${g.target_value}%` : g.target_value}`,
        });
      }
    });

    if (cash < 0) dynamicAlerts.push({ type: 'critical', message: 'Efectivo negativo. El negocio está en números rojos.' });

    // Check CxC vencidas
    const { data: cxcData } = await supabase.from('receivables').select('amount, due_date, status, client:clients(name)')
      .in('status', ['pendiente', 'parcial']);
    const today = new Date();
    (cxcData || []).forEach((r: any) => {
      const days = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000);
      if (days > 30) dynamicAlerts.push({ type: 'warning', message: `CxC vencida ${days}d: ${r.client?.name || 'Cliente'} - ${formatMXN(r.amount)}` });
    });

    setAlerts(dynamicAlerts);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, []);

  function getCurrentValue(type: string, m: typeof metrics): number {
    switch (type) {
      case 'sueldo_objetivo': return m.avgSalary;
      case 'fondo_minimo': return m.currentCash;
      case 'pct_recurrentes': return m.pctRecurring;
      case 'proyectos_minimos': return m.activeProjects;
      default: return 0;
    }
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!formTarget) { toast('Define un objetivo', 'error'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { user_id: user.id, type: formType, target_value: parseFloat(formTarget), is_active: true };

    if (editGoal) {
      await supabase.from('goals').update(payload).eq('id', editGoal.id);
    } else {
      await supabase.from('goals').insert(payload);
    }
    toast(editGoal ? 'Meta actualizada' : 'Meta creada', 'success');
    setShowForm(false); setEditGoal(null); setFormTarget('');
    loadData();
  }

  async function handleDeleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id);
    toast('Meta eliminada', 'success');
    loadData();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Metas y Alertas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Objetivos configurables y alertas del negocio</p>
        </div>
        <button onClick={() => { setEditGoal(null); setFormType('sueldo_objetivo'); setFormTarget(''); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm">
          <Plus size={16} /> Nueva Meta
        </button>
      </div>

      {/* Goals */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3,4].map(n => <div key={n} className="h-40 skeleton rounded-2xl" />)}</div>
      ) : goals.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Target size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay metas configuradas</p>
          <p className="text-xs text-gray-400 mt-1">Crea metas para el negocio y monitorea el progreso</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g, i) => {
            const gt = goalTypes.find(gt => gt.value === g.type);
            const current = getCurrentValue(g.type, metrics);
            const progress = g.target_value > 0 ? Math.min(100, (current / g.target_value) * 100) : 0;
            const achieved = current >= g.target_value;
            const Icon = gt?.icon || Target;

            return (
              <div key={g.id} className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${gt?.color || 'bg-gray-100'} flex items-center justify-center`}><Icon size={20} /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-brand-900">{gt?.label}</h3>
                      <p className="text-xs text-gray-400">
                        Objetivo: {gt?.unit === 'MXN' ? formatMXN(g.target_value) : gt?.unit === '%' ? `${g.target_value}%` : g.target_value}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditGoal(g); setFormType(g.type); setFormTarget(g.target_value.toString()); setShowForm(true); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <span className={`text-xl font-bold ${achieved ? 'text-emerald-600' : 'text-brand-900'}`}>
                    {gt?.unit === 'MXN' ? formatMXN(current) : gt?.unit === '%' ? `${current.toFixed(1)}%` : current}
                  </span>
                  {achieved && <CheckCircle2 size={18} className="text-emerald-500" />}
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full transition-all duration-700 ${achieved ? 'bg-emerald-500' : progress > 60 ? 'bg-brand-500' : progress > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{progress.toFixed(0)}% completado</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Alerts */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-brand-500" />
          <h2 className="text-lg font-semibold text-brand-900">Alertas Activas</h2>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${alerts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {alerts.length}
          </span>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Todo en orden</p>
            <p className="text-xs text-gray-400">No hay alertas activas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-sm animate-fade-in
                ${a.type === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${a.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className={`text-xs leading-relaxed ${a.type === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>{a.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goal Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editGoal ? 'Editar Meta' : 'Nueva Meta'} subtitle="Define un objetivo para el negocio">
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Meta</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} disabled={!!editGoal}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
              {goalTypes.map(gt => <option key={gt.value} value={gt.value}>{gt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Valor Objetivo {goalTypes.find(g => g.value === formType)?.unit && `(${goalTypes.find(g => g.value === formType)?.unit})`}
            </label>
            <input type="number" step="0.01" min="0" value={formTarget} onChange={(e) => setFormTarget(e.target.value)}
              placeholder="Ej: 50000" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm">
              {editGoal ? 'Actualizar' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
