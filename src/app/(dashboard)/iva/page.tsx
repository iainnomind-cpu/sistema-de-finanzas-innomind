'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMXN, formatDate } from '@/lib/utils/format';
import { Landmark, ArrowUpRight, ArrowDownRight, AlertTriangle, Info, Calculator } from 'lucide-react';
import PayIvaModal from '@/components/iva/PayIvaModal';
import type { IvaBalance, IvaMovement, IvaConfig } from '@/lib/types/database';

export default function IvaPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<IvaBalance | null>(null);
  const [config, setConfig] = useState<IvaConfig | null>(null);
  const [movements, setMovements] = useState<IvaMovement[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get Balance
    const { data: bData } = await supabase
      .from('iva_balance')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (bData) setBalance(bData as IvaBalance);

    // Get Config
    const { data: cData } = await supabase
      .from('iva_config')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (cData) setConfig(cData as IvaConfig);

    // Get Movements
    const { data: mData } = await supabase
      .from('iva_movements')
      .select('*, income:income(concept)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (mData) setMovements(mData as IvaMovement[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Next declaration alert
  let alertNode = null;
  if (config && balance && balance.balance > 0) {
    const today = new Date();
    const currentDay = today.getDate();
    const decDay = config.declaration_day;
    const daysLeft = decDay - currentDay;
    
    if (daysLeft >= 0 && daysLeft <= config.alert_days_before) {
      alertNode = (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-bold text-amber-800">Próxima declaración en {daysLeft === 0 ? 'hoy' : `${daysLeft} días`}</h3>
            <p className="text-xs text-amber-700 mt-1">
              Recuerda pagar el IVA acumulado de <span className="font-bold">{formatMXN(balance.balance)}</span> al SAT antes del día {decDay}.
            </p>
          </div>
        </div>
      );
    } else if (daysLeft < 0) {
      alertNode = (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-bold text-red-800">Declaración de IVA vencida</h3>
            <p className="text-xs text-red-700 mt-1">
              Han pasado {Math.abs(daysLeft)} días desde tu fecha de declaración (día {decDay}). Registra tu pago de {formatMXN(balance.balance)} lo antes posible.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">IVA Pendiente</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dinero reservado para el pago de impuestos</p>
        </div>
        <button 
          onClick={() => setShowPayModal(true)}
          disabled={!balance || balance.balance <= 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
          <Landmark size={16} /> Registrar Pago al SAT
        </button>
      </div>

      {loading ? (
        <div className="h-48 skeleton rounded-2xl" />
      ) : (
        <>
          {alertNode}

          {/* Main Balance Card */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden border-amber-100">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Landmark size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Landmark size={16} />
                </div>
                <h2 className="text-sm font-semibold text-gray-600">Saldo IVA Acumulado</h2>
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-amber-600 mt-2 tracking-tight">
                {formatMXN(balance?.balance || 0)}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-800 bg-amber-50/50 inline-flex px-3 py-1.5 rounded-lg border border-amber-100">
                <Info size={14} />
                <span>Dinero del SAT en tu cuenta bancaria — no lo uses para operación.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Historial */}
            <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-brand-900">Historial de Movimientos de IVA</h2>
              </div>
              
              {movements.length === 0 ? (
                <div className="text-center py-16">
                  <Calculator size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Aún no hay movimientos de IVA</p>
                  <p className="text-xs text-gray-400 mt-1">Registra un ingreso con factura para ver el desglose aquí.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                      <tr className="border-b border-gray-100">
                        <th className="text-left font-semibold text-gray-500 px-6 py-3">Fecha</th>
                        <th className="text-left font-semibold text-gray-500 px-6 py-3">Concepto</th>
                        <th className="text-left font-semibold text-gray-500 px-6 py-3">Tipo</th>
                        <th className="text-right font-semibold text-gray-500 px-6 py-3">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {movements.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(m.created_at)}</td>
                          <td className="px-6 py-3 font-medium text-brand-900">
                            {m.concept}
                            {m.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{m.notes}</p>}
                          </td>
                          <td className="px-6 py-3">
                            {m.type === 'collected' && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"><ArrowUpRight size={12}/> Cobrado</span>}
                            {m.type === 'paid_to_sat' && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100"><ArrowDownRight size={12}/> Pagado</span>}
                            {m.type === 'adjustment' && <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">Ajuste</span>}
                          </td>
                          <td className={`px-6 py-3 text-right font-bold whitespace-nowrap
                            ${m.type === 'collected' ? 'text-emerald-600' : 
                              m.type === 'paid_to_sat' ? 'text-amber-600' : 'text-gray-900'}`}>
                            {m.type === 'collected' ? '+' : m.type === 'paid_to_sat' ? '-' : ''}{formatMXN(m.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Resumen Total Histórico */}
            <div className="glass-card rounded-2xl p-6 h-fit">
              <h2 className="text-sm font-semibold text-brand-900 mb-4">Resumen Acumulado</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center"><ArrowUpRight size={12}/></div>
                    <span className="text-sm text-gray-600">Total Recaudado</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatMXN(balance?.total_collected || 0)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center"><ArrowDownRight size={12}/></div>
                    <span className="text-sm text-gray-600">Total Pagado al SAT</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{formatMXN(balance?.total_paid || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-semibold text-brand-900">Saldo Pendiente</span>
                  <span className="text-lg font-bold text-amber-600">{formatMXN(balance?.balance || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <PayIvaModal 
        open={showPayModal} 
        onClose={() => setShowPayModal(false)} 
        onSaved={fetchData} 
        maxAmount={balance?.balance || 0} 
      />
    </div>
  );
}
