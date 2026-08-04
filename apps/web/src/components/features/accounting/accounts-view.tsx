'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetAccountsQuery, useCreateAccountMutation } from '@/services/accounting.api';
import { AccountsTable } from './accounts-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { AccountType } from '@cmhub/shared-types';
import { useTranslation } from '@/lib/use-translation';

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
          <p className="text-muted-foreground text-sm">{t('common.selectCompany')}</p>
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-2.5">
        <CardTitle>{t('accounts.title')}</CardTitle>
        <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('accounts.newAccount')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('accounts.loading')}</p>
        ) : (
          <AccountsTable accounts={accounts ?? []} />
        )}
      </CardContent>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">{t('accounts.createTitle')}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('accounts.createSubtitle')}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="acc-code">{t('accounts.accountCode')}</Label>
                <Input
                  id="acc-code"
                  placeholder="Ej. 110101 (Debe ser único)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="acc-name">{t('accounts.accountName')}</Label>
                <Input
                  id="acc-name"
                  placeholder="Ej. Caja General"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="acc-type">{t('accounts.accountType')}</Label>
                <select
                  id="acc-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={AccountType.ASSET}>{t('accounts.asset')}</option>
                  <option value={AccountType.LIABILITY}>{t('accounts.liability')}</option>
                  <option value={AccountType.EQUITY}>{t('accounts.equity')}</option>
                  <option value={AccountType.REVENUE}>{t('accounts.revenue')}</option>
                  <option value={AccountType.EXPENSE}>{t('accounts.expense')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="acc-parent">{t('accounts.parentAccount')}</Label>
                <select
                  id="acc-parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">{t('accounts.noParent')}</option>
                  {accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
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
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
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
