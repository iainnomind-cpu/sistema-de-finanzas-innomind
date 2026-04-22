'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import type { Receivable } from '@/lib/types/database';
import { formatMXN, formatDate } from '@/lib/utils/format';
import { FileText, CheckCircle2, AlertTriangle, Clock, DollarSign } from 'lucide-react';

export default function CxCPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('todas');

  const fetchReceivables = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('receivables')
      .select('*, client:clients(id, name), project:projects(id, name)')
      .order('due_date', { ascending: true });

    if (error) toast('Error cargando CxC', 'error');
    else {
      // Calculate days overdue
      const today = new Date();
      const enriched = (data || []).map((r: any) => {
        const dueDate = new Date(r.due_date);
        const daysOverdue = r.status === 'pendiente' || r.status === 'parcial'
          ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        return { ...r, days_overdue: daysOverdue };
      });
      setReceivables(enriched as Receivable[]);
    }
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => { fetchReceivables(); }, []);

  async function handleCollect(receivable: Receivable) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create income
    await supabase.from('income').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      amount: receivable.amount,
      concept: `Cobro CxC - ${(receivable as any).project?.name || 'Proyecto'}`,
      category: 'saldo_proyecto',
      client_id: receivable.client_id,
      project_id: receivable.project_id,
      payment_method: 'transferencia',
      status: 'en_cuenta',
    });

    // Close CxC
    await supabase.from('receivables').update({ status: 'cobrada' }).eq('id', receivable.id);

    // If project exists, update balance_paid
    if (receivable.project_id) {
      await supabase.from('projects').update({ balance_paid: true }).eq('id', receivable.project_id);
    }

    toast('CxC cobrada. Ingreso generado automáticamente.', 'success');
    fetchReceivables();
  }

  const pending = receivables.filter(r => r.status === 'pendiente' || r.status === 'parcial');
  const totalPending = pending.reduce((s, r) => s + r.amount - (r.partial_amount || 0), 0);

  // Aging buckets
  const aging = [
    { label: '0-15 días', min: 0, max: 15, color: 'border-emerald-400 bg-emerald-50' },
    { label: '16-30 días', min: 16, max: 30, color: 'border-amber-400 bg-amber-50' },
    { label: '31-60 días', min: 31, max: 60, color: 'border-orange-400 bg-orange-50' },
    { label: '60+ días', min: 61, max: 9999, color: 'border-red-400 bg-red-50' },
  ].map(bucket => {
    const items = pending.filter(r => r.days_overdue >= bucket.min && r.days_overdue <= bucket.max);
    return { ...bucket, count: items.length, amount: items.reduce((s, r) => s + r.amount, 0) };
  });

  const filtered = filterStatus === 'todas' ? receivables :
    filterStatus === 'vencidas' ? receivables.filter(r => r.days_overdue > 0 && r.status === 'pendiente') :
    receivables.filter(r => r.status === filterStatus);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Cuentas por Cobrar</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-card rounded-xl px-4 py-2">
          <p className="text-xs text-gray-500">Total Pendiente</p>
          <p className="text-lg font-bold text-amber-600">{formatMXN(totalPending)}</p>
        </div>
      </div>

      {/* Aging */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {aging.map((b, i) => (
          <div key={b.label} className={`rounded-2xl border-l-4 ${b.color} p-5 animate-fade-in`} style={{ animationDelay: `${i * 0.1}s` }}>
            <p className="text-xs font-semibold text-gray-500 uppercase">{b.label}</p>
            <p className="text-2xl font-bold text-brand-900 mt-2">{b.count}</p>
            <p className="text-sm text-gray-500">{formatMXN(b.amount)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Detalle de CxC</h2>
          <div className="flex gap-1.5">
            {['todas', 'pendiente', 'parcial', 'vencidas', 'cobrada'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all
                  ${filterStatus === f ? 'bg-brand-700 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {f === 'todas' ? 'Todas' : f === 'vencidas' ? 'Vencidas' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(n => <div key={n} className="h-12 skeleton rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-3" /><p className="text-sm text-gray-500">Sin cuentas por cobrar</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Proyecto</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Monto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Vencimiento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Días</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Estado</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const isOverdue = r.days_overdue > 0 && r.status === 'pendiente';
                  return (
                    <tr key={r.id} className={`transition-colors ${isOverdue ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                      <td className="px-6 py-3 text-sm font-medium text-brand-900">{(r as any).client?.name || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">{(r as any).project?.name || '—'}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-brand-900">{formatMXN(r.amount)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{formatDate(r.due_date)}</td>
                      <td className="px-6 py-3">
                        {r.status === 'cobrada' ? (
                          <span className="text-xs text-emerald-600">—</span>
                        ) : r.days_overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <AlertTriangle size={12} /> {r.days_overdue}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> Al día</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium
                          ${r.status === 'cobrada' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'parcial' ? 'bg-orange-100 text-orange-700' :
                            isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status === 'cobrada' ? 'Cobrada' : isOverdue ? 'Vencida' : r.status === 'parcial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {(r.status === 'pendiente' || r.status === 'parcial') && (
                          <button onClick={() => handleCollect(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm">
                            <DollarSign size={12} /> Cobrar
                          </button>
                        )}
                      </td>
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
