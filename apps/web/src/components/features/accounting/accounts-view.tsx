'use client';

import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery } from '@/services/accounting.api';
import { AccountsTable } from './accounts-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AccountsView() {
  const companyId = useAppSelector((state) => state.company.active?.id);

  const { data: accounts, isLoading } = useGetAccountsQuery(
    { companyId: companyId! },
    { skip: !companyId },
  );

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">Selecciona una empresa para ver el plan de cuentas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan de Cuentas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando cuentas...</p>
        ) : (
          <AccountsTable accounts={accounts ?? []} />
        )}
      </CardContent>
    </Card>
  );
}
