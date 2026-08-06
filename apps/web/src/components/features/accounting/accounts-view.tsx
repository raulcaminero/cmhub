'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery, useCreateAccountMutation } from '@/services/accounting.api';
import { AccountsTable } from './accounts-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { AccountType } from '@cmhub/shared-types';
import { useTranslation } from '@/lib/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AccountsView() {
  const { t } = useTranslation();
  const companyId = useAppSelector((state) => state.company.active?.id);

  const { data: accounts, isLoading } = useGetAccountsQuery(
    { companyId: companyId! },
    { skip: !companyId },
  );

  const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.ASSET);
  const [parentId, setParentId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-xs">{t('common.selectCompany')}</p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    try {
      await createAccount({
        companyId,
        body: {
          code,
          name,
          type,
          parentId: parentId || undefined,
        },
      }).unwrap();
      
      setIsOpen(false);
      setCode('');
      setName('');
      setParentId('');
      setType(AccountType.ASSET);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al crear la cuenta. Revisa que el código no esté duplicado.');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2.5 px-4">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            {t('accounts.title')}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t('accounts.subtitle')}</p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5 font-semibold shadow-2xs" onClick={() => setIsOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          {t('accounts.newAccount')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">{t('accounts.loading')}</p>
        ) : (
          <AccountsTable accounts={accounts ?? []} />
        )}
      </CardContent>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-5 rounded-lg w-full max-w-md shadow-xl border relative">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-1">{t('accounts.createTitle')}</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              {t('accounts.createSubtitle')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="acc-code" className="text-[11px] font-semibold text-muted-foreground">{t('accounts.accountCode')}</Label>
                <Input
                  id="acc-code"
                  placeholder="Ej. 110101 (Debe ser único)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="acc-name" className="text-[11px] font-semibold text-muted-foreground">{t('accounts.accountName')}</Label>
                <Input
                  id="acc-name"
                  placeholder="Ej. Caja General"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="acc-type" className="text-[11px] font-semibold text-muted-foreground">{t('accounts.accountType')}</Label>
                <Select value={type} onValueChange={(val) => setType(val as AccountType)}>
                  <SelectTrigger id="acc-type" className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder={t('accounts.accountType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AccountType.ASSET} className="text-xs">{t('accounts.asset')}</SelectItem>
                    <SelectItem value={AccountType.LIABILITY} className="text-xs">{t('accounts.liability')}</SelectItem>
                    <SelectItem value={AccountType.EQUITY} className="text-xs">{t('accounts.equity')}</SelectItem>
                    <SelectItem value={AccountType.REVENUE} className="text-xs">{t('accounts.revenue')}</SelectItem>
                    <SelectItem value={AccountType.EXPENSE} className="text-xs">{t('accounts.expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="acc-parent" className="text-[11px] font-semibold text-muted-foreground">{t('accounts.parentAccount')}</Label>
                <Select value={parentId || 'NONE'} onValueChange={(val) => setParentId(val === 'NONE' ? '' : val)}>
                  <SelectTrigger id="acc-parent" className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder={t('accounts.noParent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-xs">{t('accounts.noParent')}</SelectItem>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {errorMessage && (
                <p className="text-xs text-destructive font-medium">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage('');
                  }}
                  disabled={isCreating}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={isCreating} className="h-8 text-xs font-semibold shadow-2xs">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      {t('accounts.creating')}
                    </>
                  ) : (
                    t('accounts.createButton')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
