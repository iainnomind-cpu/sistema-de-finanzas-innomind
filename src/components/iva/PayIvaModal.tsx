'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { formatMXN } from '@/lib/utils/format';

interface PayIvaModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  maxAmount: number;
}

export default function PayIvaModal({ open, onClose, onSaved, maxAmount }: PayIvaModalProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [form, setForm] = useState({
    amount: maxAmount > 0 ? maxAmount.toString() : '',
    period_month: (now.getMonth() === 0 ? 12 : now.getMonth()).toString(), // Last month usually
    period_year: (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()).toString(),
    notes: '',
  });

  // Re-sync maxAmount when open changes
  useState(() => {
    if (open) {
      setForm(f => ({ ...f, amount: maxAmount > 0 ? maxAmount.toString() : '' }));
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pAmount = parseFloat(form.amount);
    
    if (isNaN(pAmount) || pAmount <= 0) { 
      toast('Monto inválido', 'error'); 
      return; 
    }

    if (pAmount > maxAmount) {
      toast('No puedes registrar un pago mayor a tu saldo acumulado', 'error');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setLoading(false); return; }

    const { error: rpcError } = await supabase.rpc('pay_iva_sat', {
      p_amount: pAmount,
      p_period_month: parseInt(form.period_month),
      p_period_year: parseInt(form.period_year),
      p_notes: form.notes,
      p_user_id: user.id
    });

    setLoading(false);
    
    if (rpcError) {
      toast(`Error al registrar pago: ${rpcError.message}`, 'error');
      return;
    }

    toast('Pago de IVA registrado correctamente', 'success');
    onSaved();
    onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Modal open={open} onClose={onClose} title="Registrar Pago al SAT" subtitle="Descuenta el IVA que ya pagaste en tu declaración" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wider mb-1">Saldo IVA Pendiente</p>
          <p className="text-3xl font-bold text-amber-900">{formatMXN(maxAmount)}</p>
        </div>

        <div>
          <label className={lc}>Monto Pagado *</label>
          <input name="amount" type="number" step="0.01" min="0.01" max={maxAmount} value={form.amount} onChange={handleChange} placeholder="$0.00" className={ic} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lc}>Mes a declarar</label>
            <select name="period_month" value={form.period_month} onChange={handleChange} className={ic}>
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lc}>Año</label>
            <select name="period_year" value={form.period_year} onChange={handleChange} className={ic}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={lc}>Notas de la Operación (Opcional)</label>
          <input name="notes" value={form.notes} onChange={handleChange} placeholder="Número de operación, folio, etc." className={ic} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 shadow-sm transition-all">
            {loading ? 'Procesando...' : 'Confirmar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
