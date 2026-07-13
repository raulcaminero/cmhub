'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  Receipt,
  Settings,
  Building2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/accounting', label: 'Contabilidad', icon: BookOpen },
  { href: '/dashboard/contacts', label: 'Contactos', icon: Users },
  { href: '/dashboard/tax', label: 'Impuestos', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/dashboard/ncf', label: 'NCF', icon: FileText },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm">CMHub</p>
          <p className="text-xs text-sidebar-foreground/60">Gestión Empresarial</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
