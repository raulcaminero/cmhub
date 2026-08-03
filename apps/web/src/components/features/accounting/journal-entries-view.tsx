'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetJournalEntriesQuery,
  useCreateJournalEntryMutation,
  useGetAccountsQuery,
  usePostJournalEntryMutation,
  useVoidJournalEntryMutation,
} from '@/services/accounting.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2 } from 'lucide-react';
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

interface EntryLineForm {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

export function JournalEntriesView() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const formatCurrency = useCurrency();

  const { data: entries, isLoading: isLoadingEntries } = useGetJournalEntriesQuery(
    { companyId: companyId! },
    { skip: !companyId },
  );

  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId! },
    { skip: !companyId },
  );

  const [createEntry, { isLoading: isCreating }] = useCreateJournalEntryMutation();
  const [postEntry] = usePostJournalEntryMutation();
  const [voidEntry] = useVoidJournalEntryMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<EntryLineForm[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ]);
  const [errorMessage, setErrorMessage] = useState('');

  async function handlePost(id: string) {
    if (!companyId) return;
    try {
      await postEntry({ companyId, id }).unwrap();
    } catch (err: any) {
      alert(err.data?.message || 'Error al aprobar el asiento.');
    }
  }

  async function handleVoid(id: string) {
    if (!companyId) return;
    if (!confirm('¿Estás seguro de que deseas anular este asiento contable? Esta acción no se puede deshacer.')) return;
    try {
      await voidEntry({ companyId, id }).unwrap();
    } catch (err: any) {
      alert(err.data?.message || 'Error al anular el asiento.');
    }
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
        </CardContent>
      </Card>
    );
  }

  const totalDebits = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01 && totalDebits > 0;

  function handleAddLine() {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, description: '' }]);
  }

  function handleRemoveLine(index: number) {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  function handleLineChange(index: number, field: keyof EntryLineForm, value: any) {
    const updated = [...lines];
    if (field === 'debit') {
      updated[index].debit = Number(value) || 0;
      if (updated[index].debit > 0) updated[index].credit = 0;
    } else if (field === 'credit') {
      updated[index].credit = Number(value) || 0;
      if (updated[index].credit > 0) updated[index].debit = 0;
    } else {
      updated[index][field] = value;
    }
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    if (!isBalanced) {
      setErrorMessage('El asiento contable no está cuadrado. Débitos y créditos deben ser iguales.');
      return;
    }

    const cleanLines = lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description || undefined,
    }));

    if (cleanLines.some((l) => !l.accountId)) {
      setErrorMessage('Todas las líneas deben tener una cuenta contable seleccionada.');
      return;
    }

    try {
      await createEntry({
        companyId,
        body: {
          date,
          description,
          reference: reference || undefined,
          lines: cleanLines,
        },
      }).unwrap();
      
      setIsOpen(false);
      setDescription('');
      setReference('');
      setLines([
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ]);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al crear el asiento contable.');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{t('entries.title')}</CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('entries.newEntry')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <p className="text-sm text-muted-foreground">{t('entries.loading')}</p>
          ) : !entries || entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('entries.noEntries')}</p>
          ) : (
            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3 bg-card shadow-sm animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {entry.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold">{entry.description}</span>
                      
                      {entry.status === 'DRAFT' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">{t('entries.draft')}</span>
                      )}
                      {entry.status === 'POSTED' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">{t('entries.posted')}</span>
                      )}
                      {entry.status === 'VOIDED' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">{t('entries.voided')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Ref: {entry.reference || 'N/A'}</span>
                      <span>{t('common.date')}: {new Date(entry.date).toLocaleDateString()}</span>
                      
                      {entry.status === 'DRAFT' && (
                        <Button
                          variant="outline"
                          onClick={() => handlePost(entry.id)}
                          className="h-7 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        >
                          {t('entries.approve')}
                        </Button>
                      )}
                      {entry.status === 'POSTED' && (
                        <Button
                          variant="outline"
                          onClick={() => handleVoid(entry.id)}
                          className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        >
                          {t('entries.void')}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-8">{t('entries.account')}</TableHead>
                        <TableHead className="h-8">{t('entries.detail')}</TableHead>
                        <TableHead className="h-8 text-right">{t('entries.debit')}</TableHead>
                        <TableHead className="h-8 text-right">{t('entries.credit')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((line) => {
                        const acc = accounts?.find((a) => a.id === line.accountId);
                        return (
                          <TableRow key={line.id} className="hover:bg-transparent py-1">
                            <TableCell className="py-2 text-sm font-medium">
                              {acc ? `${acc.code} — ${acc.name}` : t('entries.unknownAccount')}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">
                              {line.description || '-'}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right font-mono">
                              {line.debit > 0 ? formatCurrency(Number(line.debit)) : '-'}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right font-mono">
                              {line.credit > 0 ? formatCurrency(Number(line.credit)) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nuevo Asiento */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-3xl shadow-xl border relative my-8">
            <h3 className="text-lg font-semibold mb-2">{t('entries.createTitle')}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('entries.createSubtitle')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="entry-date">{t('entries.date')}</Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="entry-desc">{t('entries.description')}</Label>
                  <Input
                    id="entry-desc"
                    placeholder="Ej. Registro de ventas del día"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="entry-ref">{t('entries.reference')}</Label>
                  <Input
                    id="entry-ref"
                    placeholder="Ej. Fact-001"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t('entries.accountDetails')}</span>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="gap-1 text-xs">
                    <Plus className="w-3 h-3" />
                    {t('entries.addLine')}
                  </Button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border-b pb-2 md:border-none md:pb-0">
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-xxs md:hidden">{t('entries.account')}</Label>
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          required
                        >
                          <option value="">{t('entries.selectAccount')}</option>
                          {accounts?.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xxs md:hidden">{t('entries.detail')}</Label>
                        <Input
                          placeholder={t('entries.notePlaceholder')}
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xxs md:hidden">{t('entries.debit')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                          className="h-9 text-xs text-right font-mono"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xxs md:hidden">{t('entries.credit')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                          className="h-9 text-xs text-right font-mono"
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-center pb-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(index)}
                          disabled={lines.length <= 2}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-between items-center text-xs font-semibold bg-muted p-2 rounded gap-2">
                  <div>
                    {t('entries.linesCount')} {lines.length}
                  </div>
                  <div className="flex gap-4 font-mono">
                    <div>{t('entries.debitsTotal')} {formatCurrency(totalDebits)}</div>
                    <div>{t('entries.creditsTotal')} {formatCurrency(totalCredits)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className={isBalanced ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                    {isBalanced ? t('entries.balanced') : `${t('entries.unbalanced')} ${formatCurrency(difference)}`}
                  </span>
                </div>
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
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={!isBalanced || isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      {t('entries.registering')}
                    </>
                  ) : (
                    t('entries.registerEntry')
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
