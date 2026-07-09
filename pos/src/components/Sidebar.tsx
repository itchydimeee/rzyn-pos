"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Package, ShoppingCart, Users, BarChart3, LayoutDashboard, DollarSign, Boxes, CreditCard } from "lucide-react";
import { toast } from "sonner";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/stocks", label: "Stocks", icon: Boxes },
  { href: "/admin/cashiers", label: "Cashiers", icon: Users },
  { href: "/admin/credits", label: "Credits", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const cashierLinks = [
  { href: "/cashier", label: "POS", icon: ShoppingCart },
  { href: "/cashier/expenses", label: "Expenses", icon: DollarSign },
];

export default function Sidebar({ role, stockPermission }: { role: string; stockPermission: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const links = role === "admin" ? adminLinks : cashierLinks;
  const cashierStockLink = { href: "/cashier/stocks", label: "Stocks", icon: Boxes };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/");
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col print:hidden">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-green-700">R-ZYN POS System</h1>
        <p className="text-xs text-gray-500 capitalize">{role}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </button>
          );
        })}

        {role === "cashier" && stockPermission && (
          <button
            onClick={() => router.push(cashierStockLink.href)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === cashierStockLink.href
                ? "bg-green-50 text-green-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <cashierStockLink.icon className="w-4 h-4" />
            {cashierStockLink.label}
          </button>
        )}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
