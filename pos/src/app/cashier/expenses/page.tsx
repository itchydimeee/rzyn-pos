"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useProductCache } from "@/hooks/useProductCache";
import { offlineDB } from "@/lib/db";

interface Expense {
  id: string;
  type: string;
  amount: number;
  note: string;
  createdAt: string;
  cashier: { username: string };
  expenseDelivery?: {
    quantityDelivered: number;
    variant: { name: string; product: { name: string } };
  } | null;
}

const EXPENSE_TYPES = ["bill", "rent", "supplies", "delivery", "other"];

export default function CashierExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { products } = useProductCache();
  const { status, refreshPending } = useOnlineStatus();
  const [form, setForm] = useState({
    type: "bill",
    amount: "",
    note: "",
    deliveryVariantId: "",
    deliveryQuantity: "",
  });

  function load() {
    setLoading(true);
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data) => setExpenses(Array.isArray(data) ? data : []))
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const productOptions = products.filter((x) => x.variants.length > 0);

  function openAdd() {
    setForm({ type: "bill", amount: "", note: "", deliveryVariantId: "", deliveryQuantity: "" });
    setShowAddModal(true);
  }

  async function handleSave() {
    const payload = {
      type: form.type,
      amount: parseFloat(form.amount) || 0,
      note: form.note,
      deliveryVariantId: form.type === "delivery" ? form.deliveryVariantId : undefined,
      deliveryQuantity: form.type === "delivery" ? (parseInt(form.deliveryQuantity) || 0) : undefined,
    };

    const doServer = async () => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
    };

    if (status === "offline") {
      await offlineDB.pendingActions.add({
        type: "expense",
        payload,
        createdAt: Date.now(),
      });
      await refreshPending();
      toast.success("Expense queued — will sync when online");
      setShowAddModal(false);
      setShowConfirm(false);
      return;
    }

    try {
      await doServer();
      toast.success("Expense saved");
    } catch {
      await offlineDB.pendingActions.add({
        type: "expense",
        payload,
        createdAt: Date.now(),
      });
      await refreshPending();
      toast.success("Expense queued — will sync when online");
    }

    setShowAddModal(false);
    setShowConfirm(false);
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

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
              <div key={e.id} className="flex items-center px-4 py-3 border-b last:border-b-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{e.type}</span>
                    {e.expenseDelivery && (
                      <span className="text-xs text-gray-500">
                        ({e.expenseDelivery.variant.product.name} - {e.expenseDelivery.variant.name} × {e.expenseDelivery.quantityDelivered})
                      </span>
                    )}
                  </div>
                  {e.note && <div className="text-sm text-gray-500">{e.note}</div>}
                  <div className="text-xs text-gray-400">{e.cashier.username} · {formatDateTime(e.createdAt)}</div>
                </div>
                <span className="font-bold text-red-600">{formatCurrency(e.amount)}</span>
              </div>
            ))
          )}
        </div>

        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Expense" maxWidth="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>

            {form.type === "delivery" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select
                    value={form.deliveryVariantId}
                    onChange={(e) => setForm({ ...form, deliveryVariantId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select variant</option>
                    {productOptions.map((p) => (
                      <optgroup key={p.id} label={p.name}>
                        {p.variants.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Delivered</label>
                  <input
                    type="number"
                    value={form.deliveryQuantity}
                    onChange={(e) => setForm({ ...form, deliveryQuantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
              </>
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
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700"
            >
              {status === "offline" ? "Queue Expense" : "Save Expense"}
            </button>
          </div>
        </Modal>

        <ConfirmModal
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSave}
          title={status === "offline" ? "Queue Offline Expense" : "Save Expense"}
          message={`Save ₱${form.amount} ${form.type} expense? ${status === "offline" ? "This will sync automatically when you're back online." : ""}`}
          confirmLabel={status === "offline" ? "Queue" : "Save"}
        />
      </div>
    </>
  );
}
