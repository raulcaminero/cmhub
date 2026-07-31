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
import { Plus, Search, Package, Edit, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function CatalogView({ companyId }: { companyId: string }) {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Catálogo de Servicios y Productos
          </h2>
          <p className="text-xs text-muted-foreground">
            Administra los servicios o productos que facturas a tus clientes.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
          <Plus className="w-4 h-4" />
          Nuevo Servicio / Producto
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Cargando catálogo...</div>
          ) : !filteredProducts || filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No hay ítems registrados en el catálogo. Haz clic en "Nuevo Servicio / Producto" para crear uno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b uppercase text-[10px] text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombre / Descripción</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Precio Venta</th>
                    <th className="py-3 px-4 text-right">Costo (COGS)</th>
                    <th className="py-3 px-4 text-center">ITBIS %</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className={`hover:bg-slate-50/60 ${!prod.isActive ? 'opacity-60 bg-slate-50/40' : ''}`}>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{prod.code}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        {prod.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{prod.description}</div>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.type === 'SERVICE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {prod.type === 'SERVICE' ? 'SERVICIO' : prod.type === 'PRODUCT' ? 'PRODUCTO' : 'DIGITAL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        RD$ {Number(prod.price).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {prod.cost ? `RD$ ${Number(prod.cost).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">{prod.taxRate}%</td>
                      <td className="py-2.5 px-4 text-center">
                        {prod.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            <CheckCircle className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(prod)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive({ companyId, id: prod.id })}
                          className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-900"
                        >
                          {prod.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
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
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Editar Ítem del Catálogo' : 'Nuevo Servicio o Producto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Tipo *</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full h-9 rounded border border-input bg-background px-2 text-xs focus:outline-none"
                  >
                    <option value="SERVICE">Servicio</option>
                    <option value="PRODUCT">Producto Físico</option>
                    <option value="DIGITAL">Producto Digital</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Código Interno (Opcional)</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej: SRV-001 (Auto si está vacío)"
                    className="h-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nombre del Servicio / Producto *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Diseño de Logotipo Corporativo"
                  className="h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Descripción (Opcional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre lo que incluye este servicio..."
                  className="w-full h-16 rounded border border-input p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Precio de Venta (RD$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="h-9 font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Costo de Producción / COGS (RD$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost || ''}
                    onChange={(e) => setCost(Number(e.target.value))}
                    placeholder="Opcional"
                    className="h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Tasa ITBIS</Label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full h-9 rounded border border-input bg-background px-2 text-xs font-mono focus:outline-none"
                  >
                    <option value={18}>18% (Tasa general)</option>
                    <option value={16}>16% (Tasa reducida)</option>
                    <option value={0}>0% (Exento)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Unidad de Medida</Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ej: hora, mes, unidad"
                    className="h-9"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-red-600 font-semibold">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {isCreating || isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar Ítem'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
