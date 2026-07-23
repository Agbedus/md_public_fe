'use client';

import React from 'react';
import { Client } from '@/types/client';
import { FiEdit2, FiTrash2, FiMail, FiGlobe, FiUser, FiCalendar } from 'react-icons/fi';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export default function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-card-border">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-foreground/[0.03] border-b border-card-border">
              <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider hidden lg:table-cell">Website</th>
              <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider hidden sm:table-cell">Added</th>
              <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-24 text-center">
                  <EmptyState icon={FiUser} title="No clients found" description="No clients match your search criteria." />
                </td>
              </tr>
            ) : (
              clients.map((client) => (
              <tr key={client.id} className="hover:bg-foreground/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                      {client.companyName[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-foreground uppercase tracking-tight">{client.companyName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-text-muted/50" />
                    {client.contactPersonName || 'No contact'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <FiMail className="text-text-muted/50" />
                    {client.contactEmail || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-muted hidden lg:table-cell">
                   {client.websiteUrl ? (
                      <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                        <FiGlobe className="text-text-muted/50" />
                        {client.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                   ) : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-text-muted hidden sm:table-cell">
                   <div className="flex items-center gap-2">
                    <FiCalendar className="text-text-muted/50" size={12} />
                    {client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : 'N/A'}
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(client)}
                      className="p-1.5 rounded-lg bg-foreground/[0.03] hover:bg-foreground/[0.06] text-text-muted hover:text-foreground border border-card-border transition-all"
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(client)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-card-border hover:border-rose-500/20 transition-all"
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
