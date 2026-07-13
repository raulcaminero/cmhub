'use client';

import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Invoice } from '@/services/invoices.api';
import { useAppSelector } from '@/store/hooks';

interface InvoicePrintDialogProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePrintDialog({ invoice, isOpen, onClose }: InvoicePrintDialogProps) {
  const company = useAppSelector((state) => state.company.active);

  if (!invoice || !isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = invoice.amount - invoice.itbis;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 animate-in fade-in duration-200 print:bg-white">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-lg shadow-2xl border relative my-8 print:p-0 print:border-none print:shadow-none print:my-0">
        
        {/* Header (hidden in print) */}
        <div className="flex justify-between items-center border-b pb-2 mb-4 print:hidden">
          <span className="font-semibold text-lg text-black">Vista de Impresión Fiscal</span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4 text-black" />
            </Button>
          </div>
        </div>

        {/* Invoice Layout */}
        <div id="invoice-print-area" className="space-y-6 pt-2 font-sans text-sm">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold uppercase tracking-wide text-black">{company?.name}</h2>
            <p className="text-xs text-gray-500">RNC: {company?.rnc}</p>
            {company?.address && <p className="text-xs text-gray-500">{company.address}</p>}
            {company?.phone && <p className="text-xs text-gray-500">Tel: {company.phone}</p>}
          </div>

          <hr className="border-gray-200" />

          {/* Tax Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3 border-gray-200">
            <div>
              <p className="text-gray-400 font-bold text-xxs tracking-wider">DOCUMENTO FISCAL</p>
              <p className="font-bold text-sm text-primary">{invoice.ncf}</p>
              <p className="text-gray-400 mt-2 font-bold text-xxs tracking-wider">TIPO DE COMPROBANTE</p>
              <p className="font-semibold text-gray-700">
                {invoice.ncfType === 'B01' ? 'FACTURA DE CRÉDITO FISCAL' : 'FACTURA DE CONSUMO'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-bold text-xxs tracking-wider">FECHA</p>
              <p className="font-medium text-gray-800">{new Date(invoice.date).toLocaleDateString()}</p>
              <p className="text-gray-400 mt-2 font-bold text-xxs tracking-wider">METODO DE PAGO</p>
              <p className="font-medium uppercase text-gray-800">
                {invoice.paymentMethod === '01' ? 'Efectivo' : invoice.paymentMethod === '02' ? 'Cheque/Transf.' : invoice.paymentMethod === '03' ? 'Tarjeta' : 'Crédito'}
              </p>
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-1 bg-gray-50 p-3 rounded border border-gray-100">
            <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider">Adquiriente / Cliente</p>
            <p className="font-bold text-sm text-gray-800">{invoice.clientName}</p>
            <p className="text-xs font-mono text-gray-600">RNC/Cédula: {invoice.clientRnc}</p>
          </div>

          {/* Detail Line */}
          <div className="space-y-2">
            <p className="text-xxs text-gray-400 font-bold uppercase border-b pb-1 border-gray-100">Concepto de Factura</p>
            <div className="flex justify-between items-center py-1">
              <div>
                <p className="font-semibold text-gray-800">Servicios de Consultoría / Venta Comercial</p>
                <p className="text-xs text-gray-400">Cantidad: 1</p>
              </div>
              <p className="font-mono font-medium text-gray-800">RD$ {subtotal.toFixed(2)}</p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Totals */}
          <div className="w-1/2 ml-auto space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal:</span>
              <span className="font-mono">RD$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>ITBIS (18%):</span>
              <span className="font-mono">RD$ {invoice.itbis.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-gray-900 border-gray-200">
              <span>Total:</span>
              <span className="font-mono">RD$ {invoice.amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-8 space-y-1 text-xxs text-gray-400">
            <p>Original Cliente</p>
            <p>Gracias por preferir nuestros servicios.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
