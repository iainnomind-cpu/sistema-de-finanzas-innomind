'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMXN, formatDate, formatRelativeDate, getStatusLabel } from '@/lib/utils/format';
import {
  DollarSign, FileText, TrendingUp, Shield, Plus, ArrowUpRight,
  ArrowDownRight, AlertTriangle, CheckCircle2, Clock, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DashboardPage() {
  const supabase = createClient();
  const [kpiData, setKpiData] = useState({ cash: 0, cxc: 0, profit: 0, runway: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch all income (cobrado = en_cuenta)
    const { data: allIncome } = await supabase.from('income').select('date, amount, status').eq('status', 'en_cuenta');
    const { data: allExpenses } = await supabase.from('expenses').select('date, amount');
    const { data: pendingCxC } = await supabase.from('receivables').select('amount, due_date, status, client:clients(name), project:projects(name)')
      .in('status', ['pendiente', 'parcial']);

    // KPIs
    const totalIncome = (allIncome || []).reduce((s, i) => s + i.amount, 0);
    const totalExpenses = (allExpenses || []).reduce((s, e) => s + e.amount, 0);
    const cash = totalIncome - totalExpenses;

    const cxcTotal = (pendingCxC || []).reduce((s, r) => s + r.amount, 0);

    // Monthly income/expenses for current month
    const monthIncome = (allIncome || []).filter(i => i.date >= currentMonthStart && i.date <= currentMonthEnd).reduce((s, i) => s + i.amount, 0);
    const monthExpenses = (allExpenses || []).filter(e => e.date >= currentMonthStart && e.date <= currentMonthEnd).reduce((s, e) => s + e.amount, 0);
    const profit = monthIncome - monthExpenses;

    // Runway: how many months can survive with no income
    const avgMonthlyExpense = totalExpenses > 0 ? totalExpenses / Math.max(1, getMonthsSpan(allExpenses || [])) : 0;
    const runway = avgMonthlyExpense > 0 ? Math.floor(Math.max(0, cash) / avgMonthlyExpense) : 99;

    setKpiData({ cash, cxc: cxcTotal, profit, runway: Math.min(runway, 99) });

    // Chart data: last 6 months income vs expenses
    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const mIncome = (allIncome || []).filter(x => x.date >= start && x.date <= end).reduce((s, x) => s + x.amount, 0);
      const mExpense = (allExpenses || []).filter(x => x.date >= start && x.date <= end).reduce((s, x) => s + x.amount, 0);
      const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      months.push({ name: monthNames[d.getMonth()], Ingresos: mIncome, Gastos: mExpense });
    }
    setChartData(months);

    // Recent movements (latest 5 income + expenses combined)
    const { data: recentInc } = await supabase.from('income').select('id, date, amount, concept, created_at').order('created_at', { ascending: false }).limit(5);
    const { data: recentExp } = await supabase.from('expenses').select('id, date, amount, concept, created_at').order('created_at', { ascending: false }).limit(5);
    const combined = [
      ...(recentInc || []).map(i => ({ ...i, type: 'entrada' as const })),
      ...(recentExp || []).map(e => ({ ...e, type: 'salida' as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
    setRecentMovements(combined);

    // Alerts
    const dynamicAlerts: any[] = [];
    if (cash < 0) dynamicAlerts.push({ type: 'critical', message: 'Efectivo negativo. El negocio está en números rojos.' });
    if (profit < 0) dynamicAlerts.push({ type: 'warning', message: `Utilidad del mes negativa: ${formatMXN(profit)}` });

    const today = new Date();
    (pendingCxC || []).forEach((r: any) => {
      const due = new Date(r.due_date);
      const daysOver = Math.floor((today.getTime() - due.getTime()) / (1000*60*60*24));
      if (daysOver > 30) {
        dynamicAlerts.push({ type: 'warning', message: `CxC vencida ${daysOver} días: ${r.client?.name || 'Cliente'} - ${formatMXN(r.amount)}` });
      }
    });
    setAlerts(dynamicAlerts);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadDashboard(); }, []);

  function getMonthsSpan(items: { date: string }[]): number {
    if (items.length === 0) return 1;
    const dates = items.map(i => new Date(i.date));
    const min = Math.min(...dates.map(d => d.getTime()));
    const max = Math.max(...dates.map(d => d.getTime()));
    return Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24 * 30)));
  }

  const kpis = [
    { label: 'Efectivo en Cuenta', value: kpiData.cash, icon: DollarSign, iconBg: 'bg-brand-100 text-brand-700', isCurrency: true },
    { label: 'Cuentas por Cobrar', value: kpiData.cxc, icon: FileText, iconBg: 'bg-amber-100 text-amber-700', isCurrency: true },
    { label: 'Utilidad del Mes', value: kpiData.profit, icon: TrendingUp, iconBg: 'bg-emerald-100 text-emerald-700', isCurrency: true },
    { label: 'Runway', value: kpiData.runway, icon: Shield, iconBg: 'bg-accent-100 text-accent-600', isCurrency: false, suffix: ' meses' },
  ];

  const quickActions = [
    { label: 'Ingreso', href: '/ingresos', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Gasto', href: '/gastos', color: 'bg-red-500 hover:bg-red-600' },
    { label: 'Cobrar CxC', href: '/cxc', color: 'bg-amber-500 hover:bg-amber-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen financiero de Innomind</p>
        </div>
        <div className="flex items-center gap-2">
          {quickActions.map(a => (
            <a key={a.label} href={a.href} className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white ${a.color} transition-all shadow-sm`}>
              <Plus size={12} /> {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(n => <div key={n} className="h-28 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className="glass-card rounded-2xl p-5 kpi-card animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}><kpi.icon size={20} /></div>
                {kpi.isCurrency && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-lg
                    ${kpi.value >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {kpi.value >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold ${kpi.value < 0 ? 'text-red-600' : 'text-brand-900'}`}>
                {kpi.isCurrency ? formatMXN(kpi.value) : `${kpi.value}${kpi.suffix || ''}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-brand-900 mb-1">Ingresos vs Gastos</h2>
          <p className="text-xs text-gray-500 mb-4">Últimos 6 meses</p>
          {loading ? (
            <div className="h-64 skeleton rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatMXN(Number(value))} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Ingresos" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Gastos" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alerts */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-lg font-semibold text-brand-900">Alertas</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Todo en orden</p>
              <p className="text-xs text-gray-400 mt-1">Sin alertas activas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-sm
                  ${a.type === 'critical' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-500" />
            <h2 className="text-lg font-semibold text-brand-900">Últimos Movimientos</h2>
          </div>
          <a href="/flujo-caja" className="text-xs font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
            Ver todos <ArrowUpRight size={12} />
          </a>
        </div>
        {recentMovements.length === 0 ? (
          <div className="text-center py-8">
            <Zap size={32} className="text-brand-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin movimientos recientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                    ${m.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {m.type === 'entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-900">{m.concept}</p>
                    <p className="text-xs text-gray-400">{formatRelativeDate(m.created_at)}</p>
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
