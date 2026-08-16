import { Sidebar } from '@/components/features/layout/sidebar';
import { Header } from '@/components/features/layout/header';
import { CopilotFloatingWidget } from '@/components/features/ai/copilot-floating-widget';
import { AccessDeniedModal } from '@/components/features/layout/access-denied-modal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 py-4">{children}</main>
        <CopilotFloatingWidget />
        <AccessDeniedModal />
      </div>
    </div>
  );
}
