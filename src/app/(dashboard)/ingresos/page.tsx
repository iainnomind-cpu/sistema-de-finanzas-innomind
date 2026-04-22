'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import IncomeForm from '@/components/income/IncomeForm';
import type { Income } from '@/lib/types/database';
import { formatMXN, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils/format';
import { DollarSign, Plus, TrendingUp, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PIE_COLORS = ['#2186C4', '#0EA5B9', '#10B981', '#F59E0B', '#8B5CF6'];

export default function IngresosPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | null>(null);
  const [period, setPeriod] = useState('this');

  const fetchIncomes = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    let startDate: string, endDate: string;

    if (period === 'this') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (period === 'last') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('income')
      .select('*, client:clients(id, name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) toast('Error cargando ingresos', 'error');
    else setIncomes((data as Income[]) || []);
    setLoading(false);
  }, [supabase, toast, period]);

  useEffect(() => { fetchIncomes(); }, [period]);

  async function handleDelete(id: string) {
    const { error } = await supabase.from('income').delete().eq('id', id);
    if (error) toast(`Error: ${error.message}`, 'error');
    else { toast('Ingreso eliminado', 'success'); fetchIncomes(); }
  }

  const totalMonth = incomes.reduce((s, i) => s + i.amount, 0);

  // Composition by category
  const byCategory = incomes.reduce((acc, i) => {
    const cat = getStatusLabel(i.category);
    acc[cat] = (acc[cat] || 0) + i.amount;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Ingresos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{incomes.length} ingreso{incomes.length !== 1 ? 's' : ''} en el periodo</p>
        </div>
        <button onClick={() => { setEditIncome(null); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm">
          <Plus size={16} /> Registrar Ingreso
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 kpi-card">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3"><DollarSign size={18} /></div>
          <p className="text-2xl font-bold text-brand-900">{formatMXN(totalMonth)}</p>
          <p className="text-xs text-gray-500 mt-1">Total del Periodo</p>
        </div>
        <div className="glass-card rounded-2xl p-5 kpi-card">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3"><ArrowUpRight size={18} /></div>
          <p className="text-2xl font-bold text-brand-900">{incomes.filter(i => i.status === 'cobrado').length}</p>
          <p className="text-xs text-gray-500 mt-1">Cobrados (Distribuidos)</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">Composición</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={80}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value" strokeWidth={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatMXN(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-gray-400 py-6 text-center">Sin datos</p>}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Detalle</h2>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600">
            <option value="this">Este mes</option>
            <option value="last">Mes anterior</option>
            <option value="3m">Últimos 3 meses</option>
          </select>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(n => <div key={n} className="h-12 skeleton rounded-lg" />)}</div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-16"><DollarSign size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">Sin ingresos en este periodo</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Fecha</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Concepto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden lg:table-cell">Categoría</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Monto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Estado</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inc.date)}</td>
                    <td className="px-6 py-3 text-sm font-medium text-brand-900">{inc.concept}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">{(inc as any).client?.name || '—'}</td>
                    <td className="px-6 py-3 hidden lg:table-cell"><span className="text-xs px-2 py-0.5 rounded-lg bg-brand-50 text-brand-700">{getStatusLabel(inc.category)}</span></td>
                    <td className="px-6 py-3 text-right">
                      <p className="text-sm font-semibold text-emerald-600">{formatMXN(inc.amount)}</p>
                      {inc.has_invoice && <p className="text-[10px] text-gray-400 mt-0.5" title="Monto cobrado con IVA">Total: {formatMXN(inc.total_amount_with_iva || 0)}</p>}
                    </td>
                    <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${inc.status === 'cobrado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inc.status === 'cobrado' ? 'Cobrado (Distribuido)' : 'Pendiente'}</span></td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditIncome(inc); setShowForm(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(inc.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <IncomeForm open={showForm} onClose={() => { setShowForm(false); setEditIncome(null); }} onSaved={fetchIncomes} editIncome={editIncome} />
    </div>
  );
}
