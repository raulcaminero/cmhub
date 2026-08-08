'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useGetProductsQuery, 
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useToggleProductActiveMutation,
  Product 
} from '@/services/products.api';
import { Plus, Search, Package, Edit, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { useTranslation } from '@/lib/use-translation';
import { useCurrency } from '@/hooks/use-company';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Tooltip } from '@/components/ui/tooltip';

export default function CatalogView({ companyId }: { companyId: string }) {
  const { t } = useTranslation();
  const formatCurrency = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'SERVICE' | 'PRODUCT' | 'DIGITAL'>('SERVICE');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [unit, setUnit] = useState('unidad');
  const [formError, setFormError] = useState('');

  const { data: products, isLoading } = useGetProductsQuery({ companyId, includeInactive: true });
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [toggleActive] = useToggleProductActiveMutation();

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setCode('');
    setSku('');
    setName('');
    setDescription('');
    setType('SERVICE');
    setPrice(0);
    setCost(0);
    setTaxRate(18);
    setUnit('unidad');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setCode(prod.code);
    setSku(prod.sku || '');
    setName(prod.name);
    setDescription(prod.description || '');
    setType(prod.type);
    setPrice(Number(prod.price));
    setCost(prod.cost ? Number(prod.cost) : 0);
    setTaxRate(Number(prod.taxRate));
    setUnit(prod.unit);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('El nombre del producto/servicio es obligatorio.');
      return;
    }
    if (price < 0) {
      setFormError('El precio no puede ser negativo.');
      return;
    }

    setFormError('');
    try {
      if (editingProduct) {
        await updateProduct({
          companyId,
          id: editingProduct.id,
          body: {
            code,
            sku,
            name,
            description,
            type,
            price,
            cost: cost > 0 ? cost : undefined,
            taxRate,
            unit,
          },
        }).unwrap();
      } else {
        await createProduct({
          companyId,
          body: {
            code: code.trim() || undefined,
            sku: sku.trim() || undefined,
            name,
            description: description.trim() || undefined,
            type,
            price,
            cost: cost > 0 ? cost : undefined,
            taxRate,
            unit,
          },
        }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.data?.message || 'Error al guardar en el catálogo.');
    }
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[32px] gap-3">
        <p className="text-xs text-muted-foreground">
          {t('sales.catalogDesc')}
        </p>
        <Button onClick={handleOpenCreateModal} size="sm" className="h-8 text-xs gap-1.5 font-semibold shadow-2xs shrink-0">
          <Plus className="w-3.5 h-3.5" />
          {t('sales.newProduct')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('sales.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8 shadow-2xs font-medium"
            />
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">{t('common.loading')}</div>
            ) : !filteredProducts || filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-[11px] font-bold text-muted-foreground bg-muted/30">
                    <th className="py-2 px-3">{t('sales.code')}</th>
                    <th className="py-2 px-3">{t('sales.sku')}</th>
                    <th className="py-2 px-3">{t('sales.productName')}</th>
                    <th className="py-2 px-3">{t('sales.type')}</th>
                    <th className="py-2 px-3 text-right">{t('sales.price')}</th>
                    <th className="py-2 px-3 text-right">{t('sales.cost')}</th>
                    <th className="py-2 px-3">{t('common.status')}</th>
                    <th className="py-2 px-3 text-right">{t('sales.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className={`hover:bg-muted/40 transition-colors ${!prod.isActive ? 'opacity-60 bg-muted/20' : ''}`}>
                      <td className="py-2 px-3 font-mono font-bold text-[11px] text-foreground">{prod.code}</td>
                      <td className="py-2 px-3 text-[11px] text-muted-foreground">{prod.sku || '-'}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-[11px] text-foreground">{prod.name}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          prod.type === 'SERVICE' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' : 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                        }`}>
                          {prod.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[11px] text-foreground">
                        {formatCurrency(Number(prod.price))}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px] text-muted-foreground">
                        {prod.cost ? formatCurrency(Number(prod.cost)) : '-'}
                      </td>
                      <td className="py-2 px-3">
                        {prod.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                            <CheckCircle className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right space-x-1">
                        <Tooltip content="Editar producto o servicio" align="end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(prod)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive({ companyId, id: prod.id })}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          {prod.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-xl w-full max-w-lg shadow-2xl border relative overflow-hidden">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary shrink-0" />
              {editingProduct ? t('sales.editItem') : t('sales.newItem')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              {t('sales.itemSubtitle')}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Tipo *</Label>
                  <Select value={type} onValueChange={(val) => setType(val as any)}>
                    <SelectTrigger className="w-full h-9 text-xs font-medium">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICE" className="text-xs">Servicio</SelectItem>
                      <SelectItem value="PRODUCT" className="text-xs">Producto Físico</SelectItem>
                      <SelectItem value="DIGITAL" className="text-xs">Producto Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Código</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Descripción</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-16 rounded-md border border-input bg-background p-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Precio *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Costo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost || ''}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-destructive font-semibold mt-2">{formError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => setIsModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={isCreating || isUpdating} className="h-8 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('sales.saveItem')
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
