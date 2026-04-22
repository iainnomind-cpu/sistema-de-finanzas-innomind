'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import type { Project } from '@/lib/types/database';

type ClientOption = { id: string; name: string };

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editProject?: Project | null;
}

export default function ProjectForm({ open, onClose, onSaved, editProject }: ProjectFormProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [form, setForm] = useState({
    name: '',
    client_id: '',
    type: 'desarrollo_custom',
    total_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    estimated_months: '1',
    status: 'propuesta',
    assigned_partner: 'ambos',
    notes: '',
  });

  // Load clients for dropdown
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.from('clients').select('id, name').order('name');
      setClients((data as ClientOption[]) || []);
    }
    if (open) loadClients();
  }, [open, supabase]);

  // Populate form when editing
  useEffect(() => {
    if (editProject) {
      setForm({
        name: editProject.name,
        client_id: editProject.client_id || '',
        type: editProject.type,
        total_amount: editProject.total_amount.toString(),
        start_date: editProject.start_date || new Date().toISOString().split('T')[0],
        estimated_months: editProject.estimated_months.toString(),
        status: editProject.status,
        assigned_partner: editProject.assigned_partner,
        notes: editProject.notes || '',
      });
    } else {
      setForm({
        name: '',
        client_id: '',
        type: 'desarrollo_custom',
        total_amount: '',
        start_date: new Date().toISOString().split('T')[0],
        estimated_months: '1',
        status: 'propuesta',
        assigned_partner: 'ambos',
        notes: '',
      });
    }
  }, [editProject, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast('El nombre es obligatorio', 'error'); return; }
    if (!form.client_id) { toast('Selecciona un cliente', 'error'); return; }

    const totalAmount = parseFloat(form.total_amount) || 0;
    const advanceAmount = totalAmount * 0.5;
    const balanceAmount = totalAmount * 0.5;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('No hay sesión activa', 'error'); setLoading(false); return; }

    // Calculate balance due date (start_date + estimated_months)
    const startDate = new Date(form.start_date);
    const balanceDueDate = new Date(startDate);
    balanceDueDate.setMonth(balanceDueDate.getMonth() + parseInt(form.estimated_months));

    const payload = {
      user_id: user.id,
      name: form.name,
      client_id: form.client_id,
      type: form.type,
      total_amount: totalAmount,
      start_date: form.start_date,
      estimated_months: parseInt(form.estimated_months),
      status: form.status,
      advance_amount: advanceAmount,
      advance_date: form.start_date,
      advance_paid: false,
      balance_amount: balanceAmount,
      balance_due_date: balanceDueDate.toISOString().split('T')[0],
      balance_paid: false,
      assigned_partner: form.assigned_partner,
      notes: form.notes || null,
    };

    let projectId: string | null = null;

    if (editProject) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editProject.id);
      if (error) { toast(`Error: ${error.message}`, 'error'); setLoading(false); return; }
      projectId = editProject.id;
    } else {
      const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
      if (error) { toast(`Error: ${error.message}`, 'error'); setLoading(false); return; }
      projectId = data.id;

      // Auto-create CxC for advance and balance
      if (totalAmount > 0 && projectId) {
        const cxcEntries = [];

        // CxC for advance (50%)
        if (advanceAmount > 0) {
          cxcEntries.push({
            user_id: user.id,
            client_id: form.client_id,
            project_id: projectId,
            amount: advanceAmount,
            due_date: form.start_date,
            status: 'pendiente',
            partial_amount: 0,
          });
        }

        // CxC for balance (50%)
        if (balanceAmount > 0) {
          cxcEntries.push({
            user_id: user.id,
            client_id: form.client_id,
            project_id: projectId,
            amount: balanceAmount,
            due_date: balanceDueDate.toISOString().split('T')[0],
            status: 'pendiente',
            partial_amount: 0,
          });
        }

        if (cxcEntries.length > 0) {
          const { error: cxcError } = await supabase.from('receivables').insert(cxcEntries);
          if (cxcError) {
            toast('Proyecto creado, pero hubo error creando las CxC', 'warning');
          }
        }
      }
    }

    setLoading(false);
    toast(editProject ? 'Proyecto actualizado' : 'Proyecto creado con CxC generadas', 'success');
    onSaved();
    onClose();
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

  const totalAmount = parseFloat(form.total_amount) || 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      subtitle="El sistema genera automáticamente las CxC (50% anticipo + 50% saldo)"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre del Proyecto *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Ej: ERP Inventarios" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Cliente *</label>
            <select name="client_id" value={form.client_id} onChange={handleChange} className={inputClass} required>
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tipo de Proyecto</label>
            <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
              <option value="erp">ERP</option>
              <option value="crm">CRM</option>
              <option value="chatbot_ia">Chatbot IA</option>
              <option value="desarrollo_custom">Desarrollo Custom</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Monto Total Pactado *</label>
            <input name="total_amount" type="number" step="0.01" min="0" value={form.total_amount} onChange={handleChange} placeholder="$0.00" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Duración (meses)</label>
            <input name="estimated_months" type="number" min="1" value={form.estimated_months} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Fecha de Inicio</label>
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              <option value="propuesta">Propuesta</option>
              <option value="activo">Activo</option>
              <option value="en_entrega">En Entrega</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Socio Asignado</label>
            <select name="assigned_partner" value={form.assigned_partner} onChange={handleChange} className={inputClass}>
              <option value="ambos">Ambos</option>
              <option value="socio_1">Socio 1</option>
              <option value="socio_2">Socio 2</option>
            </select>
          </div>
        </div>

        {/* Payment Breakdown Preview */}
        {totalAmount > 0 && (
          <div className="bg-brand-50/50 rounded-xl p-4 border border-brand-100">
            <p className="text-xs font-semibold text-brand-700 mb-2">Desglose de Cobros (auto)</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Anticipo (50%)</p>
                <p className="font-semibold text-brand-900">${(totalAmount * 0.5).toLocaleString('es-MX')}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Saldo (50%)</p>
                <p className="font-semibold text-brand-900">${(totalAmount * 0.5).toLocaleString('es-MX')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelClass}>Notas</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Notas adicionales..." className={inputClass + ' resize-none'} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-sm">
            {loading ? 'Guardando...' : editProject ? 'Actualizar' : 'Crear Proyecto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
