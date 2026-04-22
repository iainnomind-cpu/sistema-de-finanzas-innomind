'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatMXN, formatDate, formatRelativeDate } from '@/lib/utils/format';
import { Wallet, ArrowUpRight, ArrowDownRight, Download, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Movement {
  id: string;
  date: string;
  type: 'entrada' | 'salida';
  amount: number;
  concept: string;
  source: string;
}

export default function FlujoCajaPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Get all income and expenses to build the cash flow timeline
    const { data: incomes } = await supabase.from('income')
      .select('id, date, amount, concept, created_at')
      .eq('status', 'en_cuenta')
      .order('date');

    const { data: expenses } = await supabase.from('expenses')
      .select('id, date, amount, concept, created_at')
      .order('date');

    // Build movements timeline
    const allMovements: Movement[] = [
      ...(incomes || []).map(i => ({
        id: i.id, date: i.date, type: 'entrada' as const,
        amount: i.amount, concept: i.concept, source: 'Ingreso',
      })),
      ...(expenses || []).map(e => ({
        id: e.id, date: e.date, type: 'salida' as const,
        amount: e.amount, concept: e.concept, source: 'Gasto',
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setMovements(allMovements);

    // Calculate running balance for chart
    let runningBalance = 0;
    const dailyBalances: Record<string, number> = {};

    allMovements.forEach(m => {
      if (m.type === 'entrada') runningBalance += m.amount;
      else runningBalance -= m.amount;
      dailyBalances[m.date] = runningBalance;
    });

    setBalance(runningBalance);

    // Build chart data (last 30 data points or all if fewer)
    const dates = Object.keys(dailyBalances);
    const chartPoints = dates.slice(-30).map(date => ({
      date: new Date(date + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      Saldo: dailyBalances[date],
    }));
    setChartData(chartPoints);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, []);

  function exportCSV() {
    if (movements.length === 0) { toast('No hay datos para exportar', 'warning'); return; }

    let runningBal = 0;
    const rows = movements.map(m => {
      if (m.type === 'entrada') runningBal += m.amount;
      else runningBal -= m.amount;
      return `${m.date},${m.type},${m.amount},${m.concept.replace(/,/g, ' ')},${runningBal}`;
    });

    const csv = 'Fecha,Tipo,Monto,Concepto,Saldo\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flujo_caja_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV descargado', 'success');
  }

  // Reverse for display (newest first)
  const displayMovements = [...movements].reverse();

  // Summary
  const totalIn = movements.filter(m => m.type === 'entrada').reduce((s, m) => s + m.amount, 0);
  const totalOut = movements.filter(m => m.type === 'salida').reduce((s, m) => s + m.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Flujo de Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro cronológico de movimientos de dinero</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card rounded-xl px-4 py-2">
            <p className="text-xs text-gray-500">Saldo Actual</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{formatMXN(balance)}</p>
          </div>
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-700 border border-brand-200 hover:bg-brand-50 transition-all">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 kpi-card">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2"><ArrowUpRight size={18} /></div>
          <p className="text-xl font-bold text-emerald-600">{formatMXN(totalIn)}</p>
          <p className="text-xs text-gray-500">Total Entradas</p>
        </div>
        <div className="glass-card rounded-2xl p-5 kpi-card">
          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-2"><ArrowDownRight size={18} /></div>
          <p className="text-xl font-bold text-red-600">{formatMXN(totalOut)}</p>
          <p className="text-xs text-gray-500">Total Salidas</p>
        </div>
        <div className="glass-card rounded-2xl p-5 kpi-card">
          <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center mb-2"><Wallet size={18} /></div>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{formatMXN(balance)}</p>
          <p className="text-xs text-gray-500">Saldo Neto</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Saldo Diario</h2>
        {loading ? (
          <div className="h-48 skeleton rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center"><p className="text-sm text-gray-400">Sin datos para graficar</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatMXN(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
              <Line type="monotone" dataKey="Saldo" stroke="#2186C4" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Movements timeline */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Movimientos ({movements.length})</h2>
        {displayMovements.length === 0 ? (
          <div className="text-center py-12"><Zap size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-sm text-gray-500">Sin movimientos</p></div>
        ) : (
          <div className="space-y-1">
            {displayMovements.slice(0, 50).map((m) => (
              <div key={m.id + m.type} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                    ${m.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {m.type === 'entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-900">{m.concept}</p>
                    <p className="text-xs text-gray-400">{formatDate(m.date)} · {m.source}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${m.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {m.type === 'entrada' ? '+' : '-'}{formatMXN(m.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
