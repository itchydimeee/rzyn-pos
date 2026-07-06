"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Key, UserCheck, UserX, Eye, EyeOff, Shield, ShieldOff } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Cashier {
  id: string;
  username: string;
  code: string;
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
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "reactivate";
    id: string;
    username: string;
  } | null>(null);

  function toggleCodeVisibility(id: string) {
    setVisibleCodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
    loadCashiers();
  }

  async function togglePermission(cashier: Cashier) {
    await fetch(`/api/admin/cashiers/${cashier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockPermission: !cashier.stockPermission }),
    });
    toast.success(`Stock permission ${cashier.stockPermission ? "disabled" : "enabled"} for ${cashier.username}`);
    loadCashiers();
  }

  async function toggleActive(cashier: Cashier) {
    await fetch(`/api/admin/cashiers/${cashier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cashier.isActive }),
    });
    toast.success(
      cashier.isActive
        ? `${cashier.username} has been deactivated`
        : `${cashier.username} has been reactivated`
    );
    loadCashiers();
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="loader" /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cashiers</h2>
          <p className="text-sm text-gray-500 mt-1">Manage cashier accounts and access</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Cashier
        </button>
      </div>

      {cashiers.length === 0 ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-dashed flex items-center justify-center">
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No cashiers yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Cashier" to create one</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {cashiers.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow ${
                !c.isActive ? "border-amber-200 bg-amber-50/30" : ""
              }`}
            >
              <div className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-0 justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        c.isActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${!c.isActive ? "text-gray-400" : "text-gray-900"}`}>
                          {c.username}
                        </span>
                        {!c.isActive && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            c.stockPermission
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          Stock {c.stockPermission ? "On" : "Off"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2.5 py-1 rounded-md select-none tracking-widest">
                          {visibleCodes.has(c.id) ? c.code : "••••••"}
                        </span>
                        <button
                          onClick={() => toggleCodeVisibility(c.id)}
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title={visibleCodes.has(c.id) ? "Hide code" : "Show code"}
                        >
                          {visibleCodes.has(c.id) ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePermission(c)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                      title={c.stockPermission ? "Revoke stock permission" : "Grant stock permission"}
                    >
                      {c.stockPermission ? (
                        <ShieldOff className="w-3.5 h-3.5" />
                      ) : (
                        <Shield className="w-3.5 h-3.5" />
                      )}
                      {c.stockPermission ? "Revoke Stock" : "Allow Stock"}
                    </button>

                    <button
                      onClick={() => setResetTarget({ id: c.id, username: c.username })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                      title="Reset passcode"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Reset Code
                    </button>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    {c.isActive ? (
                      <button
                        onClick={() =>
                          setConfirmAction({ type: "deactivate", id: c.id, username: c.username })
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                        title="Deactivate cashier"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmAction({ type: "reactivate", id: c.id, username: c.username })
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors border border-transparent hover:border-green-200"
                        title="Reactivate cashier"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Cashier" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              value={addForm.username}
              onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g. juan_delacruz"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">6-Digit Passcode</label>
            <input
              type="password"
              value={addForm.code}
              onChange={(e) => setAddForm({ ...addForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              maxLength={6}
              inputMode="numeric"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg tracking-[0.3em] text-center font-mono"
              placeholder="000000"
            />
            <p className="text-xs text-gray-400 mt-1.5">Cashiers will use this to log in</p>
          </div>
          <div className="pt-1">
            <button
              onClick={handleAdd}
              disabled={!addForm.username || addForm.code.length !== 6}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Cashier
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset Passcode" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set a new passcode for <strong>{resetTarget?.username}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New 6-Digit Passcode</label>
            <input
              type="password"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg tracking-[0.3em] text-center font-mono"
              placeholder="000000"
              autoFocus
            />
          </div>
          <button
            onClick={handleResetCode}
            disabled={resetCode.length !== 6}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save New Passcode
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const cashier = cashiers.find((c) => c.id === confirmAction.id);
          if (cashier) toggleActive(cashier);
        }}
        title={
          confirmAction?.type === "deactivate"
            ? "Deactivate Cashier"
            : "Reactivate Cashier"
        }
        message={
          confirmAction?.type === "deactivate"
            ? `"${confirmAction?.username}" will no longer be able to log in. You can reactivate them later.`
            : `"${confirmAction?.username}" will be able to log in again.`
        }
        confirmLabel={
          confirmAction?.type === "deactivate" ? "Deactivate" : "Reactivate"
        }
        variant={confirmAction?.type === "deactivate" ? "danger" : "default"}
      />
    </div>
  );
}
