import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Portal } from './portal';
import { spring, springTap } from '@/lib/motion';

interface UserLike {
    id?: string | number;
    name?: string | null;
    fullName?: string | null;
    full_name?: string | null;
    email?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
}

interface UserAvatarGroupProps {
    users: UserLike[];
    limit?: number;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function UserAvatarGroup({ users, limit = 3, size = 'md' }: UserAvatarGroupProps) {
    const displayUsers = users.slice(0, limit);
    const remaining = users.length - limit;
    
    const [hoveredUser, setHoveredUser] = useState<UserLike | null>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleMouseEnter = (user: UserLike, index: number) => {
        const el = triggerRefs.current[index];
        if (el) {
            const rect = el.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left + rect.width / 2,
            });
            setHoveredUser(user);
        }
    };

    const sizeClasses = {
        xs: 'h-6 w-6 text-[11px]',
        sm: 'h-8 w-8 text-[11px]',
        md: 'h-10 w-10 text-xs',
        lg: 'h-12 w-12 text-sm',
    };

    return (
        <div className="flex -space-x-2">
            {displayUsers.map((user, index) => {
                const name = user.name || user.fullName || user.full_name || 'User';
                const image = user.avatar_url || user.avatarUrl || user.image;
                const initials = (name || '?').charAt(0).toUpperCase();

                return (
                    <motion.div
                        key={user.id || index}
                        ref={(el) => { triggerRefs.current[index] = el; }}
                        onMouseEnter={() => handleMouseEnter(user, index)}
                        onMouseLeave={() => setHoveredUser(null)}
                        whileHover={{ y: -3, scale: 1.12, zIndex: 10, transition: spring }}
                        whileTap={{ scale: 0.94, transition: springTap }}
                        className={`group/avatar relative inline-block ${sizeClasses[size]} rounded-full ring-2 ring-background bg-foreground/[0.03] cursor-pointer transition-colors duration-300 hover:ring-[var(--pastel-purple)]/60`}
                    >
                        {image ? (
                            <Image
                                src={image}
                                alt={name}
                                fill
                                className="rounded-full object-cover text-transparent"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-500/20 font-medium text-emerald-400">
                                {initials}
                            </div>
                        )}
                    </motion.div>
                );
            })}
            
            {/* Portal Hover Popup */}
            {hoveredUser && (
                <Portal>
                    <div 
                        style={{
                            position: 'fixed',
                            top: `${coords.top - 8}px`,
                            left: `${coords.left}px`,
                            transform: 'translate(-50%, -100%)',
                        }}
                        className="mb-2 w-48 p-2 bg-card border border-card-border rounded-lg shadow-lg  animate-in fade-in slide-in-from-bottom-1 duration-200 z-[9999]"
                    >
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-foreground/[0.03] flex-shrink-0 relative overflow-hidden ring-1 ring-foreground/10">
                                {hoveredUser.avatar_url || hoveredUser.avatarUrl || hoveredUser.image ? (
                                    <Image src={hoveredUser.avatar_url || hoveredUser.avatarUrl || hoveredUser.image || ''} alt={hoveredUser.name || ''} fill className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-emerald-400 bg-emerald-500/10">
                                        {(hoveredUser.name || hoveredUser.fullName || hoveredUser.full_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{hoveredUser.name || hoveredUser.fullName || hoveredUser.full_name}</p>
                                {hoveredUser.email && <p className="text-[11px] text-text-muted truncate">{hoveredUser.email}</p>}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {remaining > 0 && (
                <motion.div
                    whileHover={{ y: -3, scale: 1.12, zIndex: 10, transition: spring }}
                    className={`relative ${sizeClasses[size]} rounded-full ring-2 ring-background bg-foreground/[0.03] flex items-center justify-center font-medium text-text-muted leading-none cursor-default`}
                >
                    +{remaining}
                </motion.div>
            )}
        </div>
    );
}
