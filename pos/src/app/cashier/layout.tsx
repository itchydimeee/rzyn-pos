import Sidebar from "@/components/Sidebar";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const user = await verifyToken();
  if (!user || user.role !== "cashier") redirect("/");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="cashier" stockPermission={user.stockPermission} />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
    </div>
  );
}
