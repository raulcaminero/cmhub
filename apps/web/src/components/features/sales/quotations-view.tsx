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
import { Plus, FileText, CheckCircle, ArrowRight, Loader2, Clock, Send, XCircle } from 'lucide-react';
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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">BORRADOR</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">ENVIADA</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">ACEPTADA</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700">RECHAZADA</span>;
      case 'CONVERTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">FACTURADA</span>;
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
        <Button onClick={handleOpenModal} size="sm" className="gap-2 font-semibold shadow-2xs shrink-0">
          <Plus className="w-4 h-4" />
          {t('sales.newQuotation')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">{t('common.loading')}</div>
          ) : !quotations || quotations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b uppercase text-[10px] text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">{t('sales.code')}</th>
                    <th className="py-3 px-4">{t('sales.client')}</th>
                    <th className="py-3 px-4">{t('common.date')}</th>
                    <th className="py-3 px-4">{t('sales.validUntil')}</th>
                    <th className="py-3 px-4 text-right">{t('sales.total')}</th>
                    <th className="py-3 px-4 text-center">{t('sales.status')}</th>
                    <th className="py-3 px-4 text-center">{t('sales.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.map((quot) => (
                    <tr key={quot.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-950">{quot.number}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{quot.clientName}</td>
                      <td className="py-2.5 px-4 text-slate-500">{new Date(quot.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5 px-4 text-slate-500">{quot.validUntil ? new Date(quot.validUntil).toLocaleDateString() : '-'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(Number(quot.total))}</td>
                      <td className="py-2.5 px-4 text-center">{getStatusBadge(quot.status)}</td>
                      <td className="py-2.5 px-4 text-center space-x-1">
                        {quot.status !== 'CONVERTED' && (
                          <>
                            <select
                              value={quot.status}
                              onChange={(e) => updateStatus({ companyId, id: quot.id, status: e.target.value as any })}
                              className="text-[10px] h-7 border rounded bg-white px-1 font-semibold text-slate-700"
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
                                className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">{t('sales.createQuotationTitle')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Nombre / Razón Social Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Constructora del Caribe SRL"
                    className="h-9"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">RNC / Cédula Cliente (Opcional)</Label>
                  <Input
                    value={clientRnc}
                    onChange={(e) => setClientRnc(e.target.value)}
                    placeholder="Ej: 131888999"
                    className="h-9 font-mono"
                  />
                </div>
              </div>

              {/* Line items editor */}
              <InvoiceLineEditor companyId={companyId} lines={lines} onChange={setLines} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label className="text-xs font-semibold">Válida Hasta (Opcional)</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Notas o Términos (Opcional)</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Condiciones de pago, validez de oferta, etc."
                    className="w-full h-16 rounded border border-input p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-red-600 font-semibold">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs">
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('sales.saveQuotation')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
