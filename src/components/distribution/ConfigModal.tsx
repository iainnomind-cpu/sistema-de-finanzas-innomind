'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import type { DistributionConfig } from '@/lib/types/database';
import { formatMXN } from '@/lib/utils/format';

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ConfigModal({ open, onClose, onSaved }: ConfigModalProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<DistributionConfig | null>(null);

  const [form, setForm] = useState({
    bucket_salary: 35,
    bucket_reserve: 20,
    bucket_profit: 15,
    bucket_opex: 20,
    bucket_tax: 10,
    reserve_goal: 75000,
    profit_payout_month: 12,
  });

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('distribution_config')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setConfig(data);
        setForm({
          bucket_salary: Number(data.bucket_salary),
          bucket_reserve: Number(data.bucket_reserve),
          bucket_profit: Number(data.bucket_profit),
          bucket_opex: Number(data.bucket_opex),
          bucket_tax: Number(data.bucket_tax),
          reserve_goal: Number(data.reserve_goal),
          profit_payout_month: data.profit_payout_month,
        });
      }
    }
    if (open) loadConfig();
  }, [open, supabase]);

  const totalPct = form.bucket_salary + form.bucket_reserve + form.bucket_profit + form.bucket_opex + form.bucket_tax;
  const is100 = totalPct === 100;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!is100) {
      toast('Los porcentajes deben sumar exactamente 100%', 'error');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sin sesión', 'error'); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      bucket_salary: form.bucket_salary,
      bucket_reserve: form.bucket_reserve,
      bucket_profit: form.bucket_profit,
      bucket_opex: form.bucket_opex,
      bucket_tax: form.bucket_tax,
      reserve_goal: form.reserve_goal,
      profit_payout_month: form.profit_payout_month,
      is_active: true,
    };

    let error;
    if (config) {
      const res = await supabase.from('distribution_config').update(payload).eq('id', config.id);
      error = res.error;
    } else {
      const res = await supabase.from('distribution_config').insert(payload);
      error = res.error;
    }

    setLoading(false);
    if (error) { toast(`Error: ${error.message}`, 'error'); return; }
    
    toast('Configuración guardada', 'success');
    onSaved();
    onClose();
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all";
  const lc = "block text-xs font-semibold text-gray-600 mb-1.5";
  const exampleAmount = 30000;

  return (
    <Modal open={open} onClose={onClose} title="Configurar Distribución" subtitle="Ajusta los porcentajes del método Profit First" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sum Indicator */}
        <div className={`p-4 rounded-xl flex items-center justify-between transition-colors ${is100 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
          <div>
            <p className="text-sm font-semibold">Total Asignado: {totalPct}%</p>
            {!is100 && <p className="text-xs mt-0.5">{totalPct < 100 ? `Falta ${100 - totalPct}%` : `Sobra ${totalPct - 100}%`}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Ejemplo con ingreso de $30,000</p>
            <p className="font-bold">{formatMXN((exampleAmount * totalPct) / 100)}</p>
          </div>
        </div>

        {/* Sliders / Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4"><label className={lc}>Sueldos Socios</label></div>
            <div className="col-span-5"><input type="range" name="bucket_salary" min="0" max="100" value={form.bucket_salary} onChange={handleChange} className="w-full accent-brand-500" /></div>
            <div className="col-span-3 flex items-center gap-2">
              <input type="number" name="bucket_salary" min="0" max="100" value={form.bucket_salary} onChange={handleChange} className={`${ic} !py-1.5 text-center`} /> <span className="text-sm font-medium">%</span>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4"><label className={lc}>Operación (OPEX)</label></div>
            <div className="col-span-5"><input type="range" name="bucket_opex" min="0" max="100" value={form.bucket_opex} onChange={handleChange} className="w-full accent-brand-500" /></div>
            <div className="col-span-3 flex items-center gap-2">
              <input type="number" name="bucket_opex" min="0" max="100" value={form.bucket_opex} onChange={handleChange} className={`${ic} !py-1.5 text-center`} /> <span className="text-sm font-medium">%</span>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4"><label className={lc}>Fondo de Reserva</label></div>
            <div className="col-span-5"><input type="range" name="bucket_reserve" min="0" max="100" value={form.bucket_reserve} onChange={handleChange} className="w-full accent-brand-500" /></div>
            <div className="col-span-3 flex items-center gap-2">
              <input type="number" name="bucket_reserve" min="0" max="100" value={form.bucket_reserve} onChange={handleChange} className={`${ic} !py-1.5 text-center`} /> <span className="text-sm font-medium">%</span>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4"><label className={lc}>Utilidad Anual</label></div>
            <div className="col-span-5"><input type="range" name="bucket_profit" min="0" max="100" value={form.bucket_profit} onChange={handleChange} className="w-full accent-brand-500" /></div>
            <div className="col-span-3 flex items-center gap-2">
              <input type="number" name="bucket_profit" min="0" max="100" value={form.bucket_profit} onChange={handleChange} className={`${ic} !py-1.5 text-center`} /> <span className="text-sm font-medium">%</span>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4"><label className={lc}>Impuestos (ISR/IVA)</label></div>
            <div className="col-span-5"><input type="range" name="bucket_tax" min="0" max="100" value={form.bucket_tax} onChange={handleChange} className="w-full accent-brand-500" /></div>
            <div className="col-span-3 flex items-center gap-2">
              <input type="number" name="bucket_tax" min="0" max="100" value={form.bucket_tax} onChange={handleChange} className={`${ic} !py-1.5 text-center`} /> <span className="text-sm font-medium">%</span>
            </div>
          </div>
        </div>

        {/* Other settings */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lc}>Meta del Fondo de Reserva ($)</label>
            <input type="number" name="reserve_goal" min="0" step="1000" value={form.reserve_goal} onChange={handleChange} className={ic} required />
            <p className="text-[10px] text-gray-500 mt-1">Se sugiere cubrir 3 meses de gastos fijos.</p>
          </div>
          <div>
            <label className={lc}>Mes de Reparto de Utilidad</label>
            <select name="profit_payout_month" value={form.profit_payout_month} onChange={handleChange} className={ic}>
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={loading || !is100} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all">
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
