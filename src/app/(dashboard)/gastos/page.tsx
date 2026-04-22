'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import type { Expense } from '@/lib/types/database';
import { formatMXN, formatDate, getStatusLabel } from '@/lib/utils/format';
import { Receipt, Plus, Pencil, Trash2, TrendingDown, Upload, ExternalLink, RefreshCw } from 'lucide-react';

export default function GastosPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [filterType, setFilterType] = useState('todos');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: false });

    if (error) toast('Error cargando gastos', 'error');
    else setExpenses((data as Expense[]) || []);
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => { fetchExpenses(); }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast(`Error: ${error.message}`, 'error');
    else { toast('Gasto eliminado', 'success'); fetchExpenses(); }
  }

  const filtered = filterType === 'todos' ? expenses : expenses.filter(e => e.type === filterType);
  const totalMonth = filtered.reduce((s, e) => s + e.amount, 0);

  // Group by type
  const byType = expenses.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const typeCards = [
    { key: 'fijo', label: 'Fijos', icon: RefreshCw, color: 'text-orange-600 bg-orange-100' },
    { key: 'variable', label: 'Variables', icon: TrendingDown, color: 'text-amber-600 bg-amber-100' },
    { key: 'inversion', label: 'Inversiones', icon: Upload, color: 'text-purple-600 bg-purple-100' },
    { key: 'nomina', label: 'Nómina', icon: Receipt, color: 'text-blue-600 bg-blue-100' },
  ];

  const filters = ['todos', 'fijo', 'variable', 'socio', 'inversion', 'nomina'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de gastos fijos, variables e inversiones</p>
        </div>
        <button onClick={() => { setEditExpense(null); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-all shadow-sm">
          <Plus size={16} /> Registrar Gasto
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {typeCards.map((tc, i) => (
          <div key={tc.key} className="glass-card rounded-2xl p-4 kpi-card animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`w-8 h-8 rounded-lg ${tc.color} flex items-center justify-center mb-2`}><tc.icon size={16} /></div>
            <p className="text-lg font-bold text-brand-900">{formatMXN(byType[tc.key] || 0)}</p>
            <p className="text-xs text-gray-500">{tc.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Total: {formatMXN(totalMonth)}</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map(f => (
              <button key={f} onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all
                  ${filterType === f ? 'bg-brand-700 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {f === 'todos' ? 'Todos' : getStatusLabel(f)}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(n => <div key={n} className="h-12 skeleton rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Receipt size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">Sin gastos</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Fecha</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Concepto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Tipo</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Monto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Recurrente</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(exp.date)}</td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-brand-900">{exp.concept}</p>
                      {exp.receipt_url && (
                        <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-brand-500 hover:text-brand-400 mt-0.5">
                          <ExternalLink size={10} /> Comprobante
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-3"><span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 font-medium">{getStatusLabel(exp.type)}</span></td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-red-600">{formatMXN(exp.amount)}</td>
                    <td className="px-6 py-3 hidden md:table-cell">
                      {exp.is_recurring && <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 font-medium">Día {exp.recurring_day}</span>}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditExpense(exp); setShowForm(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ExpenseForm open={showForm} onClose={() => { setShowForm(false); setEditExpense(null); }} onSaved={fetchExpenses} editExpense={editExpense} />
    </div>
  );
}
