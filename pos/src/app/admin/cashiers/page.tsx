"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Key, ToggleLeft, ToggleRight, UserX } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Cashier {
  id: string;
  username: string;
  stockPermission: boolean;
  isActive: boolean;
}

export default function AdminCashiersPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", code: "" });
  const [resetTarget, setResetTarget] = useState<{ id: string; username: string } | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);

  function loadCashiers() {
    setLoading(true);
    fetch("/api/admin/cashiers")
      .then((r) => r.json())
      .then(setCashiers)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCashiers(); }, []);

  async function handleAdd() {
    const res = await fetch("/api/admin/cashiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to add");
      return;
    }
    toast.success("Cashier added");
    setShowAddModal(false);
    setAddForm({ username: "", code: "" });
    loadCashiers();
  }

  async function handleResetCode() {
    if (!resetTarget) return;
    if (resetCode.length !== 6) { toast.error("Code must be 6 digits"); return; }
    await fetch(`/api/admin/cashiers/${resetTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: resetCode }),
    });
    toast.success("Code reset for " + resetTarget.username);
    setResetTarget(null);
    setResetCode("");
  }

  async function togglePermission(cashier: Cashier) {
    await fetch(`/api/admin/cashiers/${cashier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockPermission: !cashier.stockPermission }),
    });
    toast.success("Stock permission updated");
    loadCashiers();
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/admin/cashiers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    toast.success("Cashier deactivated");
    loadCashiers();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cashiers</h2>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Cashier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        {cashiers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No cashiers yet</div>
        ) : (
          cashiers.map((c) => (
            <div key={c.id} className={`flex items-center px-4 py-3 border-b last:border-b-0 ${!c.isActive ? "opacity-50" : ""}`}>
              <div className="flex-1">
                <span className="font-medium">{c.username}</span>
                {!c.isActive && <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Inactive</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePermission(c)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    c.stockPermission ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.stockPermission ? "Stock: ON" : "Stock: OFF"}
                </button>
                <button
                  onClick={() => setResetTarget({ id: c.id, username: c.username })}
                  className="p-1.5 text-gray-400 hover:text-blue-600"
                  title="Reset code"
                >
                  <Key className="w-4 h-4" />
                </button>
                {c.isActive && (
                  <button
                    onClick={() => setDeactivateTarget(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                    title="Deactivate"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Cashier" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={addForm.username} onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">6-Digit Code</label>
            <input type="password" value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} maxLength={6} inputMode="numeric" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <button onClick={handleAdd} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700">Add Cashier</button>
        </div>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset Code" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Reset code for <strong>{resetTarget?.username}</strong></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New 6-Digit Code</label>
            <input type="password" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <button onClick={handleResetCode} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700">Reset Code</button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && handleDeactivate(deactivateTarget)}
        title="Deactivate Cashier"
        message="This cashier will no longer be able to log in."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
