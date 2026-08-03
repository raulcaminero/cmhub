'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Package } from 'lucide-react';
import { useGetProductsQuery, Product } from '@/services/products.api';
import { useCurrency } from '@/hooks/use-company';

export interface EditableLine {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  cost?: number;
}

interface InvoiceLineEditorProps {
  companyId: string;
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
}

export default function InvoiceLineEditor({ companyId, lines, onChange }: InvoiceLineEditorProps) {
  const { data: products } = useGetProductsQuery({ companyId });
  const formatCurrency = useCurrency();

  const handleAddLine = () => {
    const newLine: EditableLine = {
      id: `line-${Date.now()}-${Math.random()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 18,
      cost: 0,
    };
    onChange([...lines, newLine]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length === 1) return;
    onChange(lines.filter((l) => l.id !== id));
  };

  const handleLineChange = (id: string, field: keyof EditableLine, value: any) => {
    onChange(
      lines.map((l) => {
        if (l.id !== id) return l;

        if (field === 'productId') {
          const selectedProd = products?.find((p) => p.id === value);
          if (selectedProd) {
            return {
              ...l,
              productId: value,
              description: selectedProd.name,
              unitPrice: Number(selectedProd.price),
              taxRate: Number(selectedProd.taxRate),
              cost: selectedProd.cost ? Number(selectedProd.cost) : 0,
            };
          }
          return { ...l, productId: value };
        }

        return { ...l, [field]: value };
      })
    );
  };

  // Calculate live line subtotal
  const getLineSubtotal = (l: EditableLine) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPrice) || 0;
    const disc = Number(l.discount) || 0;
    return qty * price * (1 - disc / 100);
  };

  // Calculate live line ITBIS
  const getLineItbis = (l: EditableLine) => {
    const subtotal = getLineSubtotal(l);
    const taxRate = Number(l.taxRate) || 0;
    return subtotal * (taxRate / 100);
  };

  // Overall totals
  const totalSubtotal = lines.reduce((sum, l) => sum + getLineSubtotal(l), 0);
  const totalItbis = lines.reduce((sum, l) => sum + getLineItbis(l), 0);
  const grandTotal = totalSubtotal + totalItbis;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Detalle de Ítems / Servicios
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLine}
          className="text-xs h-8 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar Línea
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/70 border-b text-muted-foreground font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-3 w-1/3">Catálogo / Descripción</th>
                <th className="py-2.5 px-2 text-center w-16">Cant.</th>
                <th className="py-2.5 px-2 text-right w-24">P. Unitario</th>
                <th className="py-2.5 px-2 text-center w-16">Desc %</th>
                <th className="py-2.5 px-2 text-center w-20">ITBIS %</th>
                <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                <th className="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line, idx) => {
                const lineSub = getLineSubtotal(line);
                const lineItbis = getLineItbis(line);
                const lineTot = lineSub + lineItbis;

                return (
                  <tr key={line.id} className="hover:bg-muted/50">
                    <td className="p-2 space-y-1">
                      {products && products.length > 0 && (
                        <select
                          value={line.productId || ''}
                          onChange={(e) => handleLineChange(line.id, 'productId', e.target.value)}
                          className="w-full text-[11px] h-7 rounded border border-input bg-background text-foreground px-1.5 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Seleccionar del Catálogo (Opcional) --</option>
                          {products.filter(p => p.isActive).map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.name} - {formatCurrency(Number(p.price))}
                            </option>
                          ))}
                        </select>
                      )}
                      <Input
                        value={line.description}
                        onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                        placeholder="Descripción o servicio realizado..."
                        className="h-7 text-xs font-medium"
                      />
                    </td>
                    <td className="p-2 text-center align-top pt-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity || ''}
                        onChange={(e) => handleLineChange(line.id, 'quantity', Number(e.target.value))}
                        className="h-7 text-xs text-center font-mono"
                      />
                    </td>
                    <td className="p-2 text-right align-top pt-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice || ''}
                        onChange={(e) => handleLineChange(line.id, 'unitPrice', Number(e.target.value))}
                        className="h-7 text-xs text-right font-mono"
                      />
                    </td>
                    <td className="p-2 text-center align-top pt-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={line.discount || ''}
                        onChange={(e) => handleLineChange(line.id, 'discount', Number(e.target.value))}
                        className="h-7 text-xs text-center font-mono"
                      />
                    </td>
                    <td className="p-2 text-center align-top pt-2">
                      <select
                        value={line.taxRate}
                        onChange={(e) => handleLineChange(line.id, 'taxRate', Number(e.target.value))}
                        className="w-full text-xs h-7 rounded border border-input bg-background text-foreground px-1 text-center font-mono"
                      >
                        <option value={18}>18%</option>
                        <option value={16}>16%</option>
                        <option value={0}>0% (Exento)</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-mono align-top pt-3 font-semibold text-foreground">
                      {formatCurrency(lineTot)}
                    </td>
                    <td className="p-2 text-center align-top pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={lines.length === 1}
                        onClick={() => handleRemoveLine(line.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation summary footer */}
        <div className="bg-muted/40 p-3 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <div className="text-muted-foreground font-medium">
            {lines.length} {lines.length === 1 ? 'línea' : 'líneas'} en el detalle
          </div>
          <div className="flex gap-4 font-mono">
            <div>
              <span className="text-muted-foreground mr-1.5">Subtotal:</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalSubtotal)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1.5">ITBIS 18%:</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalItbis)}</span>
            </div>
            <div className="text-indigo-600 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              <span className="mr-1.5">Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
