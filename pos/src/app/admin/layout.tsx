import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" stockPermission={true} />
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
