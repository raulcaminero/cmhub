'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useGetQuotationsQuery, 
  useCreateQuotationMutation, 
  useUpdateQuotationStatusMutation,
  Quotation 
} from '@/services/quotations.api';
import InvoiceLineEditor, { EditableLine } from './invoice-line-editor';
import { Plus, FileText, CheckCircle, ArrowRight, Loader2, Clock, Send, XCircle, X, Calendar } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { useCurrency } from '@/hooks/use-company';

interface QuotationsViewProps {
  companyId: string;
  externalOpenModal?: boolean;
  onCloseExternalModal?: () => void;
  onConvertQuotationToInvoice?: (quotation: Quotation) => void;
}

export default function QuotationsView({ companyId, externalOpenModal, onCloseExternalModal, onConvertQuotationToInvoice }: QuotationsViewProps) {
  const { t } = useTranslation();
  const formatCurrency = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    if (externalOpenModal) {
      setIsModalOpen(true);
    }
  }, [externalOpenModal]);
  const [clientRnc, setClientRnc] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
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
  const [formError, setFormError] = useState('');

  const { data: quotations, isLoading } = useGetQuotationsQuery({ companyId });
  const [createQuotation, { isLoading: isCreating }] = useCreateQuotationMutation();
  const [updateStatus] = useUpdateQuotationStatusMutation();

  const handleOpenModal = () => {
    setClientRnc('');
    setClientName('');
    setClientEmail('');
    setValidUntil('');
    setNotes('');
    setLines([
      {
        id: `line-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
      },
    ]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('El nombre del cliente es obligatorio.');
      return;
    }
    const validLines = lines.filter((l) => l.description.trim() && l.unitPrice > 0);
    if (validLines.length === 0) {
      setFormError('Debes ingresar al menos una línea válida con descripción y precio.');
      return;
    }

    setFormError('');
    try {
      await createQuotation({
        companyId,
        body: {
          clientRnc: clientRnc.trim() || undefined,
          clientName,
          clientEmail: clientEmail.trim() || undefined,
          validUntil: validUntil || undefined,
          notes: notes.trim() || undefined,
          lines: validLines.map((l) => ({
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            taxRate: l.taxRate,
          })),
        },
      }).unwrap();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.data?.message || 'Error al crear la cotización.');
    }
  };

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">BORRADOR</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400">ENVIADA</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400">ACEPTADA</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400">RECHAZADA</span>;
      case 'CONVERTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-400">FACTURADA</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[32px] gap-3">
        <p className="text-xs text-muted-foreground">
          {t('sales.quotationsDesc')}
        </p>
        <Button onClick={handleOpenModal} size="sm" className="h-8 text-xs gap-1.5 font-semibold shadow-2xs shrink-0">
          <Plus className="w-3.5 h-3.5" />
          {t('sales.newQuotation')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">{t('common.loading')}</div>
          ) : !quotations || quotations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    <th className="py-2.5 px-3">{t('sales.code')}</th>
                    <th className="py-2.5 px-3">{t('sales.client')}</th>
                    <th className="py-2.5 px-3">{t('common.date')}</th>
                    <th className="py-2.5 px-3">{t('sales.validUntil')}</th>
                    <th className="py-2.5 px-3 text-right">{t('sales.total')}</th>
                    <th className="py-2.5 px-3 text-center">{t('sales.status')}</th>
                    <th className="py-2.5 px-3 text-center">{t('sales.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {quotations.map((quot) => (
                    <tr key={quot.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[11px] text-foreground">{quot.number}</td>
                      <td className="py-2 px-3 font-medium text-[11px] text-foreground">{quot.clientName}</td>
                      <td className="py-2 px-3 text-[11px] text-muted-foreground font-mono">{new Date(quot.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-[11px] text-muted-foreground font-mono">{quot.validUntil ? new Date(quot.validUntil).toLocaleDateString() : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[11px] text-foreground">{formatCurrency(Number(quot.total))}</td>
                      <td className="py-2 px-3 text-center">{getStatusBadge(quot.status)}</td>
                      <td className="py-2 px-3 text-center space-x-1">
                        {quot.status !== 'CONVERTED' && (
                          <>
                            <select
                              value={quot.status}
                              onChange={(e) => updateStatus({ companyId, id: quot.id, status: e.target.value as any })}
                              className="text-[11px] h-7 border rounded bg-background px-2 font-medium text-foreground"
                            >
                              <option value="DRAFT">Borrador</option>
                              <option value="SENT">Enviada</option>
                              <option value="ACCEPTED">Aceptada</option>
                              <option value="REJECTED">Rechazada</option>
                            </select>
                            {onConvertQuotationToInvoice && (
                              <Button
                                size="sm"
                                onClick={() => onConvertQuotationToInvoice(quot)}
                                className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              >
                                Convertir a Factura <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border relative overflow-hidden">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            <div className="pr-6 mb-4 border-b pb-3 shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                {t('sales.createQuotationTitle')}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crea un presupuesto o cotización formal para enviar a tus clientes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto space-y-3 text-xs pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Nombre / Razón Social Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Constructora del Caribe SRL"
                    className="h-9 text-xs font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">RNC / Cédula Cliente (Opcional)</Label>
                  <Input
                    value={clientRnc}
                    onChange={(e) => setClientRnc(e.target.value)}
                    placeholder="Ej: 131888999"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Line items editor */}
              <InvoiceLineEditor companyId={companyId} lines={lines} onChange={setLines} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1">
                  <Label htmlFor="validUntilDate" className="text-xs font-semibold text-muted-foreground">Válida Hasta (Opcional)</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="validUntilDate"
                      type="date"
                      aria-label="Fecha válida hasta"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      className="h-9 text-xs font-medium pr-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <button
                      type="button"
                      aria-label="Abrir calendario para seleccionar fecha"
                      onClick={() => {
                        const input = document.getElementById('validUntilDate') as HTMLInputElement;
                        input?.showPicker?.();
                      }}
                      className="absolute right-2.5 text-muted-foreground hover:text-primary p-0.5 rounded transition-colors"
                      title="Seleccionar fecha del calendario"
                    >
                      <Calendar className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Notas o Términos (Opcional)</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Condiciones de pago, validez de oferta, etc."
                    className="w-full h-16 rounded-md border border-input bg-background p-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-destructive font-semibold mt-2">{formError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t mt-4 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('sales.saveQuotation')
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
