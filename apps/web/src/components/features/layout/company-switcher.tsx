'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetCompaniesQuery } from '@/services/companies.api';
import { setActiveCompany, setCompanies } from '@/store/slices/company.slice';
import { Building2 } from 'lucide-react';

export function CompanySwitcher() {
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyList = useAppSelector((state) => state.company.list);

  const { data: companies, isLoading } = useGetCompaniesQuery();

  // Sync server data to Redux
  useEffect(() => {
    if (companies) {
      dispatch(setCompanies(companies));
    }
  }, [companies, dispatch]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Cargando empresas...</span>
        ) : companyList.length === 0 ? (
          <span className="text-sm font-medium text-muted-foreground">Sin empresas</span>
        ) : (
          <select
            value={activeCompany?.id ?? ''}
            onChange={(e) => {
              const selected = companyList.find((c) => c.id === e.target.value);
              if (selected) dispatch(setActiveCompany(selected));
            }}
            className="bg-transparent text-sm font-medium focus:outline-none border-none py-1 cursor-pointer hover:text-primary transition-colors pr-2"
          >
            {companyList.map((comp) => (
              <option key={comp.id} value={comp.id} className="bg-background text-foreground">
                {comp.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
