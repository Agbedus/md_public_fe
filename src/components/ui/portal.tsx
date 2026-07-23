'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

export function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    // Create portal root if it doesn't exist
    if (!document.getElementById(containerId)) {
      const portalRoot = document.createElement('div');
      portalRoot.id = containerId;
      document.body.appendChild(portalRoot);
    }
    
    return () => {
      // Clean up if needed, though usually better to keep the root
    };
  }, [containerId]);

  if (!mounted) return null;

  const target = document.getElementById(containerId);
  if (!target) return null;

  return createPortal(children, target);
}
