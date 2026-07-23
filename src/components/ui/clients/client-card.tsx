'use client';

import React from 'react';
import { Client } from '@/types/client';
import { FiEdit2, FiTrash2, FiMail, FiGlobe, FiUser, FiExternalLink, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

interface ClientCardProps {
    client: Client;
    onEdit: (client: Client) => void;
    onDelete: (client: Client) => void;
    isPending?: boolean;
}

export default function ClientCard({ client, onEdit, onDelete, isPending = false }: ClientCardProps) {
    return (
        <div 
            className={`group relative bg-card border border-card-border rounded-2xl p-6 transition-all duration-300 ${
                isPending ? 'opacity-70 grayscale-[0.5] scale-[0.98]' : 'hover:bg-foreground/[0.02]'
            }`}
        >
            {/* Pending Overlay/Indicator */}
            {isPending && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/40 backdrop-blur-[1px] rounded-2xl pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-card-border animate-pulse text-[11px] font-bold text-foreground uppercase tracking-wider ">
                        <div className="h-2 w-2 bg-emerald-400 rounded-full animate-ping"></div>
                        Saving...
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start mb-5">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-foreground tracking-tight truncate transition-all duration-300">
                        {client.companyName}
                    </h3>
                    {client.createdAt && (
                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                            <FiClock size={10} className="text-text-muted/50" />
                            <span>Added {format(new Date(client.createdAt), 'MMM yyyy')}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-2">
                    <button
                        onClick={() => onEdit(client)}
                        disabled={isPending}
                        className="p-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] text-text-muted hover:text-foreground border border-card-border transition-all active:scale-95 disabled:opacity-50"
                        title="Edit Client"
                    >
                        <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(client)}
                        disabled={isPending}
                        className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/20 text-text-muted hover:text-rose-400 border border-card-border hover:border-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                        title="Delete Client"
                    >
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Contact Person */}
                {client.contactPersonName && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.02] border border-card-border transition-colors group/item">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover/item:bg-indigo-500/20 transition-colors">
                            <FiUser className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold mb-0.5">Contact</span>
                            <span className="text-sm text-foreground font-medium">{client.contactPersonName}</span>
                        </div>
                    </div>
                )}

                {/* Email */}
                {client.contactEmail && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.02] border border-card-border transition-colors group/item">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover/item:bg-emerald-500/20 transition-colors">
                            <FiMail className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold mb-0.5">Email</span>
                            <span className="text-sm text-foreground font-medium truncate">{client.contactEmail}</span>
                        </div>
                    </div>
                )}

                {/* Website */}
                {client.websiteUrl && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.02] border border-card-border transition-colors group/item relative overflow-hidden">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover/item:bg-amber-500/20 transition-colors">
                            <FiGlobe className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold mb-0.5">Website</span>
                            <a 
                                href={client.websiteUrl.startsWith('http') ? client.websiteUrl : `https://${client.websiteUrl}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-sm text-text-muted hover:text-indigo-400 transition-colors truncate flex items-center gap-1.5"
                            >
                                {client.websiteUrl.replace(/^https?:\/\//, '')}
                                <FiExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
