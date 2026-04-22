'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { formatMXN } from '@/lib/utils/format';
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
    status: 'cobrado',
    has_invoice: false,
    iva_rate: 0.16,
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
        amount: (editIncome.total_amount_with_iva || editIncome.amount).toString(),
        concept: editIncome.concept,
        category: editIncome.category,
        client_id: editIncome.client_id || '',
        project_id: editIncome.project_id || '',
        payment_method: editIncome.payment_method,
        status: editIncome.status,
        has_invoice: editIncome.has_invoice || false,
        iva_rate: editIncome.iva_rate || 0.16,
      });
    } else {
      setForm({ 
        date: new Date().toISOString().split('T')[0], amount: '', concept: '', category: 'otro', 
        client_id: '', project_id: '', payment_method: 'transferencia', status: 'cobrado',
        has_invoice: false, iva_rate: 0.16
      });
    }
  }, [editIncome, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  }

  // IVA Calculations
  const rawAmount = parseFloat(form.amount) || 0;
  const ivaRate = form.has_invoice ? Number(form.iva_rate) : 0;
  const baseAmount = form.has_invoice ? Math.round((rawAmount / (1 + ivaRate)) * 100) / 100 : rawAmount;
  const ivaAmount = form.has_invoice ? Math.round((rawAmount - baseAmount) * 100) / 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concept.trim() || !form.amount) { toast('Completa concepto y monto', 'error'); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      date: form.date,
      amount: baseAmount, // Amount is ALWAYS the base_amount
      base_amount: baseAmount,
      total_amount_with_iva: rawAmount,
      iva_amount: ivaAmount,
      iva_rate: ivaRate,
      has_invoice: form.has_invoice,
      concept: form.concept,
      category: form.category,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      payment_method: form.payment_method,
      status: form.status,
    };

    const { data: newIncome, error } = editIncome
      ? await supabase.from('income').update(payload).eq('id', editIncome.id).select().single()
      : await supabase.from('income').insert(payload).select().single();

    if (error) { setLoading(false); toast(`Error: ${error.message}`, 'error'); return; }

    const wasPending = editIncome ? editIncome.status !== 'cobrado' : true;
    if (wasPending && form.status === 'cobrado' && newIncome) {
      
      // 1. Separate IVA if there is invoice
      if (newIncome.has_invoice && newIncome.iva_amount > 0) {
        const { error: ivaError } = await supabase.rpc('separate_iva', {
          p_income_id: newIncome.id,
          p_iva_amount: newIncome.iva_amount,
          p_base_amount: newIncome.base_amount,
          p_user_id: user.id
        });
        if (ivaError) console.error('Error separating IVA:', ivaError);
      }

      // 2. Distribute base amount
      const { error: rpcError } = await supabase.rpc('distribute_income', {
        p_income_id: newIncome.id,
        p_amount: newIncome.amount, // this is the base amount
        p_user_id: user.id
      });
      
      if (rpcError) {
        console.error('Error distributing:', rpcError);
        toast(`Ingreso guardado, pero falló distribución: ${rpcError.message}`, 'error');
      } else {
        toast(editIncome ? 'Ingreso actualizado y distribuido' : 'Ingreso registrado y distribuido', 'success');
      }
    } else {
      toast(editIncome ? 'Ingreso actualizado' : 'Ingreso registrado', 'success');
    }
    
    setLoading(false);
    onSaved(); onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Modal open={open} onClose={onClose} title={editIncome ? 'Editar Ingreso' : 'Registrar Ingreso'} subtitle="Registra una entrada de dinero" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lc}>Fecha *</label><input name="date" type="date" value={form.date} onChange={handleChange} className={ic} required /></div>
          <div>
            <label className={lc}>{form.has_invoice ? 'Monto cobrado al cliente (con IVA) *' : 'Monto *'}</label>
            <input name="amount" type="number" step="0.01" min="0" value={form.amount} onChange={handleChange} placeholder="$0.00" className={ic} required />
          </div>
        </div>

        {/* Factura Toggle & IVA Details */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_invoice" checked={form.has_invoice} onChange={handleChange} className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
              <span className="text-sm font-semibold text-gray-700">✓ Incluye factura</span>
            </label>
            
            {form.has_invoice && (
              <select name="iva_rate" value={form.iva_rate} onChange={handleChange} className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white">
                <option value={0.16}>16% IVA</option>
                <option value={0.08}>8% IVA (Frontera)</option>
                <option value={0}>0% IVA (Exento)</option>
              </select>
            )}
          </div>

          {form.has_invoice && rawAmount > 0 && (
            <div className="pt-3 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tu ingreso (base):</span>
                <span className="font-bold text-emerald-600">{formatMXN(baseAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">IVA para el SAT:</span>
                <span className="font-semibold text-amber-600">{formatMXN(ivaAmount)}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Solo el ingreso base ({formatMXN(baseAmount)}) entrará a tu modelo de distribución Profit First.</p>
            </div>
          )}
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
            <option value="cobrado">Cobrado (en cuenta)</option>
            <option value="pendiente">Pendiente (devengado)</option>
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
