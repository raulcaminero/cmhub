import type { Account } from '@/services/accounting.api';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/use-translation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  const { t } = useTranslation();

  const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    ASSET: t('accounts.asset'),
    LIABILITY: t('accounts.liability'),
    EQUITY: t('accounts.equity'),
    REVENUE: t('accounts.revenue'),
    EXPENSE: t('accounts.expense'),
  };

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('common.noData')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('reports.code')}</TableHead>
          <TableHead>{t('reports.accountName')}</TableHead>
          <TableHead>{t('common.type')}</TableHead>
          <TableHead>{t('common.status')}</TableHead>
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
                {account.isActive ? t('common.active') : t('ncf.inactive')}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
