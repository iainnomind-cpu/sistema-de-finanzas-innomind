'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMXN, getStatusLabel } from '@/lib/utils/format';
import { BarChart3, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

export default function PylPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this');
  const [plData, setPlData] = useState({
    incomeByCategory: {} as Record<string, number>,
    expenseByType: {} as Record<string, number>,
    totalIncome: 0,
    totalExpenses: 0,
    grossProfit: 0,
    payroll: 0,
    operatingProfit: 0,
    ivaCollectedPeriod: 0,
    ivaPaidPeriod: 0,
    ivaBalance: 0,
  });
  const [balanceData, setBalanceData] = useState({
    cash: 0,
    receivables: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    equity: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    let startDate: string, endDate: string;

    if (period === 'this') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (period === 'last') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    }

    // Income for P&L period
    const { data: incData } = await supabase.from('income').select('amount, category').gte('date', startDate).lte('date', endDate);
    const incomeByCategory: Record<string, number> = {};
    let totalIncome = 0;
    (incData || []).forEach(i => {
      const cat = getStatusLabel(i.category);
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + i.amount;
      totalIncome += i.amount;
    });

    // Expenses for P&L period
    const { data: expData } = await supabase.from('expenses').select('amount, type').gte('date', startDate).lte('date', endDate);
    const expenseByType: Record<string, number> = {};
    let totalExpenses = 0;
    let payroll = 0;
    (expData || []).forEach(e => {
      const typ = getStatusLabel(e.type);
      expenseByType[typ] = (expenseByType[typ] || 0) + e.amount;
      totalExpenses += e.amount;
      if (e.type === 'nomina') payroll += e.amount;
    });

    const grossProfit = totalIncome - (totalExpenses - payroll);
    const operatingProfit = totalIncome - totalExpenses;

    // IVA position
    const { data: ivaMovs } = await supabase.from('iva_movements').select('type, amount, created_at').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
    let ivaCollectedPeriod = 0;
    let ivaPaidPeriod = 0;
    (ivaMovs || []).forEach(m => {
      if (m.type === 'collected') ivaCollectedPeriod += m.amount;
      if (m.type === 'paid_to_sat') ivaPaidPeriod += m.amount;
    });
    const { data: ivaBal } = await supabase.from('iva_balance').select('balance').single();

    setPlData({ incomeByCategory, expenseByType, totalIncome, totalExpenses, grossProfit, payroll, operatingProfit, ivaCollectedPeriod, ivaPaidPeriod, ivaBalance: ivaBal?.balance || 0 });

    // Balance general (all-time)
    const { data: allInc } = await supabase.from('income').select('amount').eq('status', 'en_cuenta');
    const { data: allExp } = await supabase.from('expenses').select('amount');
    const { data: cxcData } = await supabase.from('receivables').select('amount').in('status', ['pendiente', 'parcial']);
    const { data: salaryDebt } = await supabase.from('partners').select('monthly_salary');

    const cash = (allInc || []).reduce((s, i) => s + i.amount, 0) - (allExp || []).reduce((s, e) => s + e.amount, 0);
    const receivables = (cxcData || []).reduce((s, r) => s + r.amount, 0);
    const totalAssets = cash + receivables;
    const totalLiabilities = 0; // No formal liabilities tracked yet
    const equity = totalAssets - totalLiabilities;

    setBalanceData({ cash, receivables, totalAssets, totalLiabilities, equity });
    setLoading(false);
  }, [supabase, period]);

  useEffect(() => { loadData(); }, [period]);

  const profitMargin = plData.totalIncome > 0 ? (plData.operatingProfit / plData.totalIncome * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">P&L y Balance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estado de resultados y balance general</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-200">
          <option value="this">Este mes</option>
          <option value="last">Mes anterior</option>
          <option value="quarter">Último trimestre</option>
          <option value="year">Año completo</option>
        </select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 kpi-card">
          <TrendingUp size={18} className="text-emerald-500 mb-2" />
          <p className="text-xl font-bold text-emerald-600">{formatMXN(plData.totalIncome)}</p>
          <p className="text-xs text-gray-500">Ingresos</p>
        </div>
        <div className="glass-card rounded-2xl p-4 kpi-card">
          <TrendingDown size={18} className="text-red-500 mb-2" />
          <p className="text-xl font-bold text-red-600">{formatMXN(plData.totalExpenses)}</p>
          <p className="text-xs text-gray-500">Gastos</p>
        </div>
        <div className="glass-card rounded-2xl p-4 kpi-card">
          <BarChart3 size={18} className="text-brand-500 mb-2" />
          <p className={`text-xl font-bold ${plData.operatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMXN(plData.operatingProfit)}</p>
          <p className="text-xs text-gray-500">Utilidad Neta</p>
        </div>
        <div className="glass-card rounded-2xl p-4 kpi-card">
          <Minus size={18} className="text-brand-500 mb-2" />
          <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{profitMargin.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Margen</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-brand-900 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Estado de Resultados</h2>
          {loading ? <div className="space-y-3">{[1,2,3,4,5].map(n => <div key={n} className="h-8 skeleton rounded" />)}</div> : (
            <div className="space-y-1">
              {/* Income section */}
              <div className="bg-emerald-50/50 rounded-xl p-4 mb-2">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Ingresos</p>
                {Object.entries(plData.incomeByCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between py-1.5 text-sm"><span className="text-gray-600">{cat}</span><span className="font-medium text-gray-800">{formatMXN(amount)}</span></div>
                ))}
                {Object.keys(plData.incomeByCategory).length === 0 && <p className="text-xs text-gray-400">Sin ingresos en el periodo</p>}
                <div className="flex justify-between py-2 mt-2 border-t border-emerald-200 text-sm font-bold">
                  <span className="text-emerald-700">Total Ingresos</span><span className="text-emerald-700">{formatMXN(plData.totalIncome)}</span>
                </div>
              </div>

              {/* Expenses section */}
              <div className="bg-red-50/50 rounded-xl p-4 mb-2">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Gastos</p>
                {Object.entries(plData.expenseByType).map(([typ, amount]) => (
                  <div key={typ} className="flex justify-between py-1.5 text-sm"><span className="text-gray-600">{typ}</span><span className="font-medium text-gray-800">{formatMXN(amount)}</span></div>
                ))}
                {Object.keys(plData.expenseByType).length === 0 && <p className="text-xs text-gray-400">Sin gastos en el periodo</p>}
                <div className="flex justify-between py-2 mt-2 border-t border-red-200 text-sm font-bold">
                  <span className="text-red-700">Total Gastos</span><span className="text-red-700">{formatMXN(plData.totalExpenses)}</span>
                </div>
              </div>

              {/* Result */}
              <div className={`rounded-xl p-4 ${plData.operatingProfit >= 0 ? 'bg-brand-50 border border-brand-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex justify-between text-base font-bold">
                  <span className={plData.operatingProfit >= 0 ? 'text-brand-900' : 'text-red-700'}>Utilidad Neta</span>
                  <span className={plData.operatingProfit >= 0 ? 'text-brand-900' : 'text-red-700'}>{formatMXN(plData.operatingProfit)}</span>
                </div>
              </div>

              {/* Posición fiscal de IVA */}
              <div className="bg-amber-50/50 rounded-xl p-4 mt-4 border border-amber-100">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Posición fiscal de IVA (Informativo)</p>
                <div className="flex justify-between py-1 text-sm"><span className="text-gray-600">IVA cobrado (periodo)</span><span className="font-medium text-emerald-600">+{formatMXN(plData.ivaCollectedPeriod)}</span></div>
                <div className="flex justify-between py-1 text-sm"><span className="text-gray-600">IVA pagado (periodo)</span><span className="font-medium text-amber-600">-{formatMXN(plData.ivaPaidPeriod)}</span></div>
                <div className="flex justify-between py-2 mt-2 border-t border-amber-200 text-sm font-bold">
                  <span className="text-amber-900">Saldo IVA Pendiente (Total)</span><span className="text-amber-700">{formatMXN(plData.ivaBalance)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-brand-900 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Balance General</h2>
          {loading ? <div className="space-y-3">{[1,2,3].map(n => <div key={n} className="h-8 skeleton rounded" />)}</div> : (
            <div className="space-y-1">
              {/* Assets */}
              <div className="bg-blue-50/50 rounded-xl p-4 mb-2">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Activos</p>
                <div className="flex justify-between py-1.5 text-sm"><span className="text-gray-600">Efectivo en cuenta</span><span className="font-medium">{formatMXN(balanceData.cash)}</span></div>
                <div className="flex justify-between py-1.5 text-sm"><span className="text-gray-600">Cuentas por cobrar</span><span className="font-medium">{formatMXN(balanceData.receivables)}</span></div>
                <div className="flex justify-between py-2 mt-2 border-t border-blue-200 text-sm font-bold">
                  <span className="text-blue-700">Total Activos</span><span className="text-blue-700">{formatMXN(balanceData.totalAssets)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className={`rounded-xl p-4 ${balanceData.equity >= 0 ? 'bg-brand-50 border border-brand-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: balanceData.equity >= 0 ? '#1a3a5c' : '#b91c1c' }}>Capital / Patrimonio</p>
                <div className="flex justify-between py-1.5 text-sm"><span className="text-gray-600">Capital de los socios</span><span className="font-medium">{formatMXN(balanceData.equity)}</span></div>
                <div className="flex justify-between py-2 mt-2 border-t text-sm font-bold" style={{ borderColor: balanceData.equity >= 0 ? '#c8d6e5' : '#fca5a5' }}>
                  <span>Patrimonio Neto</span><span className={balanceData.equity >= 0 ? 'text-brand-900' : 'text-red-700'}>{formatMXN(balanceData.equity)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
