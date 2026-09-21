'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery } from '@/services/accounting.api';
import {
  useGetReconciliationReportQuery,
  useImportStatementCsvMutation,
  useAutoMatchReconciliationMutation,
  useMatchReconciliationMutation,
  useUnmatchReconciliationMutation,
  useImportStatementOcrMutation,
  useLazyGetStatementOcrStatusQuery,
  useGetAiSuggestionQuery,
  useReconcileWithAccountMutation,
  useDeleteBankTransactionMutation,
  BankTransaction,
  LedgerLine,
} from '@/services/bank-reconciliation.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info,
  X,
  Sparkles,
  Link2,
  Camera,
  Loader2,
  Search,
  Landmark,
  Trash2,
  Plus,
} from 'lucide-react';
import { MobileDesktopNotice } from '@/components/ui/mobile-desktop-notice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/use-translation';
import { useCurrency } from '@/hooks/use-company';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ReconciliationView() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const formatCurrency = useCurrency();
  const [mounted, setMounted] = useState(false);

  // Selector bank accounts
  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId! },
    { skip: !companyId }
  );

  // Filter accounts representing bank assets
  const bankAccounts = accounts?.filter((a) => a.code.startsWith('1101')) || [];
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  // Report query
  const { data: report, isLoading: loadingReport, refetch } = useGetReconciliationReportQuery(
    { companyId: companyId!, accountId: selectedAccountId },
    { skip: !companyId || !selectedAccountId || !mounted }
  );

  // Mutations
  const [importStatement, { isLoading: isImporting }] = useImportStatementCsvMutation();
  const [importStatementOcr, { isLoading: isScanning }] = useImportStatementOcrMutation();
  const [getStatementOcrStatus] = useLazyGetStatementOcrStatusQuery();
  const [autoMatch, { isLoading: isMatching }] = useAutoMatchReconciliationMutation();
  const [matchManual] = useMatchReconciliationMutation();
  const [unmatch] = useUnmatchReconciliationMutation();
  const [deleteTx, { isLoading: isDeletingTx }] = useDeleteBankTransactionMutation();

  const [isPollingOcr, setIsPollingOcr] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [txToDelete, setTxToDelete] = useState<BankTransaction | null>(null);
  const [importTab, setImportTab] = useState<'preview' | 'raw'>('preview');
  const [csvContent, setCsvContent] = useState('');
  const [importError, setImportError] = useState('');

  const parsedCsvRows = useMemo(() => {
    if (!csvContent) return [];
    const lines = csvContent.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    
    const hasHeader = lines[0].toLowerCase().includes('fecha') || lines[0].toLowerCase().includes('date');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    return dataLines.map((line, idx) => {
      const parts = line.split(',');
      const date = parts[0]?.trim() || '';
      const description = parts[1]?.trim() || '';
      const reference = parts[2]?.trim() || '';
      const amountStr = parts[3]?.trim() || '0';
      const amount = parseFloat(amountStr);

      const isValidDate = Boolean(date && date.length >= 8 && !isNaN(Date.parse(date)));
      const isValidAmount = !isNaN(amount) && amount !== 0;
      const isValidDesc = Boolean(description && description.length >= 2);
      const isValid = isValidDate && isValidAmount && isValidDesc;

      return {
        id: idx,
        date: date || t('reconciliationView.invalidDate'),
        description: description || t('reconciliationView.noDescription'),
        reference,
        amount: isNaN(amount) ? 0 : amount,
        lineIndex: hasHeader ? idx + 1 : idx,
        isValid,
      };
    });
  }, [csvContent]);

  const hasInvalidCsvRows = useMemo(() => {
    return parsedCsvRows.some((r) => !r.isValid);
  }, [parsedCsvRows]);

  const handleRemoveCsvRow = (lineIndex: number) => {
    const lines = csvContent.split('\n');
    lines.splice(lineIndex, 1);
    setCsvContent(lines.join('\n'));
  };

  const filteredUnmatchedBank = useMemo(() => {
    if (!report?.unreconciledBankTransactions) return [];
    if (!searchTerm.trim()) return report.unreconciledBankTransactions;
    const term = searchTerm.toLowerCase();
    return report.unreconciledBankTransactions.filter(
      (tx: BankTransaction) =>
        tx.description.toLowerCase().includes(term) ||
        tx.amount.toString().includes(term) ||
        tx.date.toLowerCase().includes(term)
    );
  }, [report?.unreconciledBankTransactions, searchTerm]);

  // Import Dialog
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  // Row selection for manual match
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [selectedLedgerLine, setSelectedLedgerLine] = useState<LedgerLine | null>(null);

  // Result / Feedback Modal State
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'success' | 'error' | 'info';
    matchesCount?: number;
  } | null>(null);

  const { data: aiSuggestion, isLoading: loadingAi } = useGetAiSuggestionQuery(
    { companyId: companyId!, id: selectedBankTx?.id! },
    { skip: !companyId || !selectedBankTx }
  );
  const [reconcileWithAccount, { isLoading: isReconcilingAi }] = useReconcileWithAccountMutation();

  async function handleUnifiedFileSelect(file: File) {
    if (!file || !companyId) return;

    const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.endsWith('.pdf');

    if (isImageOrPdf) {
      setImportError('');
      setIsPollingOcr(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadRes = await importStatementOcr({
          companyId,
          body: formData,
        }).unwrap();

        const jobId = uploadRes.jobId;

        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await getStatementOcrStatus({ companyId, jobId }).unwrap();
            if (statusRes.status === 'completed' || statusRes.status === 'finished') {
              clearInterval(pollInterval);
              setIsPollingOcr(false);
              
              const result = statusRes.result;
              if (result && Array.isArray(result)) {
                const header = 'Fecha,Descripcion,Referencia,Monto\n';
                const rows = result.map(
                  (r) => `${new Date(r.date).toISOString().split('T')[0]},${r.description},,${r.amount}`
                ).join('\n');

                setCsvContent(header + rows);
                setImportTab('preview');
              } else {
                setImportError(t('reconciliationView.ocrExtractError'));
              }
            } else if (statusRes.status === 'failed') {
              clearInterval(pollInterval);
              setIsPollingOcr(false);
              setImportError(statusRes.result || t('reconciliationView.ocrFailedError'));
            }
          } catch (err: any) {
            clearInterval(pollInterval);
            setIsPollingOcr(false);
            setImportError(t('reconciliationView.ocrStatusError'));
          }
        }, 1000);
      } catch (err: any) {
        setIsPollingOcr(false);
        setImportError(err.data?.message || t('reconciliationView.ocrUploadError'));
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        setImportTab('preview');
      };
      reader.readAsText(file);
    }
  }

  if (!mounted) return null;
  if (!companyId) return null;

  const defaultCsvTemplate = `Fecha,Descripcion,Referencia,Monto`;

  async function handleImportCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setImportError('');
    if (!selectedAccountId) return;
    
    try {
      const res = await importStatement({
        companyId,
        accountId: selectedAccountId,
        csvContent,
      }).unwrap();
      setIsImportOpen(false);
      setCsvContent('');
      setResultModal({
        isOpen: true,
        type: 'success',
        title: t('reconciliationView.importedTitle'),
        description: t('reconciliationView.importedDesc', { count: res.importedCount }),
      });
    } catch (err: any) {
      setImportError(err.data?.message || t('reconciliationView.importError'));
    }
  }

  async function handleAutoMatch() {
    if (!companyId || !selectedAccountId) return;
    try {
      const res = await autoMatch({ companyId, accountId: selectedAccountId }).unwrap();
      setResultModal({
        isOpen: true,
        type: 'success',
        title: t('reconciliationView.autoMatchTitle'),
        description: t('reconciliationView.autoMatchDesc', { count: res.matchesCount }),
        matchesCount: res.matchesCount,
      });
    } catch (err: any) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: t('reconciliationView.autoMatchErrorTitle'),
        description: err.data?.message || t('reconciliationView.autoMatchError'),
      });
    }
  }

  async function handleManualMatch() {
    if (!companyId) return;
    if (!selectedBankTx || !selectedLedgerLine) return;
    try {
      await matchManual({
        companyId,
        bankTransactionId: selectedBankTx.id,
        journalEntryLineId: selectedLedgerLine.id,
      }).unwrap();
      setSelectedBankTx(null);
      setSelectedLedgerLine(null);
    } catch (err: any) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: t('reconciliationView.manualMatchErrorTitle'),
        description: err.data?.message || t('reconciliationView.manualMatchError'),
      });
    }
  }

  async function handleConfirmDeleteTx() {
    if (!companyId || !txToDelete) return;
    try {
      await deleteTx({ companyId, id: txToDelete.id }).unwrap();
      if (selectedBankTx?.id === txToDelete.id) {
        setSelectedBankTx(null);
      }
      setTxToDelete(null);
      refetch();
      setResultModal({
        isOpen: true,
        type: 'success',
        title: t('reconciliationView.deletedTitle'),
        description: t('reconciliationView.deletedDesc', { desc: txToDelete.description }),
      });
    } catch (err: any) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: t('reconciliationView.deleteErrorTitle'),
        description: err.data?.message || t('reconciliationView.deleteError'),
      });
    }
  }

  async function handleUnmatch(id: string) {
    if (!companyId) return;
    if (confirm(t('reconciliationView.unmatchConfirm'))) {
      try {
        await unmatch({ companyId, id }).unwrap();
      } catch (err: any) {
        setResultModal({
          isOpen: true,
          type: 'error',
          title: t('reconciliationView.unmatchErrorTitle'),
          description: err.data?.message || t('reconciliationView.unmatchError'),
        });
      }
    }
  }

  async function handleReconcileWithAi() {
    if (!companyId || !selectedBankTx || !aiSuggestion?.suggestedAccountId) return;
    try {
      await reconcileWithAccount({
        companyId,
        id: selectedBankTx.id,
        targetAccountId: aiSuggestion.suggestedAccountId,
      }).unwrap();
      setSelectedBankTx(null);
      setSelectedLedgerLine(null);
    } catch (err: any) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: t('reconciliationView.aiErrorTitle'),
        description: err.data?.message || t('reconciliationView.aiError'),
      });
    }
  }

  return (
    <div className="space-y-3">
      <MobileDesktopNotice message={t('reconciliationView.mobileNotice')} />

      {/* Header Description Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[32px] gap-3">
        <p className="text-xs text-muted-foreground">
          {t('reconciliationView.headerDesc')}
        </p>
      </div>

      {/* Account selector and imports */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border/70 shadow-2xs">
        <div className="flex items-center gap-3 min-w-[280px]">
          <Label htmlFor="rec-account" className="font-semibold text-xs whitespace-nowrap">
            {t('reconciliationView.bankAccount')}
          </Label>
          {bankAccounts.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              {t('reconciliationView.noBankAccounts')}
            </span>
          ) : (
            <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val)}>
              <SelectTrigger id="rec-account" className="h-9 min-w-[240px] text-xs">
                <SelectValue placeholder={t('reconciliationView.selectBank')} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Tooltip content={t('reconciliationView.importTooltip')}>
            <Button
              size="sm"
              className="h-9 gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
              onClick={() => setIsImportOpen(true)}
              disabled={!selectedAccountId}
            >
              <Upload className="w-4 h-4" />
              {t('reconciliationView.importScanStatement')}
            </Button>
          </Tooltip>

          <Tooltip content={t('reconciliationView.smartTooltip')}>
            <Button
              size="sm"
              className="h-9 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-xs transition-all text-white text-xs font-medium"
              onClick={handleAutoMatch}
              disabled={!selectedAccountId || isMatching}
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              {t('reconciliationView.smartReconciliation')}
            </Button>
          </Tooltip>

          <Tooltip content={t('reconciliationView.refreshTooltip')} align="end">
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={refetch}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {loadingReport ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('reconciliationView.loadingReport')}</p>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t('reconciliationView.booksBalance')}</CardTitle>
                <Info className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold tracking-tight font-mono text-purple-700 dark:text-purple-400">
                  {formatCurrency(report.booksBalance)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('reconciliationView.booksBalanceDesc')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t('reconciliationView.bankStatementBalance')}</CardTitle>
                <RefreshCw className="w-4 h-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold tracking-tight font-mono text-indigo-700 dark:text-indigo-400">
                  {formatCurrency(report.bankBalance)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('reconciliationView.bankStatementDesc')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t('reconciliationView.reconciledCount')}</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                  {report.reconciledBankTransactions?.length || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('reconciliationView.reconciledCountDesc')}</p>
              </CardContent>
            </Card>

            <Card className={Math.abs(report.difference) < 0.01 ? 'border-green-300 dark:border-green-800' : 'border-amber-300 dark:border-amber-800'}>
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t('reconciliationView.differenceTitle')}</CardTitle>
                {Math.abs(report.difference) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold tracking-tight font-mono ${Math.abs(report.difference) < 0.01 ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {formatCurrency(report.difference)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {Math.abs(report.difference) < 0.01 ? t('reconciliationView.balanced') : t('reconciliationView.requiresReview')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Manual Reconciliation Double Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank statement panel */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                  {t('reconciliationView.bankStatementPanel', { count: report.unreconciledBankCount })}
                </h3>
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('reconciliationView.searchStatement')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8 text-xs font-medium"
                  />
                </div>
              </div>
              <div className="border rounded-md max-h-[400px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <TableHead>{t('reconciliationView.dateHeader')}</TableHead>
                      <TableHead>{t('reconciliationView.descriptionHeader')}</TableHead>
                      <TableHead className="text-right">{t('common.amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnmatchedBank.slice(0, 50).map((tx: BankTransaction) => (
                      <TableRow
                        key={tx.id}
                        onClick={() => setSelectedBankTx(selectedBankTx?.id === tx.id ? null : tx)}
                        className={`cursor-pointer group ${selectedBankTx?.id === tx.id ? 'bg-indigo-100/50 hover:bg-indigo-100 dark:bg-indigo-950/40' : 'hover:bg-accent'}`}
                      >
                        <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                          {new Date(tx.date).toISOString().split('T')[0]}
                        </TableCell>
                        <TableCell className="text-[11px] max-w-[180px] truncate">
                          <p className="font-medium text-foreground">{tx.description}</p>
                          {tx.reference && <span className="text-[10px] text-muted-foreground font-mono">Ref: {tx.reference}</span>}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-[11px] font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right w-8 p-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTxToDelete(tx);
                            }}
                            title={t('reconciliationView.deleteTxTooltip')}
                            aria-label={t('reconciliationView.deleteTxTooltip')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {report.unreconciledBankTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                          {t('reconciliationView.noPendingBankTx')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {report.unreconciledBankTransactions.length > 50 && (
                  <div className="p-2 text-center text-[10px] text-muted-foreground bg-muted/20 border-t font-medium">
                    {t('reconciliationView.showingFirst', { count: report.unreconciledBankTransactions.length })}
                  </div>
                )}
              </div>
            </div>

            {/* Ledger lines panel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-600 shrink-0" />
                  {t('reconciliationView.ledgerPanel', { count: report.unreconciledBooksCount })}
                </h3>
              </div>
              <div className="border rounded-md max-h-[400px] overflow-y-auto bg-card">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <TableHead>{t('reconciliationView.dateHeader')}</TableHead>
                      <TableHead>{t('reconciliationView.referenceHeader')}</TableHead>
                      <TableHead className="text-right">{t('reconciliationView.debitHeader')}</TableHead>
                      <TableHead className="text-right">{t('reconciliationView.creditHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.unreconciledBooksLines.slice(0, 50).map((line) => (
                      <TableRow
                        key={line.id}
                        onClick={() => setSelectedLedgerLine(selectedLedgerLine?.id === line.id ? null : line)}
                        className={`cursor-pointer ${selectedLedgerLine?.id === line.id ? 'bg-purple-100/50 hover:bg-purple-100 dark:bg-purple-950/40' : 'hover:bg-accent'}`}
                      >
                        <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                          {new Date(line.date).toISOString().split('T')[0]}
                        </TableCell>
                        <TableCell className="text-[11px] max-w-[200px] truncate">
                          <p className="font-medium text-foreground">{line.entryDescription}</p>
                          {line.reference && <span className="text-[10px] text-muted-foreground font-mono">Ref: {line.reference}</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] font-bold text-emerald-600">
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] font-bold text-rose-600">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {report.unreconciledBooksLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                          {t('reconciliationView.noPendingLedger')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {report.unreconciledBooksLines.length > 50 && (
                  <div className="p-2 text-center text-[10px] text-muted-foreground bg-muted/20 border-t font-medium">
                    {t('reconciliationView.showingFirst', { count: report.unreconciledBooksLines.length })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Action Bar for manual match */}
          {(selectedBankTx || selectedLedgerLine) && (
            <div className="bg-accent border border-accent-foreground/20 p-4 rounded-lg flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-xxs text-muted-foreground font-semibold block uppercase">{t('reconciliationView.bankSelection')}</span>
                    {selectedBankTx ? (
                      <span className="font-semibold font-mono text-indigo-700 bg-indigo-100/30 px-2 py-0.5 rounded">
                        {selectedBankTx.description} ({formatCurrency(selectedBankTx.amount)})
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">{t('reconciliationView.noneSelected')}</span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <span className="text-xxs text-muted-foreground font-semibold block uppercase">{t('reconciliationView.ledgerSelection')}</span>
                    {selectedLedgerLine ? (
                      <span className="font-semibold font-mono text-purple-700 bg-purple-100/30 px-2 py-0.5 rounded">
                        {selectedLedgerLine.entryDescription} ({formatCurrency(selectedLedgerLine.debit || selectedLedgerLine.credit)})
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">{t('reconciliationView.noneSelected')}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedBankTx && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
                      onClick={() => setTxToDelete(selectedBankTx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('reconciliationView.deleteFromStatement')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBankTx(null);
                      setSelectedLedgerLine(null);
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleManualMatch}
                    disabled={!selectedBankTx || !selectedLedgerLine}
                  >
                    <Link2 className="w-4 h-4" />
                    {t('reconciliationView.reconcileSelection')}
                  </Button>
                </div>
              </div>

              {/* AI Suggestion Panel */}
              {selectedBankTx && (
                <div className="border-t pt-3 mt-1 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 bg-indigo-50/50 border border-indigo-100 p-2 rounded-lg flex-1">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                    <div>
                      <span className="font-bold block text-indigo-950">{t('reconciliationView.aiRecommendation')}</span>
                      <span className="text-muted-foreground text-xxs block leading-normal mt-0.5">
                        {loadingAi ? t('reconciliationView.aiAnalyzing') : aiSuggestion?.explanation || t('reconciliationView.aiNoSuggestion')}
                      </span>
                    </div>
                  </div>
                  {!loadingAi && aiSuggestion?.suggestedAccountId && (
                    <Button
                      size="sm"
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 self-center"
                      onClick={handleReconcileWithAi}
                      disabled={isReconcilingAi}
                    >
                      <Sparkles className="w-4 h-4" />
                      {isReconcilingAi ? t('reconciliationView.aiApplying') : t('reconciliationView.aiApply')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reconciled list */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {t('reconciliationView.reconciledTitle')}
            </h3>
            <div className="border rounded-md max-h-[300px] overflow-y-auto bg-card">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <TableHead>{t('reconciliationView.dateHeader')}</TableHead>
                    <TableHead>{t('reconciliationView.bankStatementHeader')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead>{t('reconciliationView.relatedJournal')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.reconciledBankTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                        {new Date(tx.date).toISOString().split('T')[0]}
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <p className="font-medium text-foreground">{tx.description}</p>
                        {tx.reference && <span className="text-[10px] text-muted-foreground font-mono">Ref: {tx.reference}</span>}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-[11px] font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        <p className="font-medium text-foreground">{tx.journalEntryDescription || '-'}</p>
                        {tx.journalEntryReference && <span className="font-mono text-[10px]">Ref: {tx.journalEntryReference}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnmatch(tx.id)}
                          className="h-7 text-destructive hover:bg-destructive/10 text-[11px] px-2 font-semibold"
                        >
                          {t('reconciliationView.unmatch')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {report.reconciledBankTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        {t('reconciliationView.noReconciled')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-lg border text-center space-y-4">
          <Info className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('reconciliationView.title')}</h2>
            <p className="text-muted-foreground">{t('reconciliationView.subtitle')}</p>
          </div>
        </div>
      )}

      {/* Modal Unificado de Importación y Escaneo */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-xl shadow-2xl border relative">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t('common.close')}</span>
            </button>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary shrink-0" />
                  {t('reconciliationView.importModalTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('reconciliationView.importModalSubtitle')}
                </p>
              </div>
              <div className="flex bg-muted/60 p-1 rounded-lg border text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setImportTab('preview')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    importTab === 'preview'
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('reconciliationView.tableTab', { count: parsedCsvRows.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('raw')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    importTab === 'raw'
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('reconciliationView.csvTextTab')}
                </button>
              </div>
            </div>

            {/* Smart File Dropzone / Compact Bar */}
            {isPollingOcr ? (
              <div className="mb-4 border-2 border-dashed border-primary/40 rounded-xl p-4 bg-muted/20 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs font-semibold">{t('reconciliationView.ocrLoading')}</p>
                <p className="text-[10px] text-muted-foreground">{t('reconciliationView.ocrLoadingSub')}</p>
              </div>
            ) : parsedCsvRows.length > 0 ? (
              <div className="mb-3 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                    {t('reconciliationView.txReadyForReview', { count: parsedCsvRows.length })}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {t('reconciliationView.appendMore')}
                  </span>
                </div>
                <label htmlFor="unified-file-input-compact" className="cursor-pointer font-semibold text-primary hover:underline flex items-center gap-1 text-xs shrink-0 bg-background px-2.5 py-1 rounded-md border shadow-2xs">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  {t('reconciliationView.addFile')}
                  <input
                    id="unified-file-input-compact"
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls,image/*,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUnifiedFileSelect(f);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="mb-4">
                <div className="border-2 border-dashed border-primary/40 hover:border-primary rounded-xl p-5 bg-muted/20 hover:bg-muted/30 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer relative group">
                  <input
                    id="unified-file-input"
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls,image/*,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUnifiedFileSelect(f);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="flex items-center justify-center gap-3 py-1 z-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-xs text-primary group-hover:underline block">
                        {t('reconciliationView.dropzoneText')}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {t('reconciliationView.dropzoneSub')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleImportCsv} className="space-y-3">
              {importTab === 'preview' ? (
                <div className="space-y-2">
                  {hasInvalidCsvRows && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>{t('reconciliationView.invalidRowsWarning')}</span>
                    </div>
                  )}
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto bg-card">
                    {parsedCsvRows.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            <TableHead className="w-24">{t('reconciliationView.dateHeader')}</TableHead>
                            <TableHead>{t('reconciliationView.conceptHeader')}</TableHead>
                            <TableHead className="text-right">{t('reconciliationView.amountHeaderRd')}</TableHead>
                            <TableHead className="text-right w-10">{t('reconciliationView.removeHeader')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedCsvRows.map((row) => (
                            <TableRow key={row.id} className={`text-[11px] ${!row.isValid ? 'bg-amber-50/70 dark:bg-amber-950/30' : 'hover:bg-accent/50'}`}>
                              <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                                {row.date}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-foreground">{row.description}</p>
                                  {!row.isValid && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-300">
                                      {t('reconciliationView.incompleteRow')}
                                    </span>
                                  )}
                                </div>
                                {row.reference && <span className="text-[10px] text-muted-foreground font-mono">Ref: {row.reference}</span>}
                              </TableCell>
                              <TableCell className={`text-right font-mono font-bold ${row.amount > 0 ? 'text-emerald-600' : row.amount < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                {formatCurrency(row.amount)}
                              </TableCell>
                              <TableCell className="text-right p-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleRemoveCsvRow(row.lineIndex)}
                                  title={t('reconciliationView.discardRow')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        {t('reconciliationView.noTxLoaded')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="csv-data" className="text-xs font-semibold text-muted-foreground">
                    {t('reconciliationView.csvEditLabel')}
                  </Label>
                  <textarea
                    id="csv-data"
                    rows={6}
                    className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={defaultCsvTemplate}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    required
                  />
                </div>
              )}

              {importError && (
                <p className="text-xs text-destructive font-semibold mt-2">{importError}</p>
              )}

              <div className="flex justify-end items-center pt-3 border-t mt-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => setIsImportOpen(false)}
                    disabled={isImporting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting || parsedCsvRows.length === 0 || hasInvalidCsvRows} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('reconciliationView.importing')}
                      </>
                    ) : (
                      t('reconciliationView.confirmImport', { count: parsedCsvRows.length })
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Resultado / Notificación Shadcn UI */}
      {resultModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative text-center flex flex-col items-center">
            <button
              type="button"
              onClick={() => setResultModal(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t('common.close')}</span>
            </button>

            {resultModal.type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 animate-bounce" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
            )}

            <h3 className="text-base font-bold text-foreground">
              {resultModal.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs leading-relaxed">
              {resultModal.description}
            </p>

            {resultModal.matchesCount !== undefined && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-3 w-full mb-4 font-mono text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase font-sans font-bold">{t('reconciliationView.matchedMovements')}</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">+{resultModal.matchesCount}</span>
              </div>
            )}

            <Button
              onClick={() => setResultModal(null)}
              className="w-full h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t('reconciliationView.understood')}
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Movimiento Bancario */}
      {txToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-md shadow-2xl border relative text-center flex flex-col items-center">
            <button
              type="button"
              onClick={() => setTxToDelete(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t('common.close')}</span>
            </button>

            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-foreground">
              {t('reconciliationView.deleteTxTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
              {t('reconciliationView.deleteTxDesc', { desc: txToDelete.description, amount: formatCurrency(txToDelete.amount) })}
            </p>

            <div className="flex gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTxToDelete(null)}
                className="flex-1 h-9 text-xs font-medium"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteTx}
                disabled={isDeletingTx}
                className="flex-1 h-9 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white gap-2"
              >
                {isDeletingTx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('reconciliationView.confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
