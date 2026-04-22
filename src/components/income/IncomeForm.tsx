'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import type { Income } from '@/lib/types/database';

type Option = { id: string; name: string };

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editIncome?: Income | null;
}

export default function IncomeForm({ open, onClose, onSaved, editIncome }: IncomeFormProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    concept: '',
    category: 'otro',
    client_id: '',
    project_id: '',
    payment_method: 'transferencia',
    status: 'en_cuenta',
  });

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('clients').select('id, name').order('name');
      setClients((c as Option[]) || []);
      const { data: p } = await supabase.from('projects').select('id, name').order('name');
      setProjects((p as Option[]) || []);
    }
    if (open) load();
  }, [open, supabase]);

  useEffect(() => {
    if (editIncome) {
      setForm({
        date: editIncome.date,
        amount: editIncome.amount.toString(),
        concept: editIncome.concept,
        category: editIncome.category,
        client_id: editIncome.client_id || '',
        project_id: editIncome.project_id || '',
        payment_method: editIncome.payment_method,
        status: editIncome.status,
      });
    } else {
      setForm({ date: new Date().toISOString().split('T')[0], amount: '', concept: '', category: 'otro', client_id: '', project_id: '', payment_method: 'transferencia', status: 'en_cuenta' });
    }
  }, [editIncome, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      category: form.category,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      payment_method: form.payment_method,
      status: form.status,
    };

    const { error } = editIncome
      ? await supabase.from('income').update(payload).eq('id', editIncome.id)
      : await supabase.from('income').insert(payload);

    setLoading(false);
    if (error) { toast(`Error: ${error.message}`, 'error'); return; }
    toast(editIncome ? 'Ingreso actualizado' : 'Ingreso registrado', 'success');
    onSaved(); onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Modal open={open} onClose={onClose} title={editIncome ? 'Editar Ingreso' : 'Registrar Ingreso'} subtitle="Registra una entrada de dinero" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lc}>Fecha *</label><input name="date" type="date" value={form.date} onChange={handleChange} className={ic} required /></div>
          <div><label className={lc}>Monto *</label><input name="amount" type="number" step="0.01" min="0" value={form.amount} onChange={handleChange} placeholder="$0.00" className={ic} required /></div>
        </div>
        <div><label className={lc}>Concepto *</label><input name="concept" value={form.concept} onChange={handleChange} placeholder="Descripción del ingreso" className={ic} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lc}>Categoría</label>
            <select name="category" value={form.category} onChange={handleChange} className={ic}>
              <option value="anticipo_proyecto">Anticipo de Proyecto</option>
              <option value="saldo_proyecto">Saldo de Proyecto</option>
              <option value="mensualidad_recurrente">Mensualidad Recurrente</option>
              <option value="consultoria">Consultoría</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={lc}>Método de Cobro</label>
            <select name="payment_method" value={form.payment_method} onChange={handleChange} className={ic}>
              <option value="transferencia">Transferencia</option>
              <option value="deposito">Depósito</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lc}>Cliente (opcional)</label>
            <select name="client_id" value={form.client_id} onChange={handleChange} className={ic}>
              <option value="">Sin cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lc}>Proyecto (opcional)</label>
            <select name="project_id" value={form.project_id} onChange={handleChange} className={ic}>
              <option value="">Sin proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lc}>Estado</label>
          <select name="status" value={form.status} onChange={handleChange} className={ic}>
            <option value="en_cuenta">En Cuenta (cobrado)</option>
            <option value="confirmado">Confirmado (devengado)</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-sm">
            {loading ? 'Guardando...' : editIncome ? 'Actualizar' : 'Registrar Ingreso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
