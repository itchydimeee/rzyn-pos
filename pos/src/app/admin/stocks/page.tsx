"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Edit } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { formatDateTime } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useProductCache } from "@/hooks/useProductCache";
import { offlineDB } from "@/lib/db";

interface StockLog {
  id: string;
  changeAmount: number;
  reason: string;
  createdAt: string;
  user: { username: string };
  variant: { name: string; product: { name: string } };
}

export default function AdminStocksPage() {
  const { products: cached, loading: cacheLoading, lastSync } = useProductCache();
  const { status, refreshPending } = useOnlineStatus();
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ changeAmount: 0, reason: "" });

  const variants = cached.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      product: { name: p.name, category: p.category },
    }))
  );

  function loadLogs() {
    setLogsLoading(true);
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => setStockLogs(d.stockLogs || []))
      .catch(() => setStockLogs([]))
      .finally(() => setLogsLoading(false));
  }

  useEffect(() => { loadLogs(); }, []);

  function getEditTarget() {
    return variants.find((v) => v.id === editTarget) || null;
  }

  function openEdit(variantId: string) {
    setEditTarget(variantId);
    setEditForm({ changeAmount: 0, reason: "" });
  }

  async function handleSave() {
    if (!editTarget) return;
    if (editForm.changeAmount === 0) {
      toast.error("Change amount cannot be 0");
      return;
    }

    const payload = {
      variantId: editTarget,
      changeAmount: editForm.changeAmount,
      reason: editForm.reason,
    };

    const doServer = async () => {
      const res = await fetch("/api/stocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update");
    };

    if (status === "offline") {
      await offlineDB.pendingActions.add({
        type: "stockEdit",
        payload,
        createdAt: Date.now(),
      });
      await refreshPending();
      toast.success(`Stock queued: ${editForm.changeAmount > 0 ? "+" : ""}${editForm.changeAmount}`);
      setEditTarget(null);
      return;
    }

    try {
      await doServer();
      toast.success(`Stock updated: ${editForm.changeAmount > 0 ? "+" : ""}${editForm.changeAmount}`);
    } catch {
      await offlineDB.pendingActions.add({
        type: "stockEdit",
        payload,
        createdAt: Date.now(),
      });
      await refreshPending();
      toast.success(`Stock queued: ${editForm.changeAmount > 0 ? "+" : ""}${editForm.changeAmount}`);
    }
    setEditTarget(null);
    loadLogs();
  }

  if (cacheLoading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

  const target = editTarget ? getEditTarget() : null;

  return (
    <>
      <ConnectionBadge />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Stocks</h2>
          {lastSync && (
            <span className="text-xs text-gray-400">
              Last synced: {new Date(lastSync).toLocaleString()}
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b font-medium text-gray-700">Current Stock</div>
          {variants.map((v) => (
            <div key={v.id} className={`flex items-center px-4 py-2.5 border-b last:border-b-0 ${v.stock <= v.lowStockThreshold ? "bg-red-50" : ""}`}>
              <div className="flex-1">
                <span className="font-medium text-sm">{v.product.name}</span>
                <span className="text-gray-500 text-sm ml-2">({v.name})</span>
                {v.product.category && <span className="text-gray-400 text-xs ml-2">{v.product.category}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold text-sm ${v.stock <= v.lowStockThreshold ? "text-red-600" : "text-gray-900"}`}>
                  {v.stock}
                </span>
                <button onClick={() => openEdit(v.id)} className="p-1 text-gray-400 hover:text-green-600">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b font-medium text-gray-700">Stock Change History</div>
          {logsLoading ? (
            <div className="p-4 flex justify-center"><div className="loader" /></div>
          ) : stockLogs.length === 0 ? (
            <div className="p-4 text-gray-400 text-sm">No changes yet</div>
          ) : (
            stockLogs.map((log) => (
              <div key={log.id} className="flex items-center px-4 py-2 border-b last:border-b-0 text-sm">
                <div className="flex-1">
                  <span className="font-medium">{log.variant.product.name} - {log.variant.name}</span>
                  <span className="text-gray-500 ml-2">by {log.user.username}</span>
                  {log.reason && <span className="text-gray-400 ml-2">({log.reason})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={log.changeAmount > 0 ? "text-green-600" : "text-red-600"}>
                    {log.changeAmount > 0 ? "+" : ""}{log.changeAmount}
                  </span>
                  <span className="text-gray-400 text-xs">{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Stock" maxWidth="max-w-sm">
          {target && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {target.product.name} - {target.name} (Current: {target.stock})
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Adjustment</label>
                <input
                  type="number"
                  value={editForm.changeAmount || ""}
                  onChange={(e) => setEditForm({ ...editForm, changeAmount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. +10 or -5"
                />
                <p className="text-xs text-gray-400 mt-1">Positive = add stock, Negative = remove stock</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. damaged, miscount"
                />
              </div>
              <button onClick={handleSave} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700">
                {status === "offline" ? "Queue" : "Save"} Changes
              </button>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
