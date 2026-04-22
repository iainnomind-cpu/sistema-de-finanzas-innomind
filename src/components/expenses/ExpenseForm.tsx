'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import type { Expense } from '@/lib/types/database';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editExpense?: Expense | null;
}

export default function ExpenseForm({ open, onClose, onSaved, editExpense }: ExpenseFormProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    concept: '',
    type: 'variable' as string,
    is_recurring: false,
    recurring_day: '',
    receipt_url: '',
  });

  useEffect(() => {
    if (editExpense) {
      setForm({
        date: editExpense.date,
        amount: editExpense.amount.toString(),
        concept: editExpense.concept,
        type: editExpense.type,
        is_recurring: editExpense.is_recurring,
        recurring_day: editExpense.recurring_day?.toString() || '',
        receipt_url: editExpense.receipt_url || '',
      });
    } else {
      setForm({ date: new Date().toISOString().split('T')[0], amount: '', concept: '', type: 'variable', is_recurring: false, recurring_day: '', receipt_url: '' });
    }
  }, [editExpense, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    if (target.type === 'checkbox') {
      setForm({ ...form, [target.name]: (target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [target.name]: target.value });
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `receipts/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('receipts').upload(fileName, file);
    setUploading(false);
    if (error) {
      toast('Error subiendo comprobante. Verifica que el bucket "receipts" exista en Supabase Storage.', 'error');
      return;
    }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    setForm({ ...form, receipt_url: urlData.publicUrl });
    toast('Comprobante subido', 'success');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concept.trim() || !form.amount) { toast('Completa concepto y monto', 'error'); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      date: form.date,
      amount: parseFloat(form.amount),
      concept: form.concept,
      type: form.type,
      is_recurring: form.is_recurring,
      recurring_day: form.is_recurring && form.recurring_day ? parseInt(form.recurring_day) : null,
      receipt_url: form.receipt_url || null,
    };

    const { error } = editExpense
      ? await supabase.from('expenses').update(payload).eq('id', editExpense.id)
      : await supabase.from('expenses').insert(payload);

    setLoading(false);
    if (error) { toast(`Error: ${error.message}`, 'error'); return; }
    toast(editExpense ? 'Gasto actualizado' : 'Gasto registrado', 'success');
    onSaved(); onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Modal open={open} onClose={onClose} title={editExpense ? 'Editar Gasto' : 'Registrar Gasto'} subtitle="Registra una salida de dinero" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lc}>Fecha *</label><input name="date" type="date" value={form.date} onChange={handleChange} className={ic} required /></div>
          <div><label className={lc}>Monto *</label><input name="amount" type="number" step="0.01" min="0" value={form.amount} onChange={handleChange} placeholder="$0.00" className={ic} required /></div>
        </div>
        <div><label className={lc}>Concepto *</label><input name="concept" value={form.concept} onChange={handleChange} placeholder="Descripción del gasto" className={ic} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lc}>Tipo de Gasto</label>
            <select name="type" value={form.type} onChange={handleChange} className={ic}>
              <option value="fijo">Fijo Mensual</option>
              <option value="variable">Variable Operativo</option>
              <option value="socio">Gasto de Socio</option>
              <option value="inversion">Inversión</option>
              <option value="nomina">Nómina</option>
            </select>
          </div>
          <div>
            <label className={lc}>Comprobante</label>
            <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            {uploading && <p className="text-xs text-brand-500 mt-1">Subiendo...</p>}
            {form.receipt_url && <p className="text-xs text-emerald-600 mt-1">✓ Comprobante adjunto</p>}
          </div>
        </div>
        {/* Recurring toggle */}
        <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_recurring" checked={form.is_recurring} onChange={handleChange} className="w-4 h-4 text-brand-600 rounded focus:ring-brand-200" />
            <span className="text-sm text-gray-700 font-medium">Gasto recurrente mensual</span>
          </label>
          {form.is_recurring && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Día del mes:</span>
              <input name="recurring_day" type="number" min="1" max="31" value={form.recurring_day} onChange={handleChange} className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-sm text-center" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 shadow-sm">
            {loading ? 'Guardando...' : editExpense ? 'Actualizar' : 'Registrar Gasto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
