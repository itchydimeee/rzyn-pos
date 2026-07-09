"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { useProductCache } from "@/hooks/useProductCache";
import { useReports } from "@/app/_lib/query/queries/useReports";
import { Spinner } from "@/app/_lib/query/Spinner";

export default function AdminReportsPage() {
  const [filter, setFilter] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading } = useReports(filter, date, enabled);
  const { lastSync } = useProductCache();

  function loadReport() {
    setEnabled(true);
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams({ filter, date, export: "true" });
      const res = await fetch("/api/admin/reports/export?" + params);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-report-${filter}-${date || "now"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="space-y-6">
      <ConnectionBadge />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-gray-400">
              Last updated: {new Date(lastSync).toLocaleString()}
            </span>
          )}
          <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setEnabled(false); }} className="px-3 py-2 border rounded-lg text-sm">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {filter === "daily" && (
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setEnabled(false); }} className="px-3 py-2 border rounded-lg text-sm" />
        )}
        <button onClick={loadReport} disabled={isLoading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          {isLoading && <Spinner />} Generate
        </button>
      </div>

      {isLoading && <div className="flex items-center justify-center h-32"><div className="loader" /></div>}

      {data && (
        <div className="grid gap-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(data.totalSales)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(data.totalProfit)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(data.totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-xl font-bold">{data.transactionCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-3">Expense Breakdown</h3>
              {Object.entries(data.expenseByType).length === 0 ? (
                <p className="text-gray-400 text-sm">No expenses</p>
              ) : (
                Object.entries(data.expenseByType).map(([type, amount]) => (
                  <div key={type} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                    <span className="capitalize">{type}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-3">Payment Breakdown</h3>
              <div className="flex justify-between text-sm py-1 border-b">
                <span>Cash</span>
                <span className="font-medium">{formatCurrency(data.cashSales)}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b">
                <span>GCash</span>
                <span className="font-medium">{formatCurrency(data.gcashSales)}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b">
                <span>Credit Sales</span>
                <span className="font-medium">{formatCurrency(data.creditSales)}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b">
                <span>Credit Resolved</span>
                <span className="font-medium text-green-600">{formatCurrency(data.creditResolved)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span>Outstanding Credits</span>
                <span className="font-medium text-amber-600">{formatCurrency(data.creditOutstanding)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="text-center text-gray-400 py-12">Select a filter and click Generate to view reports</div>
      )}
    </div>
  );
}
