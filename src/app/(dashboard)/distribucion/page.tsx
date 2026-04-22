'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatMXN, formatDate } from '@/lib/utils/format';
import { Settings, Wallet, TrendingUp, Briefcase, Landmark, ShieldCheck, History } from 'lucide-react';
import ConfigModal from '@/components/distribution/ConfigModal';
import WithdrawalModal from '@/components/distribution/WithdrawalModal';
import type { DistributionConfig, DistributionEvent, BucketBalance } from '@/lib/types/database';

const BUCKET_META: Record<string, { label: string, icon: any, color: string, bg: string }> = {
  salary: { label: 'Sueldos', icon: Briefcase, color: 'text-brand-600', bg: 'bg-brand-100' },
  opex: { label: 'Operación', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
  reserve: { label: 'Fondo', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  profit: { label: 'Utilidad', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
  tax: { label: 'Impuestos', icon: Landmark, color: 'text-rose-600', bg: 'bg-rose-100' },
};

export default function DistribucionPage() {
  const supabase = createClient();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<DistributionConfig | null>(null);
  const [balances, setBalances] = useState<BucketBalance[]>([]);
  const [events, setEvents] = useState<DistributionEvent[]>([]);
  
  const [showConfig, setShowConfig] = useState(false);
  const [withdrawBucket, setWithdrawBucket] = useState<BucketBalance | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Config
    const { data: confData } = await supabase
      .from('distribution_config')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (confData) setConfig(confData);

    // 2. Get Balances
    const { data: balData } = await supabase
      .from('bucket_balances')
      .select('*')
      .eq('user_id', user.id);
    
    if (balData) {
      // Sort in specific order
      const order = ['salary', 'opex', 'reserve', 'profit', 'tax'];
      balData.sort((a, b) => order.indexOf(a.bucket_name) - order.indexOf(b.bucket_name));
      setBalances(balData as BucketBalance[]);
    }

    // 3. Get Events
    const { data: evtData } = await supabase
      .from('distribution_events')
      .select('*, income:income(concept)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (evtData) setEvents(evtData as DistributionEvent[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reserve Goal Progress
  const reserveBalance = balances.find(b => b.bucket_name === 'reserve')?.balance || 0;
  const reserveGoal = config?.reserve_goal || 1;
  const progressPct = Math.min(100, Math.round((reserveBalance / reserveGoal) * 100));
  
  let progressColor = 'bg-amber-400';
  if (progressPct >= 100) progressColor = 'bg-emerald-500';
  else if (progressPct >= 50) progressColor = 'bg-blue-500';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Distribución</h1>
          <p className="text-sm text-gray-500 mt-0.5">Asignación automática de ingresos (Profit First)</p>
        </div>
        <button onClick={() => setShowConfig(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-all shadow-sm border border-brand-200">
          <Settings size={16} /> Configurar Porcentajes
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(n => <div key={n} className="h-32 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Buckets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {balances.map(b => {
              const meta = BUCKET_META[b.bucket_name] || BUCKET_META.salary;
              const Icon = meta.icon;
              const pctConfig = config ? config[`bucket_${b.bucket_name}` as keyof DistributionConfig] : 0;

              return (
                <div key={b.id} className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} ${meta.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{pctConfig}%</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">{meta.label}</h3>
                    <p className="text-2xl font-bold text-brand-900 mt-1">{formatMXN(b.balance)}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Acum. {formatMXN(b.total_in)}</p>
                  </div>
                  <button 
                    onClick={() => setWithdrawBucket(b)}
                    className="w-full mt-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-brand-600 rounded-lg transition-colors"
                  >
                    Retirar
                  </button>
                </div>
              );
            })}
          </div>

          {/* Reserve Progress */}
          {config && (
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Meta de Fondo de Reserva
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Acumula 3 meses de gastos fijos para operar tranquilo.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-900">{formatMXN(reserveBalance)} <span className="text-gray-400 font-medium">/ {formatMXN(config.reserve_goal)}</span></p>
                  <p className={`text-xs font-bold ${progressPct === 100 ? 'text-emerald-600' : 'text-brand-600'}`}>{progressPct}%</p>
                </div>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${progressColor} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {progressPct >= 100 && (
                <p className="text-xs text-emerald-600 mt-3 font-medium bg-emerald-50 inline-block px-3 py-1.5 rounded-lg border border-emerald-100">
                  🎉 ¡Felicidades! Has alcanzado tu meta de reserva. Considera redirigir este porcentaje a Utilidad o Sueldos.
                </p>
              )}
            </div>
          )}

          {/* History */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <History size={18} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Historial de Distribuciones</h2>
            </div>
            
            {events.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Aún no hay distribuciones</p>
                <p className="text-xs text-gray-400 mt-1">Los ingresos cobrados aparecerán aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Fecha</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Ingreso Origen</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Sueldos</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden sm:table-cell">Operación</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden sm:table-cell">Reserva</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Utilidad</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Impuestos</th>
                      <th className="text-right text-xs font-bold text-brand-700 uppercase px-6 py-3">Total Disp.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-600">{formatDate(evt.created_at)}</td>
                        <td className="px-6 py-3 text-sm font-medium text-brand-900 truncate max-w-[150px]">
                          {(evt as any).income?.concept || 'Ingreso'}
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600">{formatMXN(evt.amount_salary)}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600 hidden sm:table-cell">{formatMXN(evt.amount_opex)}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600 hidden sm:table-cell">{formatMXN(evt.amount_reserve)}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600 hidden md:table-cell">{formatMXN(evt.amount_profit)}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600 hidden md:table-cell">{formatMXN(evt.amount_tax)}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-emerald-600">{formatMXN(evt.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ConfigModal open={showConfig} onClose={() => setShowConfig(false)} onSaved={fetchData} />
      <WithdrawalModal open={!!withdrawBucket} onClose={() => setWithdrawBucket(null)} onSaved={fetchData} bucket={withdrawBucket} />
    </div>
  );
}
