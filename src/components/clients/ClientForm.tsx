'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import type { Client } from '@/lib/types/database';
import { X } from 'lucide-react';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editClient?: Client | null;
}

export default function ClientForm({ open, onClose, onSaved, editClient }: ClientFormProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: editClient?.name || '',
    type: editClient?.type || 'empresa',
    sector: editClient?.sector || '',
    contact_name: editClient?.contact_name || '',
    rfc: editClient?.rfc || '',
    phone: editClient?.phone || '',
    email: editClient?.email || '',
    city: editClient?.city || '',
    state: editClient?.state || '',
  });

  // Reset form when editClient changes
  useState(() => {
    if (editClient) {
      setForm({
        name: editClient.name,
        type: editClient.type,
        sector: editClient.sector || '',
        contact_name: editClient.contact_name || '',
        rfc: editClient.rfc || '',
        phone: editClient.phone || '',
        email: editClient.email || '',
        city: editClient.city || '',
        state: editClient.state || '',
      });
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('El nombre es obligatorio', 'error');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('No hay sesión activa', 'error');
      setLoading(false);
      return;
    }

    const payload = {
      ...form,
      sector: form.sector || null,
      contact_name: form.contact_name || null,
      rfc: form.rfc || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      state: form.state || null,
      user_id: user.id,
    };

    let error;

    if (editClient) {
      const result = await supabase.from('clients').update(payload).eq('id', editClient.id);
      error = result.error;
    } else {
      const result = await supabase.from('clients').insert(payload);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast(`Error: ${error.message}`, 'error');
      return;
    }

    toast(editClient ? 'Cliente actualizado' : 'Cliente creado exitosamente', 'success');
    onSaved();
    onClose();
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editClient ? 'Editar Cliente' : 'Nuevo Cliente'}
      subtitle="Completa la información del cliente"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre / Razón Social *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre del cliente" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
              <option value="empresa">Empresa</option>
              <option value="persona_fisica">Persona Física</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sector</label>
            <input name="sector" value={form.sector} onChange={handleChange} placeholder="Ej: Tecnología, Retail..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contacto Principal</label>
            <input name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Nombre del contacto" className={inputClass} />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>RFC</label>
            <input name="rfc" value={form.rfc} onChange={handleChange} placeholder="RFC (opcional)" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Teléfono" className={inputClass} />
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Correo Electrónico</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@empresa.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input name="city" value={form.city} onChange={handleChange} placeholder="Ciudad" className={inputClass} />
          </div>
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Estado</label>
            <input name="state" value={form.state} onChange={handleChange} placeholder="Estado" className={inputClass} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? 'Guardando...' : editClient ? 'Actualizar' : 'Crear Cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
