"use client";

import { useState, useRef } from "react";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Download, Upload } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatCurrency } from "@/lib/utils";
import { useAdminProducts, type Product, type Variant } from "@/app/_lib/query/queries/useAdminProducts";
import { useCreateProduct } from "@/app/_lib/query/mutations/useCreateProduct";
import { useUpdateProduct } from "@/app/_lib/query/mutations/useUpdateProduct";
import { useDeleteProduct } from "@/app/_lib/query/mutations/useDeleteProduct";
import { useBulkCreateProducts } from "@/app/_lib/query/mutations/useBulkCreateProducts";
import { Spinner } from "@/app/_lib/query/Spinner";

interface FormVariant {
  id?: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode: string;
  wholesalePrice: number | null;
  wholesaleThreshold: number | null;
}

const emptyForm = { name: "", category: "", variants: [{ name: "", sellPrice: 0, costPrice: 0, stock: 0, lowStockThreshold: 5, barcode: "", wholesalePrice: null as number | null, wholesaleThreshold: null as number | null }] };

export default function AdminProductsPage() {
  const { data: products = [], isLoading } = useAdminProducts();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProductRef, setEditingProductRef] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm);

  const createProduct = useCreateProduct(
    () => setShowModal(false),
    () => setShowModal(true),
  );

  const updateProduct = useUpdateProduct(
    () => setShowModal(false),
    () => setShowModal(true),
  );

  const deleteProduct = useDeleteProduct(
    () => setDeleteTarget(null),
  );

  const bulkCreate = useBulkCreateProducts();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setEditingProduct(null);
    setEditingProductRef(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setEditingProductRef(product);
    setForm({
      name: product.name,
      category: product.category,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sellPrice: v.sellPrice,
        costPrice: v.costPrice,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        barcode: v.barcode || "",
        wholesalePrice: v.wholesalePrice ?? null,
        wholesaleThreshold: v.wholesaleThreshold ?? null,
      })),
    });
    setShowModal(true);
  }

  function addVariant() {
    setForm({ ...form, variants: [...form.variants, { name: "", sellPrice: 0, costPrice: 0, stock: 0, lowStockThreshold: 5, barcode: "", wholesalePrice: null, wholesaleThreshold: null }] });
  }

  function updateVariant(idx: number, field: string, value: string | number | null) {
    const v = [...form.variants];
    (v[idx] as Record<string, unknown>)[field] = value;
    setForm({ ...form, variants: v });
  }

  function removeVariant(idx: number) {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) });
  }

  function handleSave() {
    if (editingProductRef) {
      updateProduct.mutate({ id: editingProductRef.id, data: form });
    } else {
      createProduct.mutate(form);
    }
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/admin/products/template");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-upload-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      bulkCreate.mutate(file);
    }
    if (e.target) e.target.value = "";
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            onClick={handleUploadClick}
            disabled={bulkCreate.isPending}
            className="flex items-center gap-2 border border-green-600 text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {bulkCreate.isPending ? <Spinner /> : <Upload className="w-4 h-4" />}
            Upload CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" /> Add Product
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No products yet</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="border-b last:border-b-0">
              <div className="flex items-center px-4 py-3 hover:bg-gray-50">
                <button onClick={() => {
                  const next = new Set(expanded);
                  next.has(product.id) ? next.delete(product.id) : next.add(product.id);
                  setExpanded(next);
                }} className="mr-2 text-gray-400">
                  {expanded.has(product.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 font-medium">{product.name}</div>
                {product.category && <div className="text-sm text-gray-500 mr-4">{product.category}</div>}
                <div className="flex gap-1">
                  <button onClick={() => openEdit(product)} className="p-1.5 text-gray-400 hover:text-green-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(product.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expanded.has(product.id) && (
                <div className="bg-gray-50 px-6 py-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 font-medium">Variant</th>
                        <th className="py-1 font-medium">Sell Price</th>
                        <th className="py-1 font-medium">Cost</th>
                        <th className="py-1 font-medium">Stock</th>
                        <th className="py-1 font-medium">Low Stock</th>
                        <th className="py-1 font-medium">Wholesale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v) => (
                        <tr key={v.id} className="border-t border-gray-200">
                          <td className="py-1">{v.name}</td>
                          <td className="py-1">{formatCurrency(v.sellPrice)}</td>
                          <td className="py-1">{formatCurrency(v.costPrice)}</td>
                          <td className="py-1">{v.stock}</td>
                          <td className="py-1">{v.lowStockThreshold}</td>
                          <td className="py-1">
                            {v.wholesalePrice != null && v.wholesaleThreshold != null
                              ? `${formatCurrency(v.wholesalePrice)} / ≥${v.wholesaleThreshold}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingProduct ? "Edit Product" : "Add Product"} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Variants</label>
              <button onClick={addVariant} className="text-sm text-green-600 hover:underline">+ Add Variant</button>
            </div>
            {form.variants.map((v, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg mb-2">
                <div className="grid grid-cols-6 gap-2 items-end mb-1">
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Name</label>
                    <input type="text" value={v.name} onChange={(e) => updateVariant(idx, "name", e.target.value)} className="w-full px-2 py-1 border rounded text-sm" placeholder="e.g. 500g" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Sell Price</label>
                    <input type="number" value={v.sellPrice || ""} onChange={(e) => updateVariant(idx, "sellPrice", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Cost</label>
                    <input type="number" value={v.costPrice || ""} onChange={(e) => updateVariant(idx, "costPrice", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Stock</label>
                    <input type="number" value={v.stock || ""} onChange={(e) => updateVariant(idx, "stock", parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Low Stock</label>
                    <input type="number" value={v.lowStockThreshold || ""} onChange={(e) => updateVariant(idx, "lowStockThreshold", parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="col-span-1 flex items-end h-full pb-1">
                    {form.variants.length > 1 && (
                      <button onClick={() => removeVariant(idx)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
                  <div>
                    <label className="text-xs text-gray-500">Wholesale Price</label>
                    <input type="number" value={v.wholesalePrice ?? ""} onChange={(e) => updateVariant(idx, "wholesalePrice", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Wholesale Min. Qty</label>
                    <input type="number" value={v.wholesaleThreshold ?? ""} onChange={(e) => updateVariant(idx, "wholesaleThreshold", e.target.value === "" ? null : parseInt(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" placeholder="Optional" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={createProduct.isPending || updateProduct.isPending}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(createProduct.isPending || updateProduct.isPending) && <Spinner />}
            Save Product
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            setDeleteTarget(null);
            deleteProduct.mutate(deleteTarget);
          }
        }}
        title="Delete Product"
        message="This will mark the product as inactive. Past sales records will still be accurate."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
