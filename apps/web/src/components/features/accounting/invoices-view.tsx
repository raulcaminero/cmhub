'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetInvoicesQuery, useCreateInvoiceMutation, Invoice } from '@/services/invoices.api';
import { useGetContactsQuery } from '@/services/contacts.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [clientRnc, setClientRnc] = useState('');
  const [clientName, setClientName] = useState('');
  const [ncfType, setNcfType] = useState<NcfType>(NcfType.B01);
  const [amount, setAmount] = useState(0);
  const [itbis, setItbis] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('01');

  function handleRncChange(val: string) {
    setClientRnc(val);
    const clean = val.replace(/\D/g, '');
    const found = contacts?.find((c) => c.rnc === clean);
    if (found) {
      setClientName(found.name);
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
    if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      setErrorMessage('El RNC/Cédula del cliente debe tener 9 o 11 dígitos.');
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
        },
      }).unwrap();
      
      setIsOpen(false);
      setClientRnc('');
      setClientName('');
      setAmount(0);
      setItbis(0);
      
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
                    <TableCell className="font-mono text-sm font-semibold text-primary">{inv.ncf}</TableCell>
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
                      {PAYMENT_METHODS.find((p) => p.code === inv.paymentMethod)?.label.split(' - ')[1] || inv.paymentMethod}
                    </TableCell>
                    <TableCell className="text-right">
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
