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
          <TableHead className="text-[11px] font-bold">{t('reports.code')}</TableHead>
          <TableHead className="text-[11px] font-bold">{t('reports.accountName')}</TableHead>
          <TableHead className="text-[11px] font-bold">{t('common.type')}</TableHead>
          <TableHead className="text-[11px] font-bold">{t('common.status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell className="font-mono text-[11px]">{account.code}</TableCell>
            <TableCell className="text-[11px] font-medium">{account.name}</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-muted/40 text-foreground">
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </span>
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  account.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {account.isActive ? t('common.active') : t('ncf.inactive')}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
