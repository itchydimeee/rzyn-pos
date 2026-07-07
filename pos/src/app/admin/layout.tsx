import Sidebar from "@/components/Sidebar";
import SessionGuard from "@/components/SessionGuard";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await verifyToken();
  if (!user || user.role !== "admin") redirect("/");

  return (
    <div className="flex h-screen overflow-hidden">
      <SessionGuard expectedRole="admin" />
      <Sidebar role="admin" stockPermission={user.stockPermission} />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
    </div>
  );
}
