'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetCompaniesQuery } from '@/services/companies.api';
import { setActiveCompany, setCompanies } from '@/store/slices/company.slice';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

const getCountryFlag = (country?: string) => {
  switch (country) {
    case 'US': return '🇺🇸';
    case 'MX': return '🇲🇽';
    case 'CO': return '🇨🇴';
    case 'PE': return '🇵🇪';
    case 'CL': return '🇨🇱';
    case 'AR': return '🇦🇷';
    default: return '🇩🇴';
  }
};

export function CompanySwitcher() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyList = useAppSelector((state) => state.company.list);

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: companies, isLoading } = useGetCompaniesQuery();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync server data to Redux
  useEffect(() => {
    if (companies) {
      dispatch(setCompanies(companies));
    }
  }, [companies, dispatch]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-input bg-card text-foreground opacity-70">
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Active Company Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-input bg-card hover:bg-accent/60 text-foreground transition-all duration-150 shadow-sm outline-none group"
      >
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 text-xs font-bold">
          {activeCompany ? getCountryFlag(activeCompany.country) : <Building2 className="w-4 h-4" />}
        </div>

        <div className="text-left min-w-0">
          {isLoading ? (
            <span className="text-xs text-muted-foreground animate-pulse">Cargando empresas...</span>
          ) : !activeCompany ? (
            <span className="text-sm font-semibold text-muted-foreground">Seleccionar empresa</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-bold tracking-tight text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                {activeCompany.name}
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">
                {activeCompany.currency || 'DOP'}
              </span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-foreground' : 'group-hover:text-foreground'
          }`}
        />
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-card text-card-foreground border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Empresas disponibles</p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {companyList.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No tienes empresas registradas.
              </div>
            ) : (
              companyList.map((comp) => {
                const isSelected = activeCompany?.id === comp.id;
                const flag = getCountryFlag(comp.country);
                return (
                  <button
                    key={comp.id}
                    onClick={() => {
                      dispatch(setActiveCompany(comp));
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="min-w-0 pr-2 flex items-center gap-2">
                      <span className="text-base leading-none">{flag}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{comp.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {comp.rnc ? `ID/RNC: ${comp.rnc}` : ''} • {comp.currency || 'DOP'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t mt-1 pt-1 px-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/cmhub/settings?tab=my-companies' as any);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-muted text-primary rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Registrar Nueva Empresa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
