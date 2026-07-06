import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" stockPermission={true} />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
    </div>
  );
}
