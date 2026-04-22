'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import PartnerForm from '@/components/partners/PartnerForm';
import Modal from '@/components/ui/Modal';
import type { Partner, Salary } from '@/lib/types/database';
import { formatMXN, formatDate, formatMonth } from '@/lib/utils/format';
import { UserCog, Plus, Pencil, Calendar, DollarSign, AlertTriangle, Wallet, ArrowDownRight } from 'lucide-react';

export default function SociosPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [showPayroll, setShowPayroll] = useState(false);
  const [payrollPartner, setPayrollPartner] = useState<Partner | null>(null);
  const [payrollType, setPayrollType] = useState<'sueldo' | 'retiro_extraordinario'>('sueldo');
  const [payrollAmount, setPayrollAmount] = useState('');
  const [payrollJustification, setPayrollJustification] = useState('');
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [cashBalance, setCashBalance] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from('partners').select('*').order('created_at');
    setPartners((p as Partner[]) || []);

    const { data: s } = await supabase.from('salaries').select('*, partner:partners(name)').order('year', { ascending: false }).order('month', { ascending: false }).limit(20);
    setSalaries((s as Salary[]) || []);

    // Calculate cash balance
    const { data: inc } = await supabase.from('income').select('amount').eq('status', 'en_cuenta');
    const { data: exp } = await supabase.from('expenses').select('amount');
    const totalInc = (inc || []).reduce((s: number, i: any) => s + i.amount, 0);
    const totalExp = (exp || []).reduce((s: number, e: any) => s + e.amount, 0);
    setCashBalance(totalInc - totalExp);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, []);

  async function handlePayroll(e: React.FormEvent) {
    e.preventDefault();
    if (!payrollPartner) return;
    const amount = payrollType === 'sueldo' ? payrollPartner.monthly_salary : parseFloat(payrollAmount);
    if (!amount || amount <= 0) { toast('Monto inválido', 'error'); return; }

    // Validate cash
    if (amount > cashBalance) {
      toast(`Fondos insuficientes. Disponible: ${formatMXN(cashBalance)}`, 'error');
      return;
    }

    setPayrollLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setPayrollLoading(false); return; }

    const now = new Date();
    const concept = payrollType === 'sueldo'
      ? `Nómina ${formatMonth(now.getMonth() + 1)} - ${payrollPartner.name}`
      : `Retiro extraordinario - ${payrollPartner.name}`;

    // Create expense
    const { data: expense, error: expError } = await supabase.from('expenses').insert({
      user_id: user.id, date: now.toISOString().split('T')[0],
      amount, concept, type: 'nomina',
    }).select('id').single();

    if (expError) { toast(`Error: ${expError.message}`, 'error'); setPayrollLoading(false); return; }

    // Create salary record
    await supabase.from('salaries').insert({
      user_id: user.id, partner_id: payrollPartner.id,
      month: now.getMonth() + 1, year: now.getFullYear(),
      amount, payment_date: now.toISOString().split('T')[0],
      type: payrollType,
      justification: payrollType === 'retiro_extraordinario' ? payrollJustification : null,
      expense_id: expense?.id || null,
    });

    setPayrollLoading(false);
    toast(`${payrollType === 'sueldo' ? 'Nómina' : 'Retiro'} registrado. Gasto generado automáticamente.`, 'success');
    setShowPayroll(false);
    setPayrollAmount('');
    setPayrollJustification('');
    fetchData();
  }

  function openPayroll(partner: Partner, type: 'sueldo' | 'retiro_extraordinario') {
    setPayrollPartner(partner);
    setPayrollType(type);
    setPayrollAmount(type === 'sueldo' ? partner.monthly_salary.toString() : '');
    setShowPayroll(true);
  }

  // Calculate months without pay for each partner
  function getUnpaidMonths(partnerId: string): number {
    const partnerSalaries = salaries.filter(s => s.partner_id === partnerId && s.type === 'sueldo');
    const partner = partners.find(p => p.id === partnerId);
    if (!partner?.salary_start_date) return 0;

    const start = new Date(partner.salary_start_date);
    const now = new Date();
    const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    return Math.max(0, totalMonths - partnerSalaries.length);
  }

  function getAccumulatedDebt(partnerId: string): number {
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return 0;
    return getUnpaidMonths(partnerId) * partner.monthly_salary;
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Socios y Nómina</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de socios, sueldos y retiros</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card rounded-xl px-4 py-2">
            <p className="text-xs text-gray-500">Fondo Disponible</p>
            <p className={`text-lg font-bold ${cashBalance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{formatMXN(cashBalance)}</p>
          </div>
          <button onClick={() => { setEditPartner(null); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm">
            <Plus size={16} /> Agregar Socio
          </button>
        </div>
      </div>

      {/* Partner cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1,2].map(n => <div key={n} className="h-64 skeleton rounded-2xl" />)}</div>
      ) : partners.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <UserCog size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay socios configurados</p>
          <p className="text-xs text-gray-400 mt-1">Agrega los socios del negocio para gestionar nómina</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partners.map((partner, i) => {
            const unpaid = getUnpaidMonths(partner.id);
            const debt = getAccumulatedDebt(partner.id);
            const partnerSalaries = salaries.filter(s => s.partner_id === partner.id);

            return (
              <div key={partner.id} className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
                      <UserCog size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-brand-900">{partner.name}</h2>
                      <p className="text-xs text-gray-500">{partner.participation_pct}% participación</p>
                    </div>
                  </div>
                  <button onClick={() => { setEditPartner(partner); setShowForm(true); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={16} /></button>
                </div>

                <div className="space-y-2.5 mb-5">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Sueldo mensual</span>
                    <span className="text-sm font-semibold text-brand-900">{formatMXN(partner.monthly_salary)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Día de pago</span>
                    <span className="text-sm font-semibold text-brand-900">Día {partner.salary_pay_day}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Meses sin pago</span>
                    <span className={`text-sm font-semibold ${unpaid > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {unpaid > 0 ? `${unpaid} mes${unpaid > 1 ? 'es' : ''}` : 'Al corriente'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-500">Deuda acumulada</span>
                    <span className={`text-sm font-semibold ${debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMXN(debt)}</span>
                  </div>
                </div>

                {debt > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">Se deben {unpaid} mes{unpaid > 1 ? 'es' : ''} de sueldo</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => openPayroll(partner, 'sueldo')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 transition-all shadow-sm flex items-center justify-center gap-1.5">
                    <DollarSign size={14} /> Pagar Nómina
                  </button>
                  <button onClick={() => openPayroll(partner, 'retiro_extraordinario')}
                    className="py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
                    <Wallet size={14} /> Retiro
                  </button>
                </div>

                {/* Recent salary history */}
                {partnerSalaries.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Últimos pagos</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {partnerSalaries.slice(0, 5).map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight size={12} className="text-red-400" />
                            <span className="text-gray-600">
                              {s.type === 'sueldo' ? `Nómina ${formatMonth(s.month, s.year)}` : 'Retiro extra'}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-700">{formatMXN(s.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full salary history */}
      {salaries.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Historial Completo de Nómina</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Socio</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Periodo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Tipo</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Monto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Fecha Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salaries.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-brand-900">{(s as any).partner?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatMonth(s.month, s.year)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${s.type === 'sueldo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {s.type === 'sueldo' ? 'Sueldo' : 'Retiro'}
                    </span></td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">{formatMXN(s.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.payment_date ? formatDate(s.payment_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partner Form */}
      <PartnerForm open={showForm} onClose={() => { setShowForm(false); setEditPartner(null); }} onSaved={fetchData} editPartner={editPartner} />

      {/* Payroll Modal */}
      <Modal open={showPayroll} onClose={() => setShowPayroll(false)}
        title={payrollType === 'sueldo' ? 'Pagar Nómina' : 'Retiro Extraordinario'}
        subtitle={payrollPartner?.name || ''}>
        <form onSubmit={handlePayroll} className="space-y-4">
          <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Fondo disponible</span>
              <span className={`font-semibold ${cashBalance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{formatMXN(cashBalance)}</span>
            </div>
            {payrollType === 'sueldo' && payrollPartner && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Después del pago</span>
                <span className={`font-semibold ${cashBalance - payrollPartner.monthly_salary >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatMXN(cashBalance - payrollPartner.monthly_salary)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monto</label>
            <input type="number" step="0.01" min="0"
              value={payrollType === 'sueldo' ? payrollPartner?.monthly_salary || '' : payrollAmount}
              onChange={(e) => setPayrollAmount(e.target.value)}
              readOnly={payrollType === 'sueldo'}
              className={`${ic} ${payrollType === 'sueldo' ? 'bg-gray-50' : ''}`}
            />
          </div>

          {payrollType === 'retiro_extraordinario' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Justificación *</label>
              <input value={payrollJustification} onChange={(e) => setPayrollJustification(e.target.value)}
                placeholder="Motivo del retiro" className={ic} required />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowPayroll(false)} className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={payrollLoading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-50 shadow-sm">
              {payrollLoading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
