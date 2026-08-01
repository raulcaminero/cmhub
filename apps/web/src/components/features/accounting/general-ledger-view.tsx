'use client';

import { useState, useMemo } from 'react';
import { useGetAccountsQuery } from '@/services/accounting.api';
import { useGetGeneralLedgerQuery } from '@/services/reports.api';
import { useTranslation } from '@/lib/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookMarked, Download, Loader2, Search } from 'lucide-react';

interface Props {
  companyId: string;
}

const fmt = (n: number) =>
  n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function GeneralLedgerView({ companyId }: Props) {
  const { t } = useTranslation();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ── Applied filters (only update when user clicks "Consultar") ────────────
  const [appliedFilters, setAppliedFilters] = useState<{
    accountId: string;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: accounts, isLoading: isLoadingAccounts } = useGetAccountsQuery({ companyId });

  const { data: ledger, isLoading: isLoadingLedger, isFetching } = useGetGeneralLedgerQuery(
    {
      companyId,
      accountId: appliedFilters?.accountId ?? '',
      startDate: appliedFilters?.startDate,
      endDate: appliedFilters?.endDate,
    },
    { skip: !appliedFilters?.accountId },
  );

  // ── Sorted accounts for selector ─────────────────────────────────────────
  const sortedAccounts = useMemo(
    () => (accounts ? [...accounts].sort((a, b) => a.code.localeCompare(b.code)) : []),
    [accounts],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    setAppliedFilters({
      accountId: selectedAccountId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleExportCsv = () => {
    if (!ledger) return;

    const { account, movements, totals } = ledger;
    const header = `Libro Mayor — [${account.code}] ${account.name}\n`;
    const colHeaders = 'Fecha,N° Asiento,Descripción,Referencia,Débito,Crédito,Saldo\n';
    const rows = movements.map((m) =>
      [
        new Date(m.date).toLocaleDateString('es-DO'),
        m.journalEntryId.slice(-8).toUpperCase(),
        `"${m.description.replace(/"/g, '""')}"`,
        m.reference ?? '',
        m.debit.toFixed(2),
        m.credit.toFixed(2),
        m.balance.toFixed(2),
      ].join(','),
    );
    const totalsRow = `,,Totales,,${totals.debit.toFixed(2)},${totals.credit.toFixed(2)},${totals.balance.toFixed(2)}`;

    const csvContent = header + colHeaders + rows.join('\n') + '\n' + totalsRow;
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LibroMayor_${account.code}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isLoading = isLoadingLedger || isFetching;

  return (
    <div className="space-y-5">
      {/* ── Filter panel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="w-4 h-4 text-indigo-600" />
            {t('ledger.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="gl-filter-form"
            onSubmit={handleQuery}
            className="flex flex-wrap items-end gap-4"
            aria-label={t('ledger.title')}
          >
            {/* Account selector */}
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <Label htmlFor="gl-account-select">{t('ledger.selectAccount')}</Label>
              <select
                id="gl-account-select"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                aria-required="true"
                disabled={isLoadingAccounts}
              >
                <option value="">
                  {isLoadingAccounts ? t('common.loading') : t('ledger.selectAccountPlaceholder')}
                </option>
                {sortedAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start date */}
            <div className="space-y-1.5">
              <Label htmlFor="gl-start-date">{t('ledger.fromDate')}</Label>
              <input
                id="gl-start-date"
                type="date"
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End date */}
            <div className="space-y-1.5">
              <Label htmlFor="gl-end-date">{t('ledger.toDate')}</Label>
              <input
                id="gl-end-date"
                type="date"
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Button
              id="gl-query-btn"
              type="submit"
              disabled={!selectedAccountId || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {t('common.query')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {appliedFilters?.accountId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              {ledger && !isLoading ? (
                <CardTitle className="text-base">
                  [{ledger.account.code}] {ledger.account.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({t('ledger.movementsCount', { count: ledger.movements.length })})
                  </span>
                </CardTitle>
              ) : (
                <CardTitle className="text-base text-muted-foreground">{t('common.loading')}</CardTitle>
              )}
            </div>
            {ledger && ledger.movements.length > 0 && !isLoading && (
              <Button
                id="gl-export-csv-btn"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-2 shrink-0"
                aria-label={t('common.exportCsv')}
              >
                <Download className="w-4 h-4" />
                {t('common.exportCsv')}
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div
                className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('common.loading')}
              </div>
            ) : !ledger || ledger.movements.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"
                role="status"
              >
                <BookMarked className="w-10 h-10 opacity-25" />
                <p className="text-sm">
                  {t('ledger.noMovements')}
                </p>
                <p className="text-xs">
                  {t('ledger.postedOnlyNote')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table
                  aria-label={`Libro Mayor de cuenta ${ledger.account.code} ${ledger.account.name}`}
                >
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="whitespace-nowrap">{t('common.date')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('ledger.entryNo')}</TableHead>
                      <TableHead>{t('common.description')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('ledger.reference')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t('ledger.debit')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t('ledger.credit')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap font-semibold">
                        {t('ledger.runningBalance')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.movements.map((line, idx) => (
                      <TableRow key={line.id} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(line.date).toLocaleDateString('es-DO')}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          ...{line.journalEntryId.slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell
                          className="text-sm max-w-[280px] truncate"
                          title={line.description}
                        >
                          {line.description}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {line.reference ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {line.debit > 0 ? (
                            <span className="text-emerald-600">{fmt(line.debit)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {line.credit > 0 ? (
                            <span className="text-rose-500">{fmt(line.credit)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold text-sm ${
                            line.balance >= 0 ? 'text-slate-800' : 'text-rose-600'
                          }`}
                        >
                          {line.balance < 0
                            ? `(${fmt(Math.abs(line.balance))})`
                            : fmt(line.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/60 font-semibold">
                      <TableCell colSpan={4} className="text-right text-sm">
                        {t('ledger.totals')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {fmt(ledger.totals.debit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-rose-600">
                        {fmt(ledger.totals.credit)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          ledger.totals.balance >= 0 ? 'text-indigo-700' : 'text-rose-700'
                        }`}
                      >
                        {ledger.totals.balance < 0
                          ? `(${fmt(Math.abs(ledger.totals.balance))})`
                          : fmt(ledger.totals.balance)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
