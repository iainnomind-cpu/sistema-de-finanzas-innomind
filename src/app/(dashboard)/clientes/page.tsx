'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ClientForm from '@/components/clients/ClientForm';
import type { Client } from '@/lib/types/database';
import { getStatusColor, getStatusLabel } from '@/lib/utils/format';
import {
  Users, Plus, Search, Trash2, Pencil, Eye,
  Building2, User as UserIcon, CircleDot
} from 'lucide-react';
import Link from 'next/link';

export default function ClientesPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');

  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast('Error cargando clientes', 'error');
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchClients();
  }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      toast(`Error: ${error.message}`, 'error');
    } else {
      toast('Cliente eliminado', 'success');
      fetchClients();
    }
    setDeleteId(null);
  }

  function openEdit(client: Client) {
    setEditClient(client);
    setShowForm(true);
  }

  function openCreate() {
    setEditClient(null);
    setShowForm(true);
  }

  // Filter and search
  const filtered = clients.filter((c) => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.rfc?.toLowerCase().includes(search.toLowerCase()) ||
      c.sector?.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filterType === 'todos' ||
      (filterType === 'activos' && c.classification === 'activo') ||
      (filterType === 'recurrentes' && c.classification === 'recurrente') ||
      (filterType === 'inactivos' && c.classification === 'inactivo');

    return matchSearch && matchFilter;
  });

  const filters = ['todos', 'activos', 'recurrentes', 'inactivos'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 transition-all shadow-sm"
        >
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RFC, sector..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all
                ${filterType === f ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 skeleton rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {search || filterType !== 'todos' ? 'Sin resultados para esta búsqueda' : 'No hay clientes registrados'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {!search && filterType === 'todos' && 'Agrega tu primer cliente para comenzar'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Sector</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Contacto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Estado</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client, i) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                          {client.type === 'empresa' ? <Building2 size={16} /> : <UserIcon size={16} />}
                        </div>
                        <div>
                          <Link href={`/clientes/${client.id}`} className="text-sm font-semibold text-brand-900 hover:text-brand-600 transition-colors">
                            {client.name}
                          </Link>
                          {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{getStatusLabel(client.type)}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">{client.sector || '—'}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div>
                        <p className="text-xs text-gray-600">{client.contact_name || '—'}</p>
                        {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(client.classification)}`}>
                        <CircleDot size={10} />
                        {getStatusLabel(client.classification)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Ver Perfil"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => openEdit(client)}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(client.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      <ClientForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditClient(null); }}
        onSaved={fetchClients}
        editClient={editClient}
      />

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-fade-in">
            <h3 className="text-lg font-semibold text-brand-900 mb-2">¿Eliminar cliente?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer. Los proyectos vinculados perderán la referencia al cliente.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
