'use client';

import React, { useState } from 'react';
import { Client } from '@/types/client';
import { FiPlus, FiSearch, FiX, FiCheck, FiEdit2, FiTrash2, FiMail, FiGlobe, FiUser, FiGrid, FiList } from 'react-icons/fi';
import { createClient, updateClient, deleteClient } from '@/app/(dashboard)/[orgSlug]/clients/actions';
import ClientCard from './client-card';
import ClientTable from './client-table';
import { toast } from '@/lib/toast';
import { useClients } from '@/hooks/use-clients';
import { createOptimisticClient, updateOptimisticClient } from '@/lib/optimistic-utils';
import { optimisticListRevalidate } from '@/lib/optimistic-swr';
import { useConfirm } from '@/providers/confirmation-provider';

import ClientsLoading from '@/app/(dashboard)/[orgSlug]/clients/loading';

interface ClientsPageClientProps {
  initialClients?: Client[];
}

export default function ClientsPageClient({ initialClients = [] }: ClientsPageClientProps) {
  const confirm = useConfirm();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // SWR Hook for background sync
  const { clients: serverClients, mutate, isLoading: clientsLoading } = useClients({ initialClients });

  const isLoading = clientsLoading && serverClients.length === 0;

  // Optimistic UI is driven by SWR's `optimisticData` in the handlers below, so
  // the rendered list is simply whatever SWR currently holds.
  const optimisticClients = serverClients;

  const filteredClients = optimisticClients.filter(client =>
    client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleCreate = async (formData: FormData) => {
    const newClient = createOptimisticClient(formData);
    setIsCreateModalOpen(false);

    try {
      await mutate(
        async () => {
          const result = await createClient(formData);
          if (!result?.success) throw new Error(result?.error || 'Failed to create client');
          return undefined;
        },
        optimisticListRevalidate<Client>(list => [newClient, ...list]),
      );
      toast.success('Client created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  const handleUpdate = async (formData: FormData) => {
    const editing = editingClient;
    if (!editing) return;

    const updatedClient = updateOptimisticClient(editing, formData);
    setEditingClient(null);

    try {
      await mutate(
        async () => {
          formData.set('id', editing.id);
          const result = await updateClient(formData);
          if (!result?.success) throw new Error(result?.error || 'Failed to update client');
          return undefined;
        },
        optimisticListRevalidate<Client>(list =>
          list.map(c => (c.id === editing.id ? updatedClient : c)),
        ),
      );
      toast.success('Client updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  const handleDelete = async (client: Client) => {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: `Are you sure you want to delete "${client.companyName}"? This action will remove all linked data for this client. This cannot be undone.`,
      confirmText: 'Delete Client',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await mutate(
        async () => {
          const formData = new FormData();
          formData.set('id', client.id);
          const result = await deleteClient(formData);
          if (!result?.success) throw new Error(result?.error || 'Failed to delete client');
          return undefined;
        },
        optimisticListRevalidate<Client>(list => list.filter(c => c.id !== client.id)),
      );
      toast.success('Client deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  if (isLoading) {
    return <ClientsLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Client ecosystem</h1>
          <p className="text-text-muted text-sm font-bold uppercase tracking-wider">Global company coordination & contact intelligence.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-sm font-bold text-foreground transition-all duration-300 hover-scale"
        >
          <div className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
            <FiPlus className="w-4 h-4" />
          </div>
          <span>Initialize Client</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        <div className="relative w-full lg:w-96 group">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors"/>
          <input
            type="text"
            placeholder="Search ecosystem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-sm"
          />
        </div>

        <div className="flex items-center space-x-1 bg-foreground/[0.03] p-1 rounded-xl border border-card-border h-11 flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all hover-scale ${viewMode === 'grid' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`}
            title="Grid view"
          >
            <FiGrid className="w-5 h-5"/>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all hover-scale ${viewMode === 'table' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`}
            title="Table view"
          >
            <FiList className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onEdit={setEditingClient} 
              onDelete={handleDelete}
              isPending={(client as any).pending}
            />
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full py-20 text-center glass rounded-2xl border border-card-border bg-card/50">
              <FiUser className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-muted font-medium">No clients found matching your search.</p>
            </div>
          )}
        </div>
      ) : (
        <ClientTable 
          clients={filteredClients} 
          onEdit={setEditingClient} 
          onDelete={handleDelete} 
        />
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="relative bg-background border border-card-border rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-foreground/[0.03]">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Initialize Client</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] transition-all"
              >
                <FiX size={20} />
              </button>
            </div>
            <form action={handleCreate} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Entity Designation *</label>
                <input type="text" name="companyName" required className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Primary Liaison</label>
                <input type="text" name="contactPersonName" className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Secure Email</label>
                <input type="email" name="contactEmail" className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" placeholder="contact@acme.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Digital Domain</label>
                <input type="url" name="websiteUrl" className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" placeholder="https://acme.com" />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-card-border">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all" title="Cancel">
                  Abort
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2" title="Create Client">
                  <FiCheck className="w-4 h-4" />
                  Establish Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setEditingClient(null)}
          />
          <div className="relative bg-background border border-card-border rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-foreground/[0.03]">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Refine Client</h2>
              <button 
                onClick={() => setEditingClient(null)} 
                className="p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] transition-all"
              >
                <FiX size={20} />
              </button>
            </div>
            <form action={handleUpdate} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Entity Designation *</label>
                <input type="text" name="companyName" required defaultValue={editingClient.companyName} className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Primary Liaison</label>
                <input type="text" name="contactPersonName" defaultValue={editingClient.contactPersonName || ''} className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Secure Email</label>
                <input type="email" name="contactEmail" defaultValue={editingClient.contactEmail || ''} className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Digital Domain</label>
                <input type="url" name="websiteUrl" defaultValue={editingClient.websiteUrl || ''} className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold" />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-card-border">
                <button type="button" onClick={() => setEditingClient(null)} className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all" title="Cancel">
                  Discard
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2" title="Save Changes">
                  <FiCheck className="w-4 h-4" />
                  Execute Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
