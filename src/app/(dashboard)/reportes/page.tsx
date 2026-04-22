'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatMXN, formatDate, getStatusLabel } from '@/lib/utils/format';
import { FileText, Download, Calendar, DollarSign, Users, FolderKanban, Receipt, FileBarChart2, TrendingUp } from 'lucide-react';

interface ReportConfig {
  key: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const reports: ReportConfig[] = [
  { key: 'ingreso_mensual', title: 'Ingresos Mensuales', description: 'Resumen de ingresos por categoría y cliente', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700' },
  { key: 'gasto_mensual', title: 'Gastos Mensuales', description: 'Desglose de gastos por tipo y concepto', icon: Receipt, color: 'bg-red-100 text-red-700' },
  { key: 'cxc_vencidas', title: 'CxC Vencidas', description: 'Cuentas por cobrar con aging', icon: FileBarChart2, color: 'bg-amber-100 text-amber-700' },
  { key: 'proyectos', title: 'Estado de Proyectos', description: 'Todos los proyectos con montos y estado', icon: FolderKanban, color: 'bg-blue-100 text-blue-700' },
  { key: 'nomina', title: 'Historial de Nómina', description: 'Pagos de nómina por socio', icon: Users, color: 'bg-purple-100 text-purple-700' },
  { key: 'pyl', title: 'P&L Mensual', description: 'Estado de resultados del mes', icon: DollarSign, color: 'bg-brand-100 text-brand-700' },
  { key: 'flujo_caja', title: 'Flujo de Caja', description: 'Movimientos de efectivo cronológicos', icon: FileText, color: 'bg-teal-100 text-teal-700' },
];

export default function ReportesPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const generateCSV = useCallback(async (reportKey: string) => {
    setGenerating(reportKey);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    let csv = '';
    let filename = '';

    try {
      switch (reportKey) {
        case 'ingreso_mensual': {
          const { data } = await supabase.from('income').select('date, amount, concept, category, payment_method, status, client:clients(name)').gte('date', startDate).lte('date', endDate).order('date');
          csv = 'Fecha,Monto,Concepto,Categoría,Método,Estado,Cliente\n';
          (data || []).forEach((r: any) => { csv += `${r.date},${r.amount},"${r.concept}",${getStatusLabel(r.category)},${getStatusLabel(r.payment_method)},${getStatusLabel(r.status)},${r.client?.name || ''}\n`; });
          filename = `ingresos_${startDate}`;
          break;
        }
        case 'gasto_mensual': {
          const { data } = await supabase.from('expenses').select('date, amount, concept, type, is_recurring').gte('date', startDate).lte('date', endDate).order('date');
          csv = 'Fecha,Monto,Concepto,Tipo,Recurrente\n';
          (data || []).forEach((r: any) => { csv += `${r.date},${r.amount},"${r.concept}",${getStatusLabel(r.type)},${r.is_recurring ? 'Sí' : 'No'}\n`; });
          filename = `gastos_${startDate}`;
          break;
        }
        case 'cxc_vencidas': {
          const { data } = await supabase.from('receivables').select('amount, due_date, status, client:clients(name), project:projects(name)').order('due_date');
          csv = 'Cliente,Proyecto,Monto,Vencimiento,Estado,Días Vencido\n';
          const today = new Date();
          (data || []).forEach((r: any) => {
            const days = Math.max(0, Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000));
            csv += `${r.client?.name || ''},${r.project?.name || ''},${r.amount},${r.due_date},${r.status},${days}\n`;
          });
          filename = `cxc_${now.toISOString().split('T')[0]}`;
          break;
        }
        case 'proyectos': {
          const { data } = await supabase.from('projects').select('name, type, total_amount, status, advance_paid, balance_paid, start_date, client:clients(name)').order('created_at', { ascending: false });
          csv = 'Proyecto,Cliente,Tipo,Monto Total,Estado,Anticipo Pagado,Saldo Pagado,Inicio\n';
          (data || []).forEach((r: any) => { csv += `"${r.name}",${r.client?.name || ''},${getStatusLabel(r.type)},${r.total_amount},${getStatusLabel(r.status)},${r.advance_paid ? 'Sí' : 'No'},${r.balance_paid ? 'Sí' : 'No'},${r.start_date || ''}\n`; });
          filename = `proyectos_${now.toISOString().split('T')[0]}`;
          break;
        }
        case 'nomina': {
          const { data } = await supabase.from('salaries').select('month, year, amount, payment_date, type, justification, partner:partners(name)').order('year', { ascending: false }).order('month', { ascending: false });
          csv = 'Socio,Mes,Año,Monto,Fecha Pago,Tipo,Justificación\n';
          (data || []).forEach((r: any) => { csv += `${r.partner?.name || ''},${r.month},${r.year},${r.amount},${r.payment_date || ''},${r.type},${r.justification || ''}\n`; });
          filename = `nomina_${now.toISOString().split('T')[0]}`;
          break;
        }
        case 'pyl': {
          const { data: inc } = await supabase.from('income').select('amount, category').gte('date', startDate).lte('date', endDate);
          const { data: exp } = await supabase.from('expenses').select('amount, type').gte('date', startDate).lte('date', endDate);
          const totalInc = (inc || []).reduce((s, i) => s + i.amount, 0);
          const totalExp = (exp || []).reduce((s, e) => s + e.amount, 0);
          csv = 'Concepto,Monto\n';
          csv += `Total Ingresos,${totalInc}\n`;
          const incByCat: Record<string, number> = {};
          (inc || []).forEach(i => { incByCat[getStatusLabel(i.category)] = (incByCat[getStatusLabel(i.category)] || 0) + i.amount; });
          Object.entries(incByCat).forEach(([k, v]) => { csv += `  ${k},${v}\n`; });
          csv += `Total Gastos,${totalExp}\n`;
          const expByType: Record<string, number> = {};
          (exp || []).forEach(e => { expByType[getStatusLabel(e.type)] = (expByType[getStatusLabel(e.type)] || 0) + e.amount; });
          Object.entries(expByType).forEach(([k, v]) => { csv += `  ${k},${v}\n`; });
          csv += `Utilidad Neta,${totalInc - totalExp}\n`;
          filename = `pyl_${startDate}`;
          break;
        }
        case 'flujo_caja': {
          const { data: inc } = await supabase.from('income').select('date, amount, concept').eq('status', 'en_cuenta').order('date');
          const { data: exp } = await supabase.from('expenses').select('date, amount, concept').order('date');
          const all = [
            ...(inc || []).map(i => ({ ...i, type: 'Entrada' })),
            ...(exp || []).map(e => ({ ...e, type: 'Salida' })),
          ].sort((a, b) => a.date.localeCompare(b.date));
          let bal = 0;
          csv = 'Fecha,Tipo,Monto,Concepto,Saldo\n';
          all.forEach(m => {
            bal += m.type === 'Entrada' ? m.amount : -m.amount;
            csv += `${m.date},${m.type},${m.amount},"${m.concept}",${bal}\n`;
          });
          filename = `flujo_caja_${now.toISOString().split('T')[0]}`;
          break;
        }
      }

      if (csv) {
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Reporte descargado', 'success');
      }
    } catch (err) {
      toast('Error generando reporte', 'error');
    }
    setGenerating(null);
  }, [supabase, toast]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Genera y descarga reportes en CSV</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, i) => (
          <div key={r.key} className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className={`w-10 h-10 rounded-xl ${r.color} flex items-center justify-center mb-4`}><r.icon size={20} /></div>
            <h3 className="text-sm font-semibold text-brand-900 mb-1">{r.title}</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{r.description}</p>
            <button onClick={() => generateCSV(r.key)} disabled={generating === r.key}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-brand-700 border border-brand-200 hover:bg-brand-50 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
              {generating === r.key ? (
                <span className="animate-spin w-3 h-3 border-2 border-brand-300 border-t-brand-700 rounded-full" />
              ) : (
                <Download size={14} />
              )}
              {generating === r.key ? 'Generando...' : 'Descargar CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
