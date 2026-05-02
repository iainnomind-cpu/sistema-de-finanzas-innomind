'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import type { Client, Project, ClientDocument, Receivable, Income } from '@/lib/types/database';
import { formatMXN, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils/format';
import {
  ArrowLeft, Building2, User as UserIcon, Mail, Phone,
  MapPin, CircleDot, Briefcase, FileText, Upload,
  DollarSign, TrendingUp, AlertCircle, File, Trash2, Download
} from 'lucide-react';
import Link from 'next/link';

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch Client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (clientError || !clientData) {
      toast('Error cargando cliente', 'error');
      router.push('/clientes');
      return;
    }
    setClient(clientData);

    // Fetch Projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });
    if (projectsData) setProjects(projectsData);

    // Fetch Documents
    const { data: docsData } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });
    if (docsData) setDocuments(docsData);

    // Fetch Receivables (CxC)
    const { data: rxData } = await supabase
      .from('receivables')
      .select('*')
      .eq('client_id', id);
    if (rxData) setReceivables(rxData);

    // Fetch Incomes (Ingresos cobrados)
    const { data: incData } = await supabase
      .from('income')
      .select('*')
      .eq('client_id', id)
      .eq('status', 'cobrado');
    if (incData) setIncomes(incData);

    setLoading(false);
  }, [id, supabase, toast, router]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Create bucket if it doesn't exist (handled via dashboard normally, assuming it exists or we use a general one.
      // Wait, we can just use "documents" bucket)
      const fileExt = file.name.split('.').pop();
      const fileName = `${client?.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save to db
      const { error: dbError } = await supabase.from('client_documents').insert({
        user_id: user.id,
        client_id: client?.id,
        name: file.name,
        file_url: publicUrlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
      });

      if (dbError) throw dbError;

      toast('Documento subido con éxito', 'success');
      fetchData();
    } catch (err: any) {
      toast(`Error al subir: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleDeleteDocument(docId: string, fileUrl: string) {
    if (!confirm('¿Seguro que deseas eliminar este documento?')) return;
    
    // Extract path from public URL
    const urlParts = fileUrl.split('/documents/');
    if (urlParts.length > 1) {
      const path = urlParts[1];
      await supabase.storage.from('documents').remove([path]);
    }

    const { error } = await supabase.from('client_documents').delete().eq('id', docId);
    if (error) {
      toast('Error al eliminar', 'error');
    } else {
      toast('Documento eliminado', 'success');
      setDocuments(docs => docs.filter(d => d.id !== docId));
    }
  }

  if (loading || !client) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  // Calculate insights
  const totalPactado = projects.reduce((sum, p) => sum + p.total_amount, 0);
  const totalCobrado = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const cxcPendientes = receivables.filter(r => r.status === 'pendiente' || r.status === 'parcial');
  const totalPorCobrar = cxcPendientes.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header & Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/clientes" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-200 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 flex items-center gap-3">
            {client.type === 'empresa' ? <Building2 size={24} className="text-brand-600" /> : <UserIcon size={24} className="text-brand-600" />}
            {client.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${getStatusColor(client.classification)}`}>
              <CircleDot size={10} />
              {getStatusLabel(client.classification)}
            </span>
            {client.sector && <span>• {client.sector}</span>}
            {client.rfc && <span>• RFC: {client.rfc}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Info & Insights */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="glass-card p-6 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Contacto</h3>
            <div className="space-y-4 text-sm text-gray-600">
              {client.contact_name && (
                <div className="flex items-start gap-3">
                  <UserIcon size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{client.contact_name}</p>
                    <p className="text-xs text-gray-500">Nombre de contacto</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-gray-400 mt-0.5" />
                  <a href={`mailto:${client.email}`} className="hover:text-brand-600 transition-colors">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-gray-400 mt-0.5" />
                  <a href={`tel:${client.phone}`} className="hover:text-brand-600 transition-colors">{client.phone}</a>
                </div>
              )}
              {(client.city || client.state) && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-gray-400 mt-0.5" />
                  <span>{[client.city, client.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Insights Card */}
          <div className="bg-gradient-to-br from-brand-900 to-brand-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-6 -top-6 opacity-10">
              <TrendingUp size={120} />
            </div>
            <h3 className="text-brand-100 font-medium text-sm mb-6 relative z-10">Resumen Financiero</h3>
            
            <div className="space-y-5 relative z-10">
              <div>
                <p className="text-brand-200 text-xs mb-1">Total Cobrado (Histórico)</p>
                <p className="text-3xl font-bold">{formatMXN(totalCobrado)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-700/50">
                <div>
                  <p className="text-brand-200 text-xs mb-1">Valor de Proyectos</p>
                  <p className="text-lg font-semibold">{formatMXN(totalPactado)}</p>
                </div>
                <div>
                  <p className="text-brand-200 text-xs mb-1">Por Cobrar (CxC)</p>
                  <p className="text-lg font-semibold text-amber-300">{formatMXN(totalPorCobrar)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Projects & Documents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Projects Tab */}
          <div className="glass-card rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Briefcase size={18} className="text-brand-600" /> Proyectos ({projects.length})
              </h3>
            </div>
            <div className="p-5">
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No hay proyectos registrados para este cliente.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map(p => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 bg-white transition-all gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-brand-900">{p.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {p.type.replace('_', ' ').toUpperCase()} • {p.estimated_months} meses • {p.start_date ? formatDate(p.start_date) : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatMXN(p.total_amount)}</p>
                        <div className="flex gap-1 justify-end mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.advance_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                            Anticipo: {p.advance_paid ? 'Cobrado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documents Tab */}
          <div className="glass-card rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-brand-600" /> Documentos ({documents.length})
              </h3>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors">
                  {uploading ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-600"></div> : <Upload size={14} />}
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <div className="p-5">
              {documents.length === 0 ? (
                <div className="text-center py-10">
                  <File size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No hay documentos subidos.</p>
                  <p className="text-xs text-gray-400 mt-1">Puedes subir contratos, actas constitutivas o requerimientos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0 text-brand-600">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {formatDate(doc.created_at)} {doc.file_size ? `• ${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-brand-600 bg-white rounded-md shadow-sm border border-gray-100">
                          <Download size={14} />
                        </a>
                        <button onClick={() => handleDeleteDocument(doc.id, doc.file_url)} className="p-1.5 text-gray-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-gray-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
