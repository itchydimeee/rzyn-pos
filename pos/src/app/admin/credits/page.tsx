"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { useCredits } from "@/app/_lib/query/queries/useCredits";
import { useResolveCredit } from "@/app/_lib/query/mutations/useResolveCredit";
import { Spinner } from "@/app/_lib/query/Spinner";
import type { CreditPaymentItem } from "@/app/_lib/query/queries/useCredits";

export default function AdminCreditsPage() {
  const [filter, setFilter] = useState<string>("pending");
  const [resolveId, setResolveId] = useState<string | null>(null);

  const statusParam = filter === "all" ? undefined : filter;
  const { data: credits = [], isLoading } = useCredits(statusParam);
  const resolve = useResolveCredit();

  const pendingTotal = credits
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.totalDue, 0);

  const creditToResolve = resolveId ? credits.find((c) => c.id === resolveId) : null;

  function handleResolve() {
    if (!resolveId) return;
    resolve.mutate(resolveId, { onSettled: () => setResolveId(null) });
  }

  return (
    <div className="space-y-6">
      <ConnectionBadge />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Credits</h2>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2">
        {(["pending", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filter === "pending" && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding Credits Total</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingTotal)}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="loader" /></div>
      ) : credits.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No credit payments found</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Age</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Interest</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Total Due</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {credits.map((credit) => (
                <CreditRow
                  key={credit.id}
                  credit={credit}
                  onResolve={() => setResolveId(credit.id)}
                  resolving={resolve.isPending && resolveId === credit.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!resolveId}
        onClose={() => setResolveId(null)}
        onConfirm={handleResolve}
        title="Resolve Credit Payment"
        message={
          creditToResolve
            ? `${creditToResolve.customer.name} — ${formatCurrency(creditToResolve.totalDue)}${creditToResolve.interest > 0 ? ` (includes ${formatCurrency(creditToResolve.interest)} interest)` : ""}. Mark as paid?`
            : ""
        }
        confirmLabel={resolve.isPending ? "Resolving..." : "Resolve"}
      />
    </div>
  );
}

function CreditRow({
  credit,
  onResolve,
  resolving,
}: {
  credit: CreditPaymentItem;
  onResolve: () => void;
  resolving: boolean;
}) {
  const isPending = credit.status === "pending";

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium">{credit.customer.name}</div>
        {credit.customer.phone && (
          <div className="text-xs text-gray-400">{credit.customer.phone}</div>
        )}
      </td>
      <td className="px-4 py-3">{formatCurrency(credit.amount)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {credit.daysSinceCreation > 7 ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Clock className="w-4 h-4 text-gray-400" />
          )}
          <span className={credit.daysSinceCreation > 7 ? "text-red-600 font-medium" : ""}>
            {credit.daysSinceCreation}d
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        {credit.interest > 0 ? (
          <span className="text-red-600 font-medium">{formatCurrency(credit.interest)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 font-semibold">
        <span className={isPending ? "text-amber-600" : "text-gray-400"}>
          {formatCurrency(credit.totalDue)}
        </span>
      </td>
      <td className="px-4 py-3">
        {isPending ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            Pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {isPending && (
          <button
            onClick={onResolve}
            disabled={resolving}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5 ml-auto"
          >
            {resolving && <Spinner />}
            Resolve
          </button>
        )}
        {!isPending && credit.resolvedBy && (
          <span className="text-xs text-gray-400">
            by {credit.resolvedBy}
          </span>
        )}
      </td>
    </tr>
  );
}
