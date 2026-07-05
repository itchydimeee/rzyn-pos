"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatCurrency } from "@/lib/utils";

interface Variant {
  id?: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  variants: Variant[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", category: "", variants: [{ name: "", sellPrice: 0, costPrice: 0, stock: 0, lowStockThreshold: 5, barcode: "" }] });

  function loadProducts() {
    setLoading(true);
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadProducts(); }, []);

  function openAdd() {
    setEditingProduct(null);
    setForm({ name: "", category: "", variants: [{ name: "", sellPrice: 0, costPrice: 0, stock: 0, lowStockThreshold: 5, barcode: "" }] });
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
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
      })),
    });
    setShowModal(true);
  }

  function addVariant() {
    setForm({ ...form, variants: [...form.variants, { name: "", sellPrice: 0, costPrice: 0, stock: 0, lowStockThreshold: 5, barcode: "" }] });
  }

  function updateVariant(idx: number, field: string, value: string | number) {
    const v = [...form.variants];
    (v[idx] as Record<string, unknown>)[field] = value;
    setForm({ ...form, variants: v });
  }

  function removeVariant(idx: number) {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    const url = editingProduct
      ? `/api/admin/products/${editingProduct.id}`
      : "/api/admin/products";
    const method = editingProduct ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) { toast.error("Failed to save"); return; }

    toast.success(editingProduct ? "Product updated" : "Product added");
    setShowModal(false);
    loadProducts();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    toast.success("Product deleted");
    loadProducts();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Product
        </button>
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
              <div key={idx} className="grid grid-cols-6 gap-2 mb-2 items-end p-3 bg-gray-50 rounded-lg">
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
            ))}
          </div>
          <button onClick={handleSave} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700">Save Product</button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Product"
        message="This will mark the product as inactive. Past sales records will still be accurate."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
