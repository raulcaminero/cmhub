'use client';

import { useAppSelector } from '@/store/hooks';
import { Building2 } from 'lucide-react';

export function CompanySwitcher() {
  const activeCompany = useAppSelector((state) => state.company.active);

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {activeCompany?.name ?? 'Selecciona una empresa'}
      </span>
    </div>
  );
}
