"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useProductCache } from "@/hooks/useProductCache";
import { useExpenses } from "@/app/_lib/query/queries/useExpenses";
import { useCreateExpense } from "@/app/_lib/query/mutations/useCreateExpense";
import { Spinner } from "@/app/_lib/query/Spinner";

const EXPENSE_TYPES = ["bill", "rent", "supplies", "delivery", "other"];

interface DeliveryItemRow {
  key: string;
  productId: string;
  variantId: string;
  quantity: number;
  variantName: string;
  costPrice: number;
  productName: string;
  isNew: boolean;
  productNameForNew: string;
  variantNameForNew: string;
  costPriceForNew: number;
  sellPriceForNew: number;
}

let itemCounter = 0;

function nextKey() {
  return `item-${++itemCounter}`;
}

const NAME_PLACEHOLDER: Record<string, string> = {
  bill: "e.g. January electricity bill",
  rent: "e.g. Shop rental - March",
  supplies: "e.g. Cleaning supplies",
  delivery: "e.g. Coca-Cola delivery from XYZ Supplier",
  other: "e.g. Miscellaneous expense",
};

export default function CashierExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { products } = useProductCache();
  const { status } = useOnlineStatus();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "bill",
    amount: "",
    note: "",
  });
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItemRow[]>([]);
  const [showNewVariant, setShowNewVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({
    productName: "",
    variantName: "",
    costPrice: "",
    sellPrice: "",
    quantity: "1",
  });

  const createExpense = useCreateExpense(
    () => {
      setShowAddModal(false);
      setShowConfirm(false);
    },
    () => setShowAddModal(true),
  );

  const productOptions = useMemo(() => {
    return products
      .filter((p) => p.variants && p.variants.length > 0)
      .map((p) => ({ value: p.id, label: p.name }));
  }, [products]);

  const variantsByProductId = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; costPrice: number; stock: number }>>();
    for (const p of products) {
      if (p.variants && p.variants.length > 0) {
        map.set(
          p.id,
          p.variants.map((v) => ({
            id: v.id,
            name: v.name,
            costPrice: v.costPrice ?? 0,
            stock: v.stock ?? 0,
          })),
        );
      }
    }
    return map;
  }, [products]);

  const deliveryTotal = useMemo(
    () => deliveryItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0),
    [deliveryItems],
  );

  useEffect(() => {
    if (form.type === "delivery") {
      setForm((f) => ({ ...f, amount: deliveryTotal.toFixed(2) }));
    }
  }, [deliveryTotal, form.type]);

  function openAdd() {
    setForm({ name: "", type: "bill", amount: "", note: "" });
    setDeliveryItems([]);
    setShowNewVariant(false);
    setNewVariant({ productName: "", variantName: "", costPrice: "", sellPrice: "", quantity: "1" });
    setShowAddModal(true);
  }

  function addDeliveryItem() {
    const firstProduct = productOptions[0];
    if (!firstProduct) return;
    const variants = variantsByProductId.get(firstProduct.value);
    if (!variants || variants.length === 0) return;
    const firstVariant = variants[0];

    setDeliveryItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        productId: firstProduct.value,
        variantId: firstVariant.id,
        quantity: 1,
        variantName: firstVariant.name,
        costPrice: firstVariant.costPrice,
        productName: firstProduct.label,
        isNew: false,
        productNameForNew: "",
        variantNameForNew: "",
        costPriceForNew: 0,
        sellPriceForNew: 0,
      },
    ]);
  }

  function updateProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const variants = variantsByProductId.get(productId);
    const firstVariant = variants && variants.length > 0 ? variants[0] : null;

    setDeliveryItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        return {
          ...item,
          productId,
          productName: product.name,
          variantId: firstVariant?.id ?? "",
          variantName: firstVariant?.name ?? "",
          costPrice: firstVariant?.costPrice ?? 0,
        };
      }),
    );
  }

  function updateVariant(key: string, variantId: string) {
    setDeliveryItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const variants = variantsByProductId.get(item.productId);
        const found = variants?.find((v) => v.id === variantId);
        if (!found) return item;
        return {
          ...item,
          variantId,
          variantName: found.name,
          costPrice: found.costPrice,
        };
      }),
    );
  }

  function updateQuantity(key: string, val: string) {
    setDeliveryItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        return { ...item, quantity: parseInt(val) || 0 };
      }),
    );
  }

  function removeDeliveryItem(key: string) {
    setDeliveryItems((prev) => prev.filter((item) => item.key !== key));
  }

  function addNewVariant() {
    const qty = parseInt(newVariant.quantity) || 0;
    if (!newVariant.productName.trim() || !newVariant.variantName.trim() || qty <= 0) return;

    const costPrice = parseFloat(newVariant.costPrice) || 0;
    const sellPrice = parseFloat(newVariant.sellPrice) || 0;

    setDeliveryItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        productId: "",
        variantId: "",
        quantity: qty,
        variantName: newVariant.variantName.trim(),
        costPrice,
        productName: newVariant.productName.trim(),
        isNew: true,
        productNameForNew: newVariant.productName.trim(),
        variantNameForNew: newVariant.variantName.trim(),
        costPriceForNew: costPrice,
        sellPriceForNew: sellPrice,
      },
    ]);

    setNewVariant({ productName: "", variantName: "", costPrice: "", sellPrice: "", quantity: "1" });
    setShowNewVariant(false);
  }

  function handleSave() {
    const payload = {
      name: form.name,
      type: form.type,
      amount: parseFloat(form.amount) || 0,
      note: form.note,
      deliveryItems:
        form.type === "delivery"
          ? deliveryItems.map((item) => ({
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              ...(item.isNew
                ? {
                    productName: item.productNameForNew,
                    variantName: item.variantNameForNew,
                    costPrice: item.costPriceForNew,
                    sellPrice: item.sellPriceForNew,
                  }
                : {}),
            }))
          : undefined,
    };
    createExpense.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

  return (
    <>
      <ConnectionBadge />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Today&apos;s Expenses</h2>
          <button onClick={openAdd} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No expenses today</div>
          ) : (
            expenses.map((e) => (
              <div key={e.id} className="flex items-start px-4 py-3 border-b last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{e.type}</span>
                    {e.name && <span className="text-sm text-gray-600">· {e.name}</span>}
                  </div>
                  {e.expenseDeliveries && e.expenseDeliveries.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {e.expenseDeliveries.map((ed, i) => (
                        <div key={i} className="text-xs text-gray-500">
                          {ed.variant.product.name} - {ed.variant.name} &times; {ed.quantityDelivered}
                        </div>
                      ))}
                    </div>
                  )}
                  {e.note && <div className="text-sm text-gray-500 mt-1">{e.note}</div>}
                  <div className="text-xs text-gray-400 mt-1">{e.cashier.username} &middot; {formatDateTime(e.createdAt)}</div>
                </div>
                <span className="font-bold text-red-600 ml-4 flex-shrink-0">{formatCurrency(e.amount)}</span>
              </div>
            ))
          )}
        </div>

        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Expense" maxWidth="max-w-3xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  setForm({ ...form, type: e.target.value });
                  if (e.target.value !== "delivery") {
                    setDeliveryItems([]);
                    setShowNewVariant(false);
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={NAME_PLACEHOLDER[form.type] ?? "e.g. Expense name"}
              />
            </div>

            {form.type === "delivery" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Delivery Items</label>
                  <span className="text-sm text-gray-500">{deliveryItems.length} item{deliveryItems.length !== 1 ? "s" : ""}</span>
                </div>

                {deliveryItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Variant</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Qty</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Cost</th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryItems.map((item) => (
                          <tr key={item.key} className={`border-b last:border-b-0 ${item.isNew ? "bg-blue-50" : ""}`}>
                            <td className="px-3 py-2">
                              {item.isNew ? (
                                <span>
                                  <span className="text-blue-700 italic">{item.productName}</span>
                                  <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">NEW</span>
                                </span>
                              ) : (
                                <SearchableSelect
                                  value={item.productId}
                                  onChange={(val) => updateProduct(item.key, val)}
                                  options={productOptions}
                                  placeholder="Search product..."
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {item.isNew ? (
                                <span className="text-blue-700 italic">{item.variantName}</span>
                              ) : (
                                <select
                                  value={item.variantId}
                                  onChange={(e) => updateVariant(item.key, e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                >
                                  {(variantsByProductId.get(item.productId) ?? []).map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.name} (stock: {v.stock})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.quantity || ""}
                                onChange={(e) => updateQuantity(item.key, e.target.value)}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                                min="1"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-500">{formatCurrency(item.costPrice)}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => removeDeliveryItem(item.key)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={addDeliveryItem}
                    className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                  <button
                    onClick={() => setShowNewVariant(!showNewVariant)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    New variant not listed?
                  </button>
                </div>

                {showNewVariant && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="text-sm font-medium text-gray-700">New Variant</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Product Name</label>
                        <input
                          type="text"
                          value={newVariant.productName}
                          onChange={(e) => setNewVariant({ ...newVariant, productName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="e.g. Coca-Cola"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Variant Name</label>
                        <input
                          type="text"
                          value={newVariant.variantName}
                          onChange={(e) => setNewVariant({ ...newVariant, variantName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="e.g. 330ml Can"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cost Price (₱)</label>
                        <input
                          type="number"
                          value={newVariant.costPrice}
                          onChange={(e) => setNewVariant({ ...newVariant, costPrice: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Sell Price (₱)</label>
                        <input
                          type="number"
                          value={newVariant.sellPrice}
                          onChange={(e) => setNewVariant({ ...newVariant, sellPrice: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={newVariant.quantity}
                          onChange={(e) => setNewVariant({ ...newVariant, quantity: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={addNewVariant}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Add to Delivery Items
                      </button>
                      <button
                        onClick={() => setShowNewVariant(false)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {deliveryItems.length > 0 && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                    <span className="text-sm font-medium text-gray-600">Total</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(deliveryTotal)}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Optional note"
              />
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={createExpense.isPending}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createExpense.isPending && <Spinner />}
              {status === "offline" ? "Queue Expense" : "Save Expense"}
            </button>
          </div>
        </Modal>

        <ConfirmModal
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSave}
          title={status === "offline" ? "Queue Offline Expense" : "Save Expense"}
          message={`Save ${form.type} expense for ${formatCurrency(parseFloat(form.amount) || 0)}? ${status === "offline" ? "This will sync automatically when you're back online." : ""}`}
          confirmLabel={status === "offline" ? "Queue" : "Save"}
        />
      </div>
    </>
  );
}
