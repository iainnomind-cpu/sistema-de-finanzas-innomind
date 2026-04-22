'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { formatMXN } from '@/lib/utils/format';
import type { BucketBalance } from '@/lib/types/database';

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  bucket: BucketBalance | null;
}

const BUCKET_LABELS: Record<string, string> = {
  salary: 'Sueldos Socios',
  reserve: 'Fondo de Reserva',
  profit: 'Utilidad Anual',
  opex: 'Operación',
  tax: 'Impuestos',
};

const BUCKET_DEFAULT_TYPES: Record<string, string> = {
  salary: 'salary',
  reserve: 'emergency',
  profit: 'profit_payout',
  opex: 'expense',
  tax: 'tax_payment',
};

export default function WithdrawalModal({ open, onClose, onSaved, bucket }: WithdrawalModalProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    concept: '',
    reference_type: '',
  });

  // Init form when bucket changes
  useState(() => {
    if (bucket) {
      setForm(f => ({ ...f, reference_type: BUCKET_DEFAULT_TYPES[bucket.bucket_name] || 'manual' }));
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bucket) return;
    
    const withdrawAmount = parseFloat(form.amount);
    if (!form.concept.trim() || isNaN(withdrawAmount) || withdrawAmount <= 0) { 
      toast('Completa concepto y monto válido', 'error'); 
      return; 
    }

    if (withdrawAmount > bucket.balance) {
      toast('No puedes retirar más del saldo disponible', 'error');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setLoading(false); return; }

    // Sequence of operations
    // 1. Insert withdrawal
    const { error: wError } = await supabase.from('bucket_withdrawals').insert({
      user_id: user.id,
      bucket_name: bucket.bucket_name,
      amount: withdrawAmount,
      concept: form.concept,
      reference_type: form.reference_type,
    });

    if (wError) {
      toast(`Error al registrar retiro: ${wError.message}`, 'error');
      setLoading(false);
      return;
    }

    // 2. Update balance
    const newBalance = bucket.balance - withdrawAmount;
    const newTotalOut = bucket.total_out + withdrawAmount;
    
    const { error: bError } = await supabase.from('bucket_balances').update({
      balance: newBalance,
      total_out: newTotalOut,
      updated_at: new Date().toISOString()
    }).eq('id', bucket.id);

    setLoading(false);
    
    if (bError) {
      toast(`Error al actualizar saldo: ${bError.message}`, 'error');
      return;
    }

    toast('Retiro registrado correctamente', 'success');
    setForm({ amount: '', concept: '', reference_type: BUCKET_DEFAULT_TYPES[bucket.bucket_name] || 'manual' });
    onSaved();
    onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

  if (!bucket) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Retirar de ${BUCKET_LABELS[bucket.bucket_name]}`} subtitle="El saldo actual se reducirá" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="bg-brand-50 rounded-xl p-4 text-center border border-brand-100">
          <p className="text-xs text-brand-600 font-medium uppercase tracking-wider mb-1">Saldo Disponible</p>
          <p className="text-3xl font-bold text-brand-900">{formatMXN(bucket.balance)}</p>
        </div>

        <div>
          <label className={lc}>Monto a retirar *</label>
          <input name="amount" type="number" step="0.01" min="0.01" max={bucket.balance} value={form.amount} onChange={handleChange} placeholder="$0.00" className={ic} required />
        </div>

        <div>
          <label className={lc}>Concepto *</label>
          <input name="concept" value={form.concept} onChange={handleChange} placeholder="Ej: Pago de nómina Quincena 1" className={ic} required />
        </div>

        <div>
          <label className={lc}>Clasificación del Retiro</label>
          <select name="reference_type" value={form.reference_type} onChange={handleChange} className={ic}>
            <option value="salary">Pago de Nómina (Sueldos)</option>
            <option value="expense">Gasto Operativo</option>
            <option value="profit_payout">Reparto de Utilidad</option>
            <option value="tax_payment">Pago de Impuestos</option>
            <option value="emergency">Fondo de Emergencia</option>
            <option value="manual">Otro (Manual)</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 shadow-sm transition-all">
            {loading ? 'Procesando...' : 'Confirmar Retiro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
