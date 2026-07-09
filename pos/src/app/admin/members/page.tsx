"use client";

import { useState, useEffect } from "react";
import { Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { ConfirmModal } from "@/components/ConfirmModal";

import { PhoneInput } from "@/components/PhoneInput";

interface Member {
  id: string;
  name: string;
  phone: string;
  points: number;
  memberSince: string;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+63 ");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/members")
      .then((r) => r.json())
      .then((data) => { setMembers(data); setLoaded(true); });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPhone || newPhone.length < 14) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });
      if (!res.ok) { toast.error("Failed to create member"); return; }
      const data = await res.json();
      setMembers((prev) => [...prev, data]);
      setNewName("");
      setNewPhone("+63 ");
      toast.success("Member created");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/members/${deleteId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete member"); return; }
      setMembers((prev) => prev.filter((m) => m.id !== deleteId));
      setDeleteId(null);
      toast.success("Member removed");
    } finally {
      setDeleting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <ConnectionBadge />
        <div className="flex items-center justify-center h-64"><div className="loader" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConnectionBadge />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Members</h2>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 shadow-sm flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Member name"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Phone</label>
          <PhoneInput value={newPhone} onChange={setNewPhone} />
        </div>
        <button
          type="submit"
          disabled={!newName.trim() || !newPhone || newPhone.length < 14 || creating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Add Member
        </button>
      </form>

      {members.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No members yet</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Points</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Member Since</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">{m.phone}</td>
                  <td className="px-4 py-3">{m.points}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(m.memberSince).toLocaleDateString("en-PH")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Member"
        message="Remove this member? Their credit payment history will remain."
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
