import type { Account } from '@/services/accounting.api';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  REVENUE: 'Ingreso',
  EXPENSE: 'Gasto',
};

const ACCOUNT_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ASSET: 'default',
  LIABILITY: 'destructive',
  EQUITY: 'secondary',
  REVENUE: 'default',
  EXPENSE: 'outline',
};

interface AccountsTableProps {
  accounts: Account[];
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay cuentas registradas.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell className="font-mono text-sm">{account.code}</TableCell>
            <TableCell>{account.name}</TableCell>
            <TableCell>
              <Badge variant={ACCOUNT_TYPE_VARIANTS[account.type] ?? 'outline'}>
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={account.isActive ? 'default' : 'outline'}>
                {account.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
