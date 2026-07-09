"use client";

import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, CreditCard } from "lucide-react";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { useProductCache } from "@/hooks/useProductCache";
import { useDashboard } from "@/app/_lib/query/queries/useDashboard";

export default function AdminDashboard() {
  const { data, isLoading, isError } = useDashboard();
  const { lastSync } = useProductCache();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;
  if (isError || !data) return <div className="text-center py-12 text-gray-500">Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <ConnectionBadge />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        {lastSync && (
          <span className="text-xs text-gray-400">Last updated: {new Date(lastSync).toLocaleString()}</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Today&apos;s Sales</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.todaySales)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Today&apos;s Profit</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.todayProfit)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Today&apos;s Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.todayExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-gray-500">Outstanding Credits</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.outstandingCredits)}</p>
          <p className="text-xs text-gray-400">{data.outstandingCreditsCount} credit{data.outstandingCreditsCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Sales (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.salesChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Top Sellers This Week</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{p.name} ({p.variantName})</span>
                  <span className="font-medium">{p.totalSold} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Low Stock Alerts
          </h3>
          {data.lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm">No low stock items</p>
          ) : (
            <div className="space-y-2">
              {data.lowStock.map((item) => (
                <div key={item.id} className="flex justify-between text-sm p-2 bg-red-50 rounded-lg">
                  <span>{item.productName} - {item.variantName}</span>
                  <span className="font-medium text-red-600">{item.stock} left (min: {item.threshold})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
