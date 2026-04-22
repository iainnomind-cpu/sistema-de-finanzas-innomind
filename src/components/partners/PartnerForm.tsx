'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

interface PartnerFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editPartner?: any;
}

export default function PartnerForm({ open, onClose, onSaved, editPartner }: PartnerFormProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', participation_pct: '50', bank_account: '',
    monthly_salary: '', salary_pay_day: '15',
    salary_start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (editPartner) {
      setForm({
        name: editPartner.name,
        participation_pct: editPartner.participation_pct?.toString() || '50',
        bank_account: editPartner.bank_account || '',
        monthly_salary: editPartner.monthly_salary?.toString() || '',
        salary_pay_day: editPartner.salary_pay_day?.toString() || '15',
        salary_start_date: editPartner.salary_start_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm({ name: '', participation_pct: '50', bank_account: '', monthly_salary: '', salary_pay_day: '15', salary_start_date: new Date().toISOString().split('T')[0] });
    }
  }, [editPartner, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast('El nombre es obligatorio', 'error'); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setLoading(false); return; }

    const payload = {
      user_id: user.id, name: form.name,
      participation_pct: parseFloat(form.participation_pct) || 50,
      bank_account: form.bank_account || null,
      monthly_salary: parseFloat(form.monthly_salary) || 0,
      salary_pay_day: parseInt(form.salary_pay_day) || 15,
      salary_start_date: form.salary_start_date || null,
    };

    const { error } = editPartner
      ? await supabase.from('partners').update(payload).eq('id', editPartner.id)
      : await supabase.from('partners').insert(payload);

    setLoading(false);
    if (error) { toast(`Error: ${error.message}`, 'error'); return; }
    toast(editPartner ? 'Socio actualizado' : 'Socio creado', 'success');
    onSaved(); onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Modal open={open} onClose={onClose} title={editPartner ? 'Editar Socio' : 'Nuevo Socio'} subtitle="Configuración del socio">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className={lc}>Nombre *</label><input name="name" value={form.name} onChange={handleChange} placeholder="Nombre completo" className={ic} required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lc}>Participación (%)</label><input name="participation_pct" type="number" step="0.01" value={form.participation_pct} onChange={handleChange} className={ic} /></div>
          <div><label className={lc}>Cuenta Bancaria</label><input name="bank_account" value={form.bank_account} onChange={handleChange} placeholder="CLABE o número" className={ic} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={lc}>Sueldo Mensual</label><input name="monthly_salary" type="number" step="0.01" value={form.monthly_salary} onChange={handleChange} placeholder="$0.00" className={ic} /></div>
          <div><label className={lc}>Día de Pago</label><input name="salary_pay_day" type="number" min="1" max="31" value={form.salary_pay_day} onChange={handleChange} className={ic} /></div>
          <div><label className={lc}>Inicio Sueldo</label><input name="salary_start_date" type="date" value={form.salary_start_date} onChange={handleChange} className={ic} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-50 shadow-sm">
            {loading ? 'Guardando...' : editPartner ? 'Actualizar' : 'Crear Socio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
