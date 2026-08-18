'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useCreateInvoiceMutation } from '@/services/invoices.api';
import { useGetContactsQuery } from '@/services/contacts.api';
import { useGetAccountsQuery } from '@/services/accounting.api';
import { AccountType, NcfType } from '@cmhub/shared-types';
import { validarDocFiscal } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Save, Receipt, User, DollarSign, CreditCard, ShieldAlert } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import InvoiceLineEditor, { EditableLine } from '@/components/features/sales/invoice-line-editor';
import { useTranslation } from '@/lib/use-translation';
import { useCurrency } from '@/hooks/use-company';
import { ClientAutocomplete } from '@/components/features/sales/client-autocomplete';
import { MobileDesktopNotice } from '@/components/ui/mobile-desktop-notice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAYMENT_METHODS = [
  { code: '01', label: '01 - Efectivo' },
  { code: '02', label: '02 - Cheques / Transferencia / Depósito' },
  { code: '03', label: '03 - Tarjeta de Crédito / Débito' },
  { code: '04', label: '04 - Venta a Crédito (Cuentas por Cobrar)' },
];

export default function NewInvoicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const companyId = useAppSelector((state) => state.company.active?.id);
  const formatCurrency = useCurrency();
  const [mounted, setMounted] = useState(false);

  const { data: contacts } = useGetContactsQuery(
    { companyId: companyId! },
    { skip: !companyId }
  );

  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId!, type: AccountType.ASSET },
    { skip: !companyId }
  );
  const bankAccounts = accounts?.filter((a) => a.code.startsWith('1101')) || [];

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const [clientRnc, setClientRnc] = useState('');
  const [clientName, setClientName] = useState('');
  const [ncfType, setNcfType] = useState<NcfType>(NcfType.B01);
  const [amount, setAmount] = useState(0);
  const [itbis, setItbis] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('02');
  const [bankAccountId, setBankAccountId] = useState('');
  const [costOfGoodsSold, setCostOfGoodsSold] = useState(0);
  const [itbisRetained, setItbisRetained] = useState(0);
  const [isrRetained, setIsrRetained] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const [lines, setLines] = useState<EditableLine[]>([
    {
      id: `line-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 18,
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync lines to global total/ITBIS
  useEffect(() => {
    if (lines && lines.length > 0) {
      let subtotal = 0;
      let totalTax = 0;

      lines.forEach((line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unitPrice) || 0;
        const disc = Number(line.discount) || 0;
        const rate = Number(line.taxRate) || 0;

        const lineSubtotal = qty * price * (1 - disc / 100);
        const lineTax = lineSubtotal * (rate / 100);

        subtotal += lineSubtotal;
        totalTax += lineTax;
      });

      const grandTotal = subtotal + totalTax;
      setAmount(Math.round(grandTotal * 100) / 100);
      setItbis(Math.round(totalTax * 100) / 100);
    }
  }, [lines]);

  function handleRncChange(val: string) {
    setClientRnc(val);
    const matched = contacts?.find((c) => c.rnc === val);
    if (matched) {
      setClientName(matched.name);
    }
  }

  function handleAmountChange(val: number) {
    setAmount(val);
    const autoItbis = Math.round((val - val / 1.18) * 100) / 100;
    setItbis(autoItbis);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;

    setErrorMessage('');
    const isValidDoc = validarDocFiscal(clientRnc);

    if (clientRnc && !isValidDoc) {
      setErrorMessage(`El RNC/Cédula '${clientRnc}' no es válido.`);
      return;
    }

    if (ncfType === NcfType.B01 && !clientRnc) {
      setErrorMessage('Para comprobantes de Crédito Fiscal (B01 / E31), el RNC/Cédula del cliente es obligatorio.');
      return;
    }

    try {
      await createInvoice({
        companyId,
        body: {
          clientRnc,
          clientName,
          ncfType,
          amount: Number(amount),
          itbis: Number(itbis),
          costOfGoodsSold: Number(costOfGoodsSold),
          itbisRetained: Number(itbisRetained),
          isrRetained: Number(isrRetained),
          paymentMethod,
          bankAccountId: bankAccountId || undefined,
          lines: lines.map((l) => ({
            productId: l.productId || undefined,
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            discount: Number(l.discount),
            taxRate: Number(l.taxRate),
            total: (Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100)) * (1 + Number(l.taxRate) / 100),
          })),
        },
      }).unwrap();

      router.push('/cmhub/sales?tab=invoices' as any);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al emitir la factura. Verifica la secuencia NCF y saldos.');
    }
  }

  if (!mounted) return null;

  return (
    <div className="w-full space-y-6 pb-12">
      <MobileDesktopNotice message="La emisión de comprobantes fiscales NCF requiere completar múltiples renglones. Para llenar facturas de venta complejas con mayor comodidad, te recomendamos usar una computadora." />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/cmhub/sales?tab=invoices" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              Emitir Nueva Factura de Venta
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generación de comprobante fiscal NCF y registro contable de venta.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800 font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2-Column Dashboard Layout (Option B) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Column: Client & Line Items (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Client */}
          <section className="bg-card p-5 rounded-xl border border-border/70 shadow-2xs space-y-4">
            <div className="border-b border-border pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">1. Datos del Cliente</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Buscar Cliente Registrado</Label>
                <ClientAutocomplete
                  contacts={contacts}
                  clientRnc={clientRnc}
                  clientName={clientName}
                  onSelect={({ rnc, name }) => {
                    setClientRnc(rnc);
                    setClientName(name);
                  }}
                  onRncChange={(val) => setClientRnc(val)}
                  onNameChange={(val) => setClientName(val)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="client-rnc" className="text-xs font-semibold">RNC o Cédula *</Label>
                  <Input
                    id="client-rnc"
                    placeholder="Ej. 101123456"
                    value={clientRnc}
                    onChange={(e) => handleRncChange(e.target.value)}
                    className="text-xs h-10 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="client-name" className="text-xs font-semibold">Nombre / Razón Social *</Label>
                  <Input
                    id="client-name"
                    placeholder="Ej. Juan Pérez / Cliente General"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="text-xs h-10 font-medium"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Items & Products Table */}
          <section className="bg-card p-5 rounded-xl border border-border/70 shadow-2xs space-y-4">
            <div className="border-b border-border pb-2 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">2. Detalle de Ítems, Productos y Servicios</h2>
            </div>

            <InvoiceLineEditor companyId={companyId!} lines={lines} onChange={setLines} />
          </section>

          {/* Retentions Sub-panel */}
          <section className="bg-card p-5 rounded-xl border border-border/70 shadow-2xs space-y-4">
            <div className="border-b border-border pb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">Retenciones de Ley (Opcional)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-itbis-ret" className="text-xs font-medium text-muted-foreground">Retención ITBIS (Estado / Grandes Contribuyentes)</Label>
                <Input
                  id="inv-itbis-ret"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={itbisRetained || ''}
                  onChange={(e) => setItbisRetained(Number(e.target.value))}
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-isr-ret" className="text-xs font-medium text-muted-foreground">Retención ISR (Personas Físicas)</Label>
                <Input
                  id="inv-isr-ret"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={isrRetained || ''}
                  onChange={(e) => setIsrRetained(Number(e.target.value))}
                  className="font-mono text-xs h-9"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: NCF, Payment, Totals & Actions (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4">
          {/* NCF & Payment Config */}
          <div className="bg-card p-5 rounded-xl border border-border/70 shadow-2xs space-y-4">
            <div className="border-b border-border pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">Comprobante y Pago</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-ncf-type" className="text-xs font-semibold">Tipo de Comprobante (NCF) *</Label>
                <Select value={ncfType} onValueChange={(val) => setNcfType(val as NcfType)}>
                  <SelectTrigger id="inv-ncf-type" className="w-full text-xs h-10">
                    <SelectValue placeholder="Seleccionar NCF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NcfType.B01}>Crédito Fiscal (B01)</SelectItem>
                    <SelectItem value={NcfType.B02}>Consumo (B02)</SelectItem>
                    <SelectItem value={NcfType.E31}>E-Crédito Fiscal (E31)</SelectItem>
                    <SelectItem value={NcfType.E32}>E-Consumo (E32)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-payment" className="text-xs font-semibold">Forma de Pago *</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                  <SelectTrigger id="inv-payment" className="w-full text-xs h-10">
                    <SelectValue placeholder="Seleccionar forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod !== '04' && (
                <div className="space-y-1.5">
                  <Label htmlFor="inv-bank" className="text-xs font-semibold">Cuenta de Banco / Caja</Label>
                  <Select value={bankAccountId || 'default'} onValueChange={(val) => setBankAccountId(val === 'default' ? '' : val)}>
                    <SelectTrigger id="inv-bank" className="w-full text-xs h-10">
                      <SelectValue placeholder="Seleccionar cuenta de banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Por defecto (Caja General 1101)</SelectItem>
                      {bankAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Summary Totals */}
          <div className="bg-card p-5 rounded-xl border border-border/70 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground border-b border-border pb-2 uppercase tracking-wider">
              Resumen Factura
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Subtotal Neto:</span>
                <span className="font-mono font-medium">{formatCurrency(Math.max(0, amount - itbis))}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>ITBIS Facturado (18%):</span>
                <span className="font-mono font-medium">{formatCurrency(itbis)}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-foreground border-t border-border pt-3">
                <span>Total Facturado:</span>
                <span className="font-mono text-primary text-lg">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isCreating}
              className="w-full text-xs h-11 gap-2 font-bold shadow-md"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Emitir y Guardar Factura
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/cmhub/sales?tab=invoices' as any)}
              className="w-full text-xs h-10 border-primary text-primary hover:bg-primary/10 font-semibold"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
