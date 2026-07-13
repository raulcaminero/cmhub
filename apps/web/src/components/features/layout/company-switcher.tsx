'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetCompaniesQuery, useCreateCompanyMutation } from '@/services/companies.api';
import { setActiveCompany, setCompanies } from '@/store/slices/company.slice';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TaxRegime } from '@cmhub/shared-types';

export function CompanySwitcher() {
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyList = useAppSelector((state) => state.company.list);

  const { data: companies, isLoading } = useGetCompaniesQuery();
  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [rnc, setRnc] = useState('');
  const [taxRegime, setTaxRegime] = useState('ORDINARIO');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync server data to Redux
  useEffect(() => {
    if (companies) {
      dispatch(setCompanies(companies));
    }
  }, [companies, dispatch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    
    const cleanRnc = rnc.replace(/\D/g, '');
    if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      setErrorMessage('El RNC debe tener 9 o 11 dígitos');
      return;
    }

    try {
      const result = await createCompany({
        name,
        rnc: cleanRnc,
        taxRegime: taxRegime as TaxRegime,
      }).unwrap();
      
      dispatch(setActiveCompany(result));
      setIsOpen(false);
      setName('');
      setRnc('');
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al crear la empresa. Verifica que el RNC sea único.');
    }
  }

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

      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 rounded-full shrink-0"
        title="Crear nueva empresa"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Crear nueva empresa</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Registra los datos fiscales de tu empresa para la contabilidad dominicana.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="comp-name">Razón Social</Label>
                <Input
                  id="comp-name"
                  placeholder="Ej. Mi Negocio SRL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comp-rnc">RNC (Cédula o RNC comercial)</Label>
                <Input
                  id="comp-rnc"
                  placeholder="Ej. 131234567 (9 u 11 dígitos)"
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comp-regime">Régimen Fiscal</Label>
                <select
                  id="comp-regime"
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ORDINARIO">Régimen Ordinario (ITBIS mensual)</option>
                  <option value="RST">RST (Simplificado)</option>
                </select>
              </div>

              {errorMessage && (
                <p className="text-xs text-destructive font-medium">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage('');
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Empresa'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
