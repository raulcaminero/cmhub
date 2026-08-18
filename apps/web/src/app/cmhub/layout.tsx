'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/features/layout/sidebar';
import { Header } from '@/components/features/layout/header';
import { CopilotFloatingWidget } from '@/components/features/ai/copilot-floating-widget';
import { AccessDeniedModal } from '@/components/features/layout/access-denied-modal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4">{children}</main>
        <CopilotFloatingWidget />
        <AccessDeniedModal />
      </div>
    </div>
  );
}
