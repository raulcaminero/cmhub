'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetInvoicesQuery, useCreateInvoiceMutation, useCollectInvoiceMutation, useVoidInvoiceMutation, Invoice } from '@/services/invoices.api';
import { useGetContactsQuery } from '@/services/contacts.api';
import { useGetAccountsQuery } from '@/services/accounting.api';
import { AccountType } from '@cmhub/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { validarDocFiscal } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Printer, Loader2 } from 'lucide-react';
import { NcfType } from '@cmhub/shared-types';
import { InvoicePrintDialog } from './invoice-print-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const NCF_TYPE_LABELS: Record<string, string> = {
  B01: 'Crédito Fiscal (B01)',
  B02: 'Consumo (B02)',
  E31: 'E-Crédito Fiscal (E31)',
  E32: 'E-Consumo (E32)',
};

const PAYMENT_METHODS = [
  { code: '01', label: '01 - Efectivo' },
  { code: '02', label: '02 - Cheques/Transferencias/Depósitos' },
  { code: '03', label: '03 - Tarjeta de Crédito/Débito' },
  { code: '04', label: '04 - Venta a Crédito' },
];

export function InvoicesView() {
  const companyId = useAppSelector((state) => state.company.active?.id);

  const { data: invoices, isLoading } = useGetInvoicesQuery(
    { companyId: companyId! },
    { skip: !companyId },
  );

  const { data: contacts } = useGetContactsQuery(
    { companyId: companyId! },
    { skip: !companyId },
  );

  const { data: accounts } = useGetAccountsQuery(
    { companyId: companyId!, type: AccountType.ASSET },
    { skip: !companyId },
  );

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();
  const [collectInvoice, { isLoading: isCollecting }] = useCollectInvoiceMutation();
  const [voidInvoice, { isLoading: isVoiding }] = useVoidInvoiceMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [invoiceToCollect, setInvoiceToCollect] = useState<Invoice | null>(null);
  const [collectBankId, setCollectBankId] = useState('');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectError, setCollectError] = useState('');

  async function handleCollectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !invoiceToCollect) return;
    setCollectError('');

    if (!collectBankId) {
      setCollectError('Por favor selecciona una cuenta de banco/caja.');
      return;
    }

    try {
      await collectInvoice({
        companyId,
        id: invoiceToCollect.id,
        body: {
          bankAccountId: collectBankId,
          paymentDate: collectDate,
        },
      }).unwrap();

      setCollectModalOpen(false);
      setInvoiceToCollect(null);
      setCollectBankId('');
    } catch (err: any) {
      setCollectError(err.data?.message || 'Error al registrar el cobro.');
    }
  }

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

  const bankAccounts = accounts?.filter((a) => a.code.startsWith('1101') || a.name.toLowerCase().includes('banco') || a.name.toLowerCase().includes('caja')) || [];

  function handleRncChange(val: string) {
    setClientRnc(val);
    const clean = val.replace(/\D/g, '');
    const found = contacts?.find((c) => c.rnc === clean);
    if (found) {
      setClientName(found.name);
    } else {
      setClientName('');
    }
  }
  const [errorMessage, setErrorMessage] = useState('');

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">Selecciona una empresa para ver la facturación.</p>
        </CardContent>
      </Card>
    );
  }

  function handleAmountChange(val: number) {
    setAmount(val);
    setItbis(Number((val * 0.18).toFixed(2))); // Suggest 18% ITBIS
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setErrorMessage('');

    const cleanRnc = clientRnc.replace(/\D/g, '');
    if (!validarDocFiscal(cleanRnc)) {
      setErrorMessage('El RNC/Cédula del cliente ingresado no es válido (debe tener 9 u 11 dígitos y cumplir con el dígito verificador).');
      return;
    }

    try {
      const created = await createInvoice({
        companyId,
        body: {
          clientRnc: cleanRnc,
          clientName,
          ncfType,
          amount: Number(amount),
          itbis: Number(itbis),
          paymentMethod,
          bankAccountId: paymentMethod !== '04' && bankAccountId ? bankAccountId : undefined,
          costOfGoodsSold: Number(costOfGoodsSold) > 0 ? Number(costOfGoodsSold) : undefined,
          itbisRetained: Number(itbisRetained) > 0 ? Number(itbisRetained) : undefined,
          isrRetained: Number(isrRetained) > 0 ? Number(isrRetained) : undefined,
        },
      }).unwrap();
      
      setIsOpen(false);
      setClientRnc('');
      setClientName('');
      setAmount(0);
      setItbis(0);
      setBankAccountId('');
      setCostOfGoodsSold(0);
      setItbisRetained(0);
      setIsrRetained(0);
      
      // Auto open print view on create
      setSelectedInvoice(created);
      setIsPrintOpen(true);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al emitir factura fiscal. Asegúrate de tener secuencias NCF registradas para este tipo.');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Facturas Emitidas (Ventas)</CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4" />
            Nueva Factura
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando facturas...</p>
          ) : !invoices || invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay facturas de ventas registradas en esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>NCF</TableHead>
                  <TableHead>Cliente (RNC)</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-right">ITBIS</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">
                      {new Date(inv.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className={`font-mono text-sm font-semibold ${inv.isVoided ? 'line-through text-muted-foreground' : 'text-primary'}`}>{inv.ncf}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{inv.clientName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{inv.clientRnc}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      RD$ {Number(inv.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      RD$ {Number(inv.itbis).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {inv.isVoided ? (
                        <span className="text-red-500 font-semibold">ANULADA</span>
                      ) : inv.paymentMethod === '04' ? (
                        inv.paymentDate ? (
                          <span className="text-emerald-600 font-medium">Cobrado ({new Date(inv.paymentDate).toLocaleDateString()})</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Crédito Pendiente</span>
                        )
                      ) : (
                        PAYMENT_METHODS.find((p) => p.code === inv.paymentMethod)?.label.split(' - ')[1] || inv.paymentMethod
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsPrintOpen(true);
                          }}
                          className="gap-1 h-7 text-xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
                        </Button>
                        {inv.paymentMethod === '04' && !inv.paymentDate && !inv.isVoided && (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setInvoiceToCollect(inv);
                              setCollectModalOpen(true);
                            }}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Cobrar
                          </Button>
                        )}
                        {!inv.isVoided && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`¿Estás seguro de que deseas ANULAR la factura NCF ${inv.ncf}? Esto reversará su impacto contable.`)) {
                                try {
                                  await voidInvoice({ companyId, id: inv.id }).unwrap();
                                } catch (err: any) {
                                  alert(err.data?.message || 'Error al anular la factura.');
                                }
                              }
                            }}
                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                          >
                            Anular
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Nueva Factura */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-xl shadow-xl border relative my-8">
            <h3 className="text-lg font-semibold mb-2">Emitir Factura de Venta</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ingresa los datos del cliente para emitir el comprobante fiscal y registrar la venta.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="client-rnc">RNC o Cédula del Cliente</Label>
                  <Input
                    id="client-rnc"
                    placeholder="Ej. 101123456 (9 u 11 dígitos)"
                    value={clientRnc}
                    onChange={(e) => handleRncChange(e.target.value)}
                    list="client-rnc-list"
                    required
                  />
                  <datalist id="client-rnc-list">
                    {contacts
                      ?.filter((c) => c.type === 'CLIENT' || c.type === 'BOTH')
                      .map((c) => (
                        <option key={c.id} value={c.rnc}>
                          {c.name}
                        </option>
                      ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="client-name">Nombre / Razón Social Cliente</Label>
                  <Input
                    id="client-name"
                    placeholder="Ej. Juan Pérez / Cliente General"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="inv-ncf-type">Tipo de NCF a Emitir</Label>
                  <select
                    id="inv-ncf-type"
                    value={ncfType}
                    onChange={(e) => setNcfType(e.target.value as NcfType)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={NcfType.B01}>Crédito Fiscal (B01)</option>
                    <option value={NcfType.B02}>Consumo (B02)</option>
                    <option value={NcfType.E31}>E-Crédito Fiscal (E31)</option>
                    <option value={NcfType.E32}>E-Consumo (E32)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inv-payment">Método de Pago</Label>
                  <select
                    id="inv-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {paymentMethod !== '04' && bankAccounts.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="inv-bank">Cuenta de Banco / Caja</Label>
                  <select
                    id="inv-bank"
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Por defecto (Caja General 1101)</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border p-4 rounded-md space-y-3 bg-muted/20">
                <span className="text-xs font-semibold block border-b pb-1">Desglose de Facturación (RD$)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="inv-total">Monto Total (Con ITBIS)</Label>
                    <Input
                      id="inv-total"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount || ''}
                      onChange={(e) => handleAmountChange(Number(e.target.value))}
                      required
                      min={0.01}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inv-itbis">ITBIS Cobrado (18%)</Label>
                    <Input
                      id="inv-itbis"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itbis || ''}
                      onChange={(e) => setItbis(Number(e.target.value))}
                      required
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1 mt-3">
                  <Label htmlFor="inv-cogs" className="text-xs font-semibold">Costo de Ventas (Opcional - Mercancía)</Label>
                  <Input
                    id="inv-cogs"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costOfGoodsSold || ''}
                    onChange={(e) => setCostOfGoodsSold(Number(e.target.value))}
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Si vendes artículos de inventario, indica su costo para darles salida del inventario (Cuenta 1105) y debitar el costo (Cuenta 6001).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="inv-itbis-ret" className="text-xs font-semibold">ITBIS Retenido por Cliente (Opcional)</Label>
                    <Input
                      id="inv-itbis-ret"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itbisRetained || ''}
                      onChange={(e) => setItbisRetained(Number(e.target.value))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inv-isr-ret" className="text-xs font-semibold">ISR Retenido por Cliente (Opcional)</Label>
                    <Input
                      id="inv-isr-ret"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={isrRetained || ''}
                      onChange={(e) => setIsrRetained(Number(e.target.value))}
                      className="font-mono text-sm"
                    />
                  </div>
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
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Emitiendo...
                    </>
                  ) : (
                    'Emitir Factura'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Cobro */}
      {collectModalOpen && invoiceToCollect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <h3 className="text-lg font-semibold mb-2">Registrar Cobro de Factura</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Registra el cobro de la factura a crédito <strong>NCF {invoiceToCollect.ncf}</strong> por un monto total de <strong>RD$ {Number(invoiceToCollect.amount).toFixed(2)}</strong>.
            </p>
            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="collect-date">Fecha de Cobro</Label>
                <Input
                  id="collect-date"
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="collect-bank">Cuenta de Banco / Caja de Entrada</Label>
                <select
                  id="collect-bank"
                  value={collectBankId}
                  onChange={(e) => setCollectBankId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Seleccionar cuenta...</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {collectError && (
                <p className="text-xs text-destructive font-medium">{collectError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCollectModalOpen(false);
                    setInvoiceToCollect(null);
                    setCollectError('');
                  }}
                  disabled={isCollecting}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isCollecting}>
                  {isCollecting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Cobro'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printer Dialog */}
      <InvoicePrintDialog
        invoice={selectedInvoice}
        isOpen={isPrintOpen}
        onClose={() => {
          setSelectedInvoice(null);
          setIsPrintOpen(false);
        }}
      />
    </div>
  );
}
