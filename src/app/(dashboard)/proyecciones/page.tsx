'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatMXN } from '@/lib/utils/format';
import { TrendingUp, Settings, Target, Users, DollarSign, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ScenarioConfig {
  monthlyIncome: number;
  growthRate: number;
  fixedExpenses: number;
  months: number;
}

export default function ProyeccionesPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [avgIncome, setAvgIncome] = useState(0);
  const [avgExpenses, setAvgExpenses] = useState(0);
  const [projectionMonths, setProjectionMonths] = useState(12);

  const [scenarios, setScenarios] = useState({
    conservador: { monthlyIncome: 0, growthRate: 0, fixedExpenses: 0, months: 12 },
    base: { monthlyIncome: 0, growthRate: 5, fixedExpenses: 0, months: 12 },
    optimista: { monthlyIncome: 0, growthRate: 15, fixedExpenses: 0, months: 12 },
  });

  const [chartData, setChartData] = useState<any[]>([]);

  const loadRealData = useCallback(async () => {
    setLoading(true);
    const { data: inc } = await supabase.from('income').select('date, amount').eq('status', 'en_cuenta');
    const { data: exp } = await supabase.from('expenses').select('date, amount');

    const totalInc = (inc || []).reduce((s, i) => s + i.amount, 0);
    const totalExp = (exp || []).reduce((s, e) => s + e.amount, 0);
    const balance = totalInc - totalExp;
    setCurrentBalance(balance);

    // Calculate monthly averages
    const incMonths = new Set((inc || []).map(i => i.date.substring(0, 7))).size || 1;
    const expMonths = new Set((exp || []).map(e => e.date.substring(0, 7))).size || 1;
    const mInc = totalInc / incMonths;
    const mExp = totalExp / expMonths;
    setAvgIncome(mInc);
    setAvgExpenses(mExp);

    setScenarios({
      conservador: { monthlyIncome: mInc * 0.7, growthRate: 0, fixedExpenses: mExp, months: projectionMonths },
      base: { monthlyIncome: mInc, growthRate: 5, fixedExpenses: mExp, months: projectionMonths },
      optimista: { monthlyIncome: mInc * 1.3, growthRate: 15, fixedExpenses: mExp, months: projectionMonths },
    });

    setLoading(false);
  }, [supabase, projectionMonths]);

  useEffect(() => { loadRealData(); }, []);

  // Generate projection data whenever scenarios change
  useEffect(() => {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const now = new Date();
    const data: any[] = [];

    for (let i = 0; i <= projectionMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const point: any = { name: label };

      (['conservador', 'base', 'optimista'] as const).forEach(key => {
        const sc = scenarios[key];
        if (i === 0) {
          point[key] = currentBalance;
        } else {
          const income = sc.monthlyIncome * Math.pow(1 + sc.growthRate / 100, i - 1);
          const prevBalance = data[i - 1]?.[key] || currentBalance;
          point[key] = prevBalance + income - sc.fixedExpenses;
        }
      });

      data.push(point);
    }
    setChartData(data);
  }, [scenarios, currentBalance, projectionMonths]);

  // Calculations
  function calcBreakeven(sc: ScenarioConfig): number {
    return sc.fixedExpenses > 0 ? Math.ceil(sc.fixedExpenses / (sc.monthlyIncome || 1)) : 0;
  }

  function calcProjectsNeeded(sc: ScenarioConfig, avgProjectValue: number): number {
    if (avgProjectValue <= 0) return 0;
    return Math.ceil(sc.fixedExpenses / avgProjectValue);
  }

  function calcHireMonth(sc: ScenarioConfig): string {
    const hireCost = 15000; // Estimated monthly cost for a hire
    let bal = currentBalance;
    for (let i = 1; i <= sc.months; i++) {
      const income = sc.monthlyIncome * Math.pow(1 + sc.growthRate / 100, i - 1);
      bal = bal + income - sc.fixedExpenses;
      if (bal > hireCost * 6) return `Mes ${i}`;
    }
    return 'No viable';
  }

  const scenarioCards = [
    { key: 'conservador' as const, label: 'Conservador', color: 'border-amber-400 bg-amber-50/50', dotColor: '#F59E0B' },
    { key: 'base' as const, label: 'Base', color: 'border-brand-400 bg-brand-50/50', dotColor: '#2186C4' },
    { key: 'optimista' as const, label: 'Optimista', color: 'border-emerald-400 bg-emerald-50/50', dotColor: '#10B981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Proyecciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Simulador con datos reales del negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Proyectar:</span>
          <select value={projectionMonths} onChange={(e) => setProjectionMonths(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-200">
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={18}>18 meses</option>
            <option value={24}>24 meses</option>
          </select>
        </div>
      </div>

      {/* Current state */}
      <div className="glass-card rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-xs text-gray-500">Saldo actual</p><p className="text-lg font-bold text-brand-900">{formatMXN(currentBalance)}</p></div>
          <div><p className="text-xs text-gray-500">Ingreso prom/mes</p><p className="text-lg font-bold text-emerald-600">{formatMXN(avgIncome)}</p></div>
          <div><p className="text-xs text-gray-500">Gasto prom/mes</p><p className="text-lg font-bold text-red-600">{formatMXN(avgExpenses)}</p></div>
          <div><p className="text-xs text-gray-500">Margen mensual</p><p className={`text-lg font-bold ${avgIncome - avgExpenses >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMXN(avgIncome - avgExpenses)}</p></div>
        </div>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {scenarioCards.map((sc, i) => {
          const config = scenarios[sc.key];
          return (
            <div key={sc.key} className={`rounded-2xl border-t-4 ${sc.color} p-5 animate-fade-in`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.dotColor }} />
                <h3 className="text-sm font-bold text-brand-900">{sc.label}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Ingreso/mes</span><span className="font-semibold">{formatMXN(config.monthlyIncome)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Crecimiento</span><span className="font-semibold">{config.growthRate}%</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Gastos fijos</span><span className="font-semibold">{formatMXN(config.fixedExpenses)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500">Punto equilibrio</span>
                  <span className="font-semibold text-brand-700">{calcBreakeven(config)} proy/mes</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Mes contratación</span><span className="font-semibold text-brand-700">{calcHireMonth(config)}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projection chart */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Proyección de Saldo a {projectionMonths} meses</h2>
        {loading ? <div className="h-64 skeleton rounded-xl" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatMXN(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="conservador" stroke="#F59E0B" strokeWidth={2} dot={false} name="Conservador" />
              <Line type="monotone" dataKey="base" stroke="#2186C4" strokeWidth={2.5} dot={false} name="Base" />
              <Line type="monotone" dataKey="optimista" stroke="#10B981" strokeWidth={2} dot={false} name="Optimista" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
