"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "cashier" | null>(null);
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!role || !username || !code) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Login failed");
        return;
      }
      router.push(role === "admin" ? "/admin" : "/cashier");
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">R-ZYN POS System</h1>
            <p className="text-gray-500 mt-2">Select login type</p>
          </div>
          <div className="grid gap-3">
            <button
              onClick={() => setRole("admin")}
              className="w-full p-6 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="font-semibold text-lg">Login as Admin</div>
              <div className="text-sm text-gray-500">Full access to all features</div>
            </button>
            <button
              onClick={() => setRole("cashier")}
              className="w-full p-6 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="font-semibold text-lg">Login as Cashier</div>
              <div className="text-sm text-gray-500">POS and expense tracking</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <button
            onClick={() => { setRole(null); setUsername(""); setCode(""); }}
            className="text-green-600 hover:underline text-sm mb-2 inline-block"
          >
            ← Change login type
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === "admin" ? "Admin Login" : "Cashier Login"}
          </h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter username"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">6-Digit Code</label>
            <div className="relative">
              <input
                type={showCode ? "text" : "password"}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••"
                maxLength={6}
                inputMode="numeric"
                required
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? <span className="inline-block loader w-5 h-5" /> : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
