'use client';

import React from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { User } from '@/types/announcement';
import { useAnnouncements } from './announcement-provider';
import { getUser } from '@/app/(dashboard)/[orgSlug]/users/actions';

interface CreatorAvatarProps {
  userId: string;
  initialUser?: User;
  size?: number;
  className?: string;
}

const COLORS = [
  '#fecaca', // red-200
  '#fed7aa', // orange-200
  '#fde68a', // yellow-200
  '#bbf7d0', // green-200
  '#99f6e4', // teal-200
  '#bae6fd', // sky-200
  '#c7d2fe', // indigo-200
  '#e9d5ff', // purple-200
  '#fbcfe8', // pink-200
];

const getStableColor = (id: string) => {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

export const CreatorAvatar: React.FC<CreatorAvatarProps> = ({ 
  userId, 
  initialUser, 
  size = 28,
  className = "" 
}) => {
  const { user: currentUser } = useAnnouncements();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_PRODUCTION_URL || "http://127.0.0.1:8000";

  // Fetch full user profile if initialUser is missing or doesn't have an image
  const { data: fetchedUser, isLoading } = useSWR<User>(
    !initialUser?.image && !initialUser?.avatar_url && currentUser?.accessToken && userId
      ? `user-${userId}` 
      : null,
    () => getUser(userId) as Promise<User>
  );

  const displayUser = fetchedUser || initialUser;
  const avatarUrl = displayUser?.avatar_url || displayUser?.image;
  const name = displayUser?.name || displayUser?.email || "User";
  const initials = name && name.length > 0 ? name[0].toUpperCase() : "?";
  const bgColor = getStableColor(userId);

  if (avatarUrl) {
    return (
      <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
        <Image
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          className="rounded-full border border-card-border object-cover w-full h-full "
        />
      </div>
    );
  }

  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold border border-card-border flex-shrink-0 transition-all ${className} ${isLoading ? 'animate-pulse' : ''}`}
      style={{ 
        width: size, 
        height: size, 
        fontSize: Math.max(8, size * 0.4),
        backgroundColor: isLoading ? 'var(--card)' : bgColor,
        color: '#18181b', // zinc-900 (darker text for pastel backgrounds)
        textShadow: '0 0 1px rgba(255,255,255,0.3)'
      }}
    >
      {isLoading ? "" : initials}
    </div>
  );
};
