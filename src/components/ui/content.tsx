
import React from 'react';

interface ContentProps {
  children: React.ReactNode;
}

const Content = ({ children }: ContentProps) => {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      {children}
    </main>
  );
};

export default Content;
