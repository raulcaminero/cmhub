'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/use-translation';
import { useModules } from '@/hooks/use-company';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  Receipt,
  Settings,
  Building2,
  Users,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useState, useEffect } from 'react';
import { getStoredTabForPath } from '@/hooks/use-tab-memory';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { showTaxModule, showNcfModule } = useModules();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const NAV_ITEMS = [
    { href: '/cmhub', label: t('nav.dashboard'), icon: LayoutDashboard, exact: true },
    { href: '/cmhub/sales', label: t('nav.sales'), icon: ShoppingCart },
    { href: '/cmhub/accounting', label: t('nav.accounting'), icon: BookOpen },
    { href: '/cmhub/contacts', label: t('nav.contacts'), icon: Users },
    ...(showTaxModule ? [{ href: '/cmhub/tax', label: t('nav.tax'), icon: Receipt }] : []),
    { href: '/cmhub/reports', label: t('nav.reports'), icon: BarChart3 },
    { href: '/cmhub/settings', label: t('nav.settings'), icon: Settings },
  ];

  const getTargetHref = (baseHref: string) => {
    if (!mounted || baseHref === '/cmhub') return baseHref;
    const storedTab = getStoredTabForPath(baseHref);
    return storedTab ? `${baseHref}?tab=${storedTab}` : baseHref;
  };

  const handleNavClick = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cmhub_nav_from_sidebar', 'true');
      } catch (e) {}
    }
  };

  return (
    <aside className="group/sidebar hidden md:flex w-16 hover:w-56 transition-all duration-300 ease-in-out flex-col bg-sidebar text-sidebar-foreground shrink-0 z-30 border-r border-sidebar-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-4 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
          <p className="font-semibold text-sm leading-tight">CMHub</p>
          <p className="text-[11px] text-sidebar-foreground/60 leading-tight">{t('nav.companyManagement')}</p>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const targetHref = getTargetHref(item.href);
          return (
            <Link
              key={item.href}
              href={targetHref as any}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all relative group/item',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
              title={item.label}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

